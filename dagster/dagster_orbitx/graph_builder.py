from dagster import JobDefinition, graph
from loguru import logger

from common.model.workflow import Connection, Node, NodeType, WorkflowData
from dagster_orbitx.jobs.workflow_executor import sanitize_dagster_name
from dagster_orbitx.ops.extractor_ops import make_extractor_op
from dagster_orbitx.ops.transformer_ops import make_transformer_op
from dagster_orbitx.ops.loader_ops import make_loader_op


def build_op_name(node: Node, job_name: str) -> str:
    sanitized = sanitize_dagster_name(node.display_name or node.node_id)
    return f"{job_name}__{sanitized}_{node.node_instance_id}"


def count_parents(node_instance_id: int, connections: list[Connection]) -> int:
    return sum(1 for connection in connections if connection.to_node == node_instance_id)


def topological_sort(nodes: list[Node], connections: list[Connection]) -> list[Node]:
    incoming_count: dict[int, int] = {node.node_instance_id: 0 for node in nodes}
    outgoing: dict[int, list[int]] = {node.node_instance_id: [] for node in nodes}
    node_map: dict[int, Node] = {node.node_instance_id: node for node in nodes}

    for connection in connections:
        incoming_count[connection.to_node] += 1
        outgoing[connection.from_node].append(connection.to_node)

    queue = [nid for nid, count in incoming_count.items() if count == 0]
    sorted_nodes = []

    while queue:
        current = queue.pop(0)
        sorted_nodes.append(node_map[current])
        for child in outgoing.get(current, []):
            incoming_count[child] -= 1
            if incoming_count[child] == 0:
                queue.append(child)

    return sorted_nodes


def build_workflow_job(workflow: WorkflowData, job_name: str) -> JobDefinition:
    incoming_edges: dict[int, list[int]] = {
        node.node_instance_id: [] for node in workflow.nodes
    }
    for connection in workflow.connections:
        incoming_edges[connection.to_node].append(connection.from_node)

    sorted_nodes = topological_sort(workflow.nodes, workflow.connections)

    op_by_instance_id: dict[int, object] = {}
    op_fns: dict[int, object] = {}

    for node in sorted_nodes:
        op_name = build_op_name(node, job_name)
        parent_count = count_parents(node.node_instance_id, workflow.connections)

        if node.node_type == NodeType.source.value:
            op_fns[node.node_instance_id] = make_extractor_op(node, op_name)
        elif node.node_type == NodeType.transforms.value:
            op_fns[node.node_instance_id] = make_transformer_op(node, op_name, parent_count)
        elif node.node_type == NodeType.destinations.value:
            op_fns[node.node_instance_id] = make_loader_op(node, op_name)

    @graph(name=job_name)
    def workflow_graph():
        for node in sorted_nodes:
            op_fn = op_fns.get(node.node_instance_id)
            if not op_fn:
                continue

            parent_ids = incoming_edges.get(node.node_instance_id, [])

            if node.node_type == NodeType.source.value:
                op_by_instance_id[node.node_instance_id] = op_fn()

            elif node.node_type == NodeType.transforms.value:
                if node.node_id == "join":
                    kwargs = {
                        f"input_{i}": op_by_instance_id[parent_id]
                        for i, parent_id in enumerate(parent_ids)
                        if parent_id in op_by_instance_id
                    }
                    op_by_instance_id[node.node_instance_id] = op_fn(**kwargs)
                else:
                    if parent_ids and parent_ids[0] in op_by_instance_id:
                        op_by_instance_id[node.node_instance_id] = op_fn(
                            op_by_instance_id[parent_ids[0]]
                        )

            elif node.node_type == NodeType.destinations.value:
                if parent_ids and parent_ids[0] in op_by_instance_id:
                    op_fn(op_by_instance_id[parent_ids[0]])

    return workflow_graph.to_job(
        description=f"OrbitX workflow: {workflow.job_name}",
        tags={
            "kind": "orbitx_workflow",
            "workflow_id": workflow.id,
            "user_id": workflow.user_id,
        },
    )
