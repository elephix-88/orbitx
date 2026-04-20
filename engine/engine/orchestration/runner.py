import re
import sys
from collections import deque
from datetime import UTC, datetime

from loguru import logger
from prefect import flow

from common.database.mongodb import find_one
from common.model.workflow import Connection, Node, NodeType, WorkflowData
from common.model.workflow_rules import validate_workflow_structure
from engine.configs.config import settings
from engine.orchestration.hooks import on_flow_completion, on_flow_failure
from engine.orchestration.node_result import NodeResult
from engine.orchestration.tasks import (
    ROUTER_NODE_IDS,
    make_delivery_task,
    make_extractor_task,
    make_if_router_task,
    make_loader_task,
    make_switch_router_task,
    make_transformer_task,
)
from engine.utils.async_runner import run_async

# Force colorized output — Prefect subprocess pipes stdout so loguru
# disables colors by default (no TTY detected).
logger.remove()
logger.add(sys.stderr, colorize=True)


def sanitize_name(name: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9_]", "_", name)
    sanitized = re.sub(r"_+", "_", sanitized).strip("_").lower()
    return sanitized or "unnamed"


def build_task_name(node: Node, job_name: str) -> str:
    sanitized = sanitize_name(node.display_name or node.node_id)
    return f"{job_name}__{sanitized}_{node.node_instance_id}"


def topological_sort(
    nodes: list[Node], connections: list[Connection]
) -> list[Node]:
    incoming_count: dict[int, int] = {
        node.node_instance_id: 0 for node in nodes
    }
    outgoing: dict[int, list[int]] = {
        node.node_instance_id: [] for node in nodes
    }
    node_map: dict[int, Node] = {
        node.node_instance_id: node for node in nodes
    }

    for connection in connections:
        incoming_count[connection.to_node] += 1
        outgoing[connection.from_node].append(connection.to_node)

    queue = deque(
        node_instance_id
        for node_instance_id, count in incoming_count.items()
        if count == 0
    )
    sorted_nodes = []

    while queue:
        current = queue.popleft()
        sorted_nodes.append(node_map[current])
        for child in outgoing.get(current, []):
            incoming_count[child] -= 1
            if incoming_count[child] == 0:
                queue.append(child)

    if len(sorted_nodes) != len(nodes):
        cycle_ids = [
            node_instance_id
            for node_instance_id, count in incoming_count.items()
            if count > 0
        ]
        raise ValueError(
            f"Workflow graph contains a cycle. Stuck node instance IDs: {cycle_ids}"
        )

    return sorted_nodes


def build_incoming_edges(
    nodes: list[Node], connections: list[Connection]
) -> dict[int, list[int]]:
    incoming: dict[int, list[int]] = {
        node.node_instance_id: [] for node in nodes
    }
    for connection in connections:
        incoming[connection.to_node].append(connection.from_node)
    return incoming


def build_port_lookup(
    connections: list[Connection],
) -> dict[tuple[int, int], str | None]:
    lookup: dict[tuple[int, int], str | None] = {}
    for connection in connections:
        lookup[(connection.from_node, connection.to_node)] = connection.from_port
    return lookup


def resolve_parent_output(
    parent_id: int,
    child_id: int,
    results_by_instance_id: dict[int, NodeResult | dict[str, NodeResult]],
    router_instance_ids: set[int],
    port_lookup: dict[tuple[int, int], str | None],
) -> NodeResult | None:
    parent_output = results_by_instance_id.get(parent_id)
    if parent_output is None:
        return None

    if parent_id not in router_instance_ids:
        return parent_output

    from_port = port_lookup.get((parent_id, child_id))
    if from_port is None:
        raise ValueError(
            f"Connection from router node {parent_id} to node {child_id} "
            f"is missing from_port. Router connections must specify which output port to use."
        )

    result = parent_output.get(from_port)
    if result is None:
        logger.info(
            f"Router node {parent_id} produced no output on port '{from_port}' "
            f"— skipping downstream node {child_id}"
        )
    return result


