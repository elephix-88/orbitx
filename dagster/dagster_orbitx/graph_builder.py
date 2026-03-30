from collections import deque

from common.model.workflow import Connection, Node, NodeType, WorkflowData
from common.model.workflow_rules import validate_workflow_structure
from dagster import JobDefinition, graph
from dagster_orbitx.hooks.execution_history import (
    on_workflow_failure,
    on_workflow_success,
)
from dagster_orbitx.jobs.workflow_executor import sanitize_dagster_name
from dagster_orbitx.ops.delivery_ops import make_delivery_op
from dagster_orbitx.ops.extractor_ops import make_extractor_op
from dagster_orbitx.ops.loader_ops import make_loader_op
from dagster_orbitx.ops.router_ops import (
    ROUTER_NODE_IDS,
    make_if_router_op,
    make_switch_router_op,
)
from dagster_orbitx.ops.transformer_ops import make_transformer_op


def build_op_name(node: Node, job_name: str) -> str:
    sanitized = sanitize_dagster_name(
        node.display_name or node.node_id
    )
    return f"{job_name}__{sanitized}_{node.node_instance_id}"


def count_parents(
    node_instance_id: int, connections: list[Connection]
) -> int:
    return sum(
        1
        for connection in connections
        if connection.to_node == node_instance_id
    )


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
        outgoing[connection.from_node].append(
            connection.to_node
        )

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
            "Workflow graph contains a cycle. "
            f"Stuck node instance IDs: {cycle_ids}"
        )

    return sorted_nodes


def build_incoming_edges(
    nodes: list[Node],
    connections: list[Connection],
) -> dict[int, list[int]]:
    """Build a map from node_instance_id to list of parent node_instance_ids."""
    incoming: dict[int, list[int]] = {
        node.node_instance_id: [] for node in nodes
    }
    for connection in connections:
        incoming[connection.to_node].append(
            connection.from_node
        )
    return incoming


def build_port_lookup(
    connections: list[Connection],
) -> dict[tuple[int, int], str | None]:
    """Build a lookup from (from_node, to_node) to from_port.

    For connections from router nodes (IF/Switch), from_port tells
    which named output the downstream node should consume.
    For standard connections, from_port is None.
    """
    lookup: dict[tuple[int, int], str | None] = {}
    for connection in connections:
        key = (connection.from_node, connection.to_node)
        lookup[key] = connection.from_port
    return lookup


def resolve_parent_output(
    parent_id: int,
    child_id: int,
    op_by_instance_id: dict[int, object],
    router_instance_ids: set[int],
    port_lookup: dict[tuple[int, int], str | None],
) -> object | None:
    """Resolve the correct Dagster output for a parent-child connection.

    For standard (single-output) parents, returns the parent's output directly.
    For router (multi-output) parents, returns the named output specified by
    the connection's from_port.
    """
    parent_output = op_by_instance_id.get(parent_id)
    if parent_output is None:
        return None

    if parent_id not in router_instance_ids:
        return parent_output

    # Router node — select named output via from_port
    from_port = port_lookup.get((parent_id, child_id))
    if from_port is None:
        raise ValueError(
            f"Connection from router node {parent_id} to "
            f"node {child_id} is missing from_port. "
            f"Router connections must specify which output "
            f"port to use."
        )

    return getattr(parent_output, from_port)


