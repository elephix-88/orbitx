import networkx as nx
from pydantic import BaseModel

from common.model.workflow import Connection, IfNode, Node, NodeType, SwitchNode


class ConnectionValidationError(BaseModel):
    error_type: str
    message: str
    node_instance_ids: list[int] = []


class WorkflowValidationWarning(BaseModel):
    warning_type: str
    message: str
    node_instance_ids: list[int] = []


class WorkflowValidationResult(BaseModel):
    is_valid: bool
    errors: list[ConnectionValidationError]
    warnings: list[WorkflowValidationWarning] = []


def build_workflow_graph(
    nodes: list[Node], connections: list[Connection]
) -> nx.DiGraph:
    graph = nx.DiGraph()
    for node in nodes:
        graph.add_node(node.node_instance_id, node=node)
    for connection in connections:
        graph.add_edge(connection.from_node, connection.to_node)
    return graph


def validate_workflow_structure(
    nodes: list[Node], connections: list[Connection]
) -> WorkflowValidationResult:
    errors: list[ConnectionValidationError] = []
    warnings: list[WorkflowValidationWarning] = []
    node_ids = {node.node_instance_id for node in nodes}
    node_map: dict[int, Node] = {node.node_instance_id: node for node in nodes}

    # Check 1: Dangling references
    for connection in connections:
        if connection.from_node not in node_ids:
            errors.append(ConnectionValidationError(
                error_type="dangling_reference",
                message=(
                    f"Connection references unknown source node"
                    f" {connection.from_node}"
                ),
                node_instance_ids=[connection.from_node],
            ))
        if connection.to_node not in node_ids:
            errors.append(ConnectionValidationError(
                error_type="dangling_reference",
                message=(
                    f"Connection references unknown target node"
                    f" {connection.to_node}"
                ),
                node_instance_ids=[connection.to_node],
            ))
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 2: Self-connections
    for connection in connections:
        if connection.from_node == connection.to_node:
            errors.append(ConnectionValidationError(
                error_type="self_connection",
                message=(
                    f"Node {connection.from_node} cannot connect to itself"
                ),
                node_instance_ids=[connection.from_node],
            ))
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 3: Duplicate edges
    # For router nodes (IF/Switch), two connections from the same source to the same
    # target via different ports are valid (e.g., both "true" and "false" branches
    # going to the same destination node). The duplicate key therefore includes
    # from_port so that only truly identical (node, node, port) triples are rejected.
    seen_edges: set[tuple[int, int, str | None]] = set()
    for connection in connections:
        edge = (connection.from_node, connection.to_node, connection.from_port)
        if edge in seen_edges:
            port_suffix = (
                f" on port '{connection.from_port}'"
                if connection.from_port
                else ""
            )
            errors.append(ConnectionValidationError(
                error_type="duplicate_edge",
                message=(
                    f"Duplicate connection from node {connection.from_node}"
                    f" to node {connection.to_node}{port_suffix}"
                ),
                node_instance_ids=[connection.from_node, connection.to_node],
            ))
        seen_edges.add(edge)
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 4: Category compatibility
    for connection in connections:
        source_node = node_map[connection.from_node]
        target_node = node_map[connection.to_node]

        if (
            source_node.node_type == NodeType.destinations.value
            and not source_node.can_have_conditional_outputs
        ):
            errors.append(ConnectionValidationError(
                error_type="category_incompatible",
                message=(
                    f"Node {source_node.node_instance_id} (destination)"
                    f" cannot have outgoing connections"
                ),
                node_instance_ids=[
                    source_node.node_instance_id,
                    target_node.node_instance_id,
                ],
            ))
            continue

        if target_node.node_type not in source_node.allowed_target_categories:
            errors.append(ConnectionValidationError(
                error_type="category_incompatible",
                message=(
                    f"Node {source_node.node_instance_id}"
                    f" ({source_node.node_type}) cannot connect to"
                    f" node {target_node.node_instance_id}"
                    f" ({target_node.node_type})"
                ),
                node_instance_ids=[
                    source_node.node_instance_id,
                    target_node.node_instance_id,
                ],
            ))
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 5: Per-node max input constraints
    incoming_count: dict[int, int] = {node_id: 0 for node_id in node_ids}
    for connection in connections:
        incoming_count[connection.to_node] += 1

    for node in nodes:
        count = incoming_count[node.node_instance_id]
        if node.maximum_inputs is not None and count > node.maximum_inputs:
            errors.append(ConnectionValidationError(
                error_type="too_many_inputs",
                message=(
                    f"Node {node.node_instance_id} ({node.node_type})"
                    f" accepts at most {node.maximum_inputs} input(s)"
                    f" but has {count}"
                ),
                node_instance_ids=[node.node_instance_id],
            ))
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 6: Graph completeness
    # missing_source is a hard error — a workflow with no data source cannot run.
    # missing_destination is a warning — branching workflows may have alert-only
    # branches that do not terminate at a loader destination.
    has_source = any(
        node.node_type == NodeType.source.value for node in nodes
    )
    has_destination = any(
        node.node_type == NodeType.destinations.value for node in nodes
    )

    if not has_source:
        errors.append(ConnectionValidationError(
            error_type="missing_source",
            message="Workflow must have at least one source node",
        ))
    if not has_destination:
        warnings.append(WorkflowValidationWarning(
            warning_type="missing_destination",
            message=(
                "Workflow has no destination node — data will not be"
                " loaded anywhere"
            ),
        ))
    if errors:
        return WorkflowValidationResult(
            is_valid=False, errors=errors, warnings=warnings
        )

    # Check 7: Cycle detection using NetworkX
    graph = build_workflow_graph(nodes, connections)
    if not nx.is_directed_acyclic_graph(graph):
        cycle = nx.find_cycle(graph)
        cycle_node_ids = list({node_id for edge in cycle for node_id in edge})
        errors.append(ConnectionValidationError(
            error_type="cycle",
            message="Workflow graph contains a cycle",
            node_instance_ids=cycle_node_ids,
        ))
        return WorkflowValidationResult(
            is_valid=False, errors=errors, warnings=warnings
        )

    # Check 8: Port validation for router nodes (IF and Switch)
    # IF nodes must use "true" or "false" as from_port on every outgoing connection.
    # Switch nodes must use one of their defined case_ids or "default".
    for connection in connections:
        source_node = node_map[connection.from_node]

        if isinstance(source_node, IfNode):
            if connection.from_port is None:
                errors.append(ConnectionValidationError(
                    error_type="missing_port",
                    message=(
                        f"Connection from IF node"
                        f" {source_node.node_instance_id} to node"
                        f" {connection.to_node} must specify from_port"
                        f" ('true' or 'false')"
                    ),
                    node_instance_ids=[
                        source_node.node_instance_id,
                        connection.to_node,
                    ],
                ))
            elif connection.from_port not in ("true", "false"):
                errors.append(ConnectionValidationError(
                    error_type="invalid_port",
                    message=(
                        f"Connection from IF node"
                        f" {source_node.node_instance_id} has invalid"
                        f" from_port '{connection.from_port}' —"
                        f" must be 'true' or 'false'"
                    ),
                    node_instance_ids=[
                        source_node.node_instance_id,
                        connection.to_node,
                    ],
                ))

        elif isinstance(source_node, SwitchNode):
            valid_case_ids = (
                {case.case_id for case in source_node.parameters.cases}
                | {"default"}
            )

            if connection.from_port is None:
                errors.append(ConnectionValidationError(
                    error_type="missing_port",
                    message=(
                        f"Connection from Switch node"
                        f" {source_node.node_instance_id} to node"
                        f" {connection.to_node} must specify from_port"
                    ),
                    node_instance_ids=[
                        source_node.node_instance_id,
                        connection.to_node,
                    ],
                ))
            elif connection.from_port not in valid_case_ids:
                errors.append(ConnectionValidationError(
                    error_type="invalid_port",
                    message=(
                        f"Connection from Switch node"
                        f" {source_node.node_instance_id} has invalid"
                        f" from_port '{connection.from_port}' —"
                        f" must be one of: {sorted(valid_case_ids)}"
                    ),
                    node_instance_ids=[
                        source_node.node_instance_id,
                        connection.to_node,
                    ],
                ))

    if errors:
        return WorkflowValidationResult(
            is_valid=False, errors=errors, warnings=warnings
        )

    return WorkflowValidationResult(is_valid=True, errors=[], warnings=warnings)