def build_and_execute_workflow(
    workflow: WorkflowData,
    job_name: str,
    execution_id: str,
) -> None:
    validation = validate_workflow_structure(workflow.nodes, workflow.connections)
    if not validation.is_valid:
        error_messages = "; ".join(error.message for error in validation.errors)
        raise ValueError(f"Workflow '{job_name}' has invalid structure: {error_messages}")

    execution_datetime = datetime.now(UTC)

    incoming_edges = build_incoming_edges(workflow.nodes, workflow.connections)
    port_lookup = build_port_lookup(workflow.connections)
    sorted_nodes = topological_sort(workflow.nodes, workflow.connections)

    router_instance_ids: set[int] = set()
    results_by_instance_id: dict[int, NodeResult | dict[str, NodeResult]] = {}
    destination_outputs: list[NodeResult] = []

    for node in sorted_nodes:
        task_name = build_task_name(node, job_name)
        parent_ids = incoming_edges.get(node.node_instance_id, [])

        if node.node_type == NodeType.source.value:
            task_function = make_extractor_task(
                node, task_name, execution_id, workflow.id,
            )
            results_by_instance_id[node.node_instance_id] = task_function()

        elif node.node_type == NodeType.transforms.value:
            if node.node_id in ROUTER_NODE_IDS:
                router_instance_ids.add(node.node_instance_id)

                if parent_ids and parent_ids[0] in results_by_instance_id:
                    parent_output = resolve_parent_output(
                        parent_ids[0], node.node_instance_id,
                        results_by_instance_id, router_instance_ids, port_lookup,
                    )

                    if node.node_id == "if":
                        task_function = make_if_router_task(
                            node, task_name, execution_id, workflow.id,
                        )
                    elif node.node_id == "switch":
                        task_function = make_switch_router_task(
                            node, task_name, execution_id, workflow.id,
                        )

                    results_by_instance_id[node.node_instance_id] = task_function(
                        parent_output
                    )

            elif node.node_id == "join":
                kwargs = {
                    f"input_{i}": resolve_parent_output(
                        parent_id, node.node_instance_id,
                        results_by_instance_id, router_instance_ids, port_lookup,
                    )
                    for i, parent_id in enumerate(parent_ids)
                    if parent_id in results_by_instance_id
                }
                task_function = make_transformer_task(
                    node, task_name, execution_id, workflow.id,
                )
                results_by_instance_id[node.node_instance_id] = task_function(**kwargs)

            else:
                if parent_ids and parent_ids[0] in results_by_instance_id:
                    parent_output = resolve_parent_output(
                        parent_ids[0], node.node_instance_id,
                        results_by_instance_id, router_instance_ids, port_lookup,
                    )
                    task_function = make_transformer_task(
                        node, task_name, execution_id, workflow.id,
                    )
                    results_by_instance_id[node.node_instance_id] = task_function(
                        parent_output
                    )

        elif node.node_type == NodeType.destinations.value:
            if parent_ids and parent_ids[0] in results_by_instance_id:
                parent_output = resolve_parent_output(
                    parent_ids[0], node.node_instance_id,
                    results_by_instance_id, router_instance_ids, port_lookup,
                )
                task_function = make_loader_task(
                    node, task_name, execution_id, workflow.id, execution_datetime,
                )
                result = task_function(parent_output)
                results_by_instance_id[node.node_instance_id] = result
                destination_outputs.append(result)

    has_delivery = workflow.delivery and workflow.delivery.channels

    if has_delivery and destination_outputs:
        delivery_task_name = f"{job_name}__deliver_report"
        delivery_task_function = make_delivery_task(
            workflow.delivery, delivery_task_name,
            workflow.job_name, len(destination_outputs),
        )
        terminal_kwargs = {
            f"input_{i}": output
            for i, output in enumerate(destination_outputs)
        }
        delivery_task_function(**terminal_kwargs)

    logger.success(
        f"Workflow '{job_name}' execution completed "
        f"({len(results_by_instance_id)} nodes executed)"
    )

def load_workflow(workflow_id: str) -> WorkflowData:
    async def fetch() -> WorkflowData | None:
        return await find_one(settings.workflow_collection, workflow_id, WorkflowData)

    workflow = run_async(fetch())
    if workflow is None:
        raise ValueError(f"Workflow {workflow_id} not found in MongoDB")
    return workflow

@flow(
    name="orbitx-workflow",
    log_prints=True,
    persist_result=False,
    on_failure=[on_flow_failure],
    on_completion=[on_flow_completion],
)
def execute_workflow_flow(
    workflow_id: str,
    execution_id: str,
    user_id: str,
    run_type: str = "all",
    workflow_name: str = "",
    extra_tags: dict[str, str] | None = None,
) -> None:
    workflow = load_workflow(workflow_id)
    job_name = sanitize_name(workflow.job_name)

    logger.info(
        f"Starting workflow '{workflow.job_name}' "
        f"(id={workflow_id}, execution={execution_id})"
    )

    build_and_execute_workflow(
        workflow=workflow,
        job_name=job_name,
        execution_id=execution_id,
    )