def build_workflow_job(
    workflow: WorkflowData, job_name: str
) -> JobDefinition:
    validation = validate_workflow_structure(
        workflow.nodes, workflow.connections
    )
    if not validation.is_valid:
        error_messages = "; ".join(
            error.message for error in validation.errors
        )
        raise ValueError(
            f"Workflow '{job_name}' has invalid structure: "
            f"{error_messages}"
        )

    incoming_edges = build_incoming_edges(
        workflow.nodes, workflow.connections
    )
    port_lookup = build_port_lookup(workflow.connections)

    sorted_nodes = topological_sort(
        workflow.nodes, workflow.connections
    )

    # Pin data is fetched at runtime inside each op, not at build time.
    # Build-time fetch causes "Event loop is closed" errors because
    # asyncio.run() cannot be called inside an already-consumed loop.
    pinned_outputs: dict = {}

    # Track which nodes are routers (multi-output)
    router_instance_ids: set[int] = set()

    op_functions: dict[int, object] = {}

    for node in sorted_nodes:
        op_name = build_op_name(node, job_name)
        parent_count = count_parents(
            node.node_instance_id, workflow.connections
        )
        pinned_result = pinned_outputs.get(
            node.node_instance_id
        )

        if node.node_type == NodeType.source.value:
            op_functions[node.node_instance_id] = (
                make_extractor_op(
                    node,
                    op_name,
                    pinned_result=pinned_result,
                )
            )

        elif node.node_type == NodeType.transforms.value:
            if node.node_id in ROUTER_NODE_IDS:
                router_instance_ids.add(
                    node.node_instance_id
                )
                if node.node_id == "if":
                    op_functions[node.node_instance_id] = (
                        make_if_router_op(
                            node,
                            op_name,
                            pinned_result=pinned_result,
                        )
                    )
                elif node.node_id == "switch":
                    op_functions[node.node_instance_id] = (
                        make_switch_router_op(
                            node,
                            op_name,
                            pinned_result=pinned_result,
                        )
                    )
            else:
                op_functions[node.node_instance_id] = (
                    make_transformer_op(
                        node,
                        op_name,
                        parent_count,
                        pinned_result=pinned_result,
                    )
                )

        elif node.node_type == NodeType.destinations.value:
            op_functions[node.node_instance_id] = (
                make_loader_op(
                    node,
                    op_name,
                    pinned_result=pinned_result,
                )
            )

    has_delivery = (
        workflow.delivery and workflow.delivery.channels
    )
    delivery_op_fn = None

    if has_delivery:
        destination_count = sum(
            1
            for node in sorted_nodes
            if node.node_type == NodeType.destinations.value
        )
        if destination_count > 0:
            delivery_op_name = f"{job_name}__deliver_report"
            delivery_op_fn = make_delivery_op(
                workflow.delivery,
                delivery_op_name,
                destination_count,
            )

    @graph(name=job_name)
    def workflow_graph():
        op_by_instance_id: dict[int, object] = {}
        destination_outputs: list[object] = []

        for node in sorted_nodes:
            op_fn = op_functions.get(node.node_instance_id)
            if not op_fn:
                continue

            parent_ids = incoming_edges.get(
                node.node_instance_id, []
            )

            if node.node_type == NodeType.source.value:
                op_by_instance_id[node.node_instance_id] = (
                    op_fn()
                )

            elif node.node_type == NodeType.transforms.value:
                if node.node_id == "join":
                    kwargs = {
                        f"input_{i}": resolve_parent_output(
                            parent_id,
                            node.node_instance_id,
                            op_by_instance_id,
                            router_instance_ids,
                            port_lookup,
                        )
                        for i, parent_id in enumerate(
                            parent_ids
                        )
                        if parent_id in op_by_instance_id
                    }
                    op_by_instance_id[
                        node.node_instance_id
                    ] = op_fn(**kwargs)

                elif node.node_id in ROUTER_NODE_IDS:
                    # Router nodes (IF/Switch): single input,
                    # multi-output result stored as-is.
                    if (
                        parent_ids
                        and parent_ids[0] in op_by_instance_id
                    ):
                        parent_output = (
                            resolve_parent_output(
                                parent_ids[0],
                                node.node_instance_id,
                                op_by_instance_id,
                                router_instance_ids,
                                port_lookup,
                            )
                        )
                        # Store the full multi-output result;
                        # downstream nodes will pick named
                        # outputs via resolve_parent_output.
                        op_by_instance_id[
                            node.node_instance_id
                        ] = op_fn(parent_output)

                else:
                    # Standard single-input transformer
                    if (
                        parent_ids
                        and parent_ids[0] in op_by_instance_id
                    ):
                        parent_output = (
                            resolve_parent_output(
                                parent_ids[0],
                                node.node_instance_id,
                                op_by_instance_id,
                                router_instance_ids,
                                port_lookup,
                            )
                        )
                        op_by_instance_id[
                            node.node_instance_id
                        ] = op_fn(parent_output)

            elif node.node_type == NodeType.destinations.value and (
                parent_ids
                and parent_ids[0] in op_by_instance_id
            ):
                parent_output = resolve_parent_output(
                    parent_ids[0],
                    node.node_instance_id,
                    op_by_instance_id,
                    router_instance_ids,
                    port_lookup,
                )
                result = op_fn(parent_output)
                op_by_instance_id[
                    node.node_instance_id
                ] = result
                destination_outputs.append(result)

        if destination_outputs:
            terminal_kwargs = {
                f"input_{i}": output
                for i, output in enumerate(
                    destination_outputs
                )
            }
            if delivery_op_fn:
                delivery_op_fn(**terminal_kwargs)

    tags = {
        "kind": "orbitx_workflow",
        "workflow_id": workflow.id,
        "user_id": workflow.user_id,
        "workflow_name": workflow.job_name,
    }

    return workflow_graph.to_job(
        description=f"OrbitX workflow: {workflow.job_name}",
        hooks={on_workflow_success, on_workflow_failure},
        tags=tags,
    )
