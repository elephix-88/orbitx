import pandas as pd
from loguru import logger

from common.database.mongodb import find_one
from common.model.workflow import Node, WorkflowData
from engine.services.single_node_executor import (
    SingleNodeResult,
    execute_single_node,
)
from server.configs.config import settings
from server.models.pin import ColumnInfo
from server.services.exceptions import WorkflowNotFoundError
from server.services.pin_service import get_all_pinned_data, pin_node


async def load_workflow_for_user(workflow_id: str, user_id: str) -> WorkflowData:
    """Load a workflow from MongoDB, verifying ownership.

    Raises WorkflowNotFoundError if the workflow does not exist or belongs to
    a different user.
    """
    workflow = await find_one(
        settings.workflow_collection,
        {"_id": workflow_id, "user_id": user_id},
        WorkflowData,
    )
    if workflow is None:
        raise WorkflowNotFoundError(workflow_id)
    return workflow


def find_node_by_instance_id(
    nodes: list[Node], node_instance_id: int
) -> Node | None:
    """Return the node with the given node_instance_id, or None."""
    for node in nodes:
        if node.node_instance_id == node_instance_id:
            return node
    return None


def find_upstream_node_ids(
    workflow: WorkflowData,
    node_instance_id: int,
) -> list[int]:
    """Return the node_instance_ids of all directly-connected upstream nodes."""
    return [
        connection.from_node
        for connection in workflow.connections
        if connection.to_node == node_instance_id
    ]


def reconstruct_dataframe_from_pin(data: list[dict]) -> pd.DataFrame:
    """Build a pandas DataFrame from a list of row dicts stored in a pin document."""
    return pd.DataFrame(data)


async def resolve_upstream_dataframe(
    workflow: WorkflowData,
    upstream_node_ids: list[int],
    pinned_map: dict[str, object],
) -> pd.DataFrame | None:
    """Produce a DataFrame representing the combined upstream data for a node.

    Resolution strategy per upstream node:
    - If the node is pinned, reconstruct a DataFrame from the cached rows.
    - If not pinned, execute the upstream node live via execute_single_node.

    For multi-input nodes the DataFrames are concatenated row-wise (V1
    best-effort — the transformer is responsible for meaningful merging).

    Returns None when there are no upstream nodes (i.e. the target is a source).
    """
    if not upstream_node_ids:
        return None

    frames: list[pd.DataFrame] = []

    for upstream_node_id in upstream_node_ids:
        node_key = str(upstream_node_id)
        upstream_node = find_node_by_instance_id(workflow.nodes, upstream_node_id)

        if upstream_node is None:
            logger.warning(
                "Upstream node %d referenced in connections but not found"
                " in workflow %s",
                upstream_node_id,
                workflow.id,
            )
            continue

        if node_key in pinned_map:
            logger.info(
                "Using pinned data for upstream node %d in workflow %s",
                upstream_node_id,
                workflow.id,
            )
            pinned_summary = pinned_map[node_key]
            frames.append(reconstruct_dataframe_from_pin(pinned_summary.data))
        else:
            logger.info(
                "No pin for upstream node %d — executing live in workflow %s",
                upstream_node_id,
                workflow.id,
            )
            live_result = await execute_single_node(upstream_node, upstream_data=None)
            if live_result.error_message:
                logger.error(
                    "Live execution of upstream node %d failed: %s",
                    upstream_node_id,
                    live_result.error_message,
                )
                frames.append(pd.DataFrame())
            else:
                frames.append(
                    reconstruct_dataframe_from_pin(live_result.data)
                )

    if not frames:
        return pd.DataFrame()

    return pd.concat(frames, ignore_index=True)


async def step_run_node(
    workflow_id: str,
    node_instance_id: int,
    auto_pin: bool,
    user_id: str,
) -> SingleNodeResult:
    """Execute a single workflow node and optionally pin the result.

    Steps:
    1. Load and ownership-verify the workflow.
    2. Find the target node by node_instance_id.
    3. Resolve upstream data: pinned first, live fallback.
    4. Call execute_single_node(target_node, upstream_data).
    5. If auto_pin and execution succeeded, persist the result via pin_node.

    Raises:
        WorkflowNotFoundError: if workflow does not exist or is not owned by user.
        ValueError: if node_instance_id does not exist in the workflow.
    """
    workflow = await load_workflow_for_user(workflow_id, user_id)

    target_node = find_node_by_instance_id(workflow.nodes, node_instance_id)
    if target_node is None:
        raise ValueError(
            f"Node {node_instance_id} not found in workflow {workflow_id}"
        )

    pinned_map_response = await get_all_pinned_data(workflow_id, user_id)
    pinned_map = pinned_map_response.pinned

    upstream_node_ids = find_upstream_node_ids(workflow, node_instance_id)
    upstream_dataframe = await resolve_upstream_dataframe(
        workflow, upstream_node_ids, pinned_map
    )

    logger.info(
        "Step-run node %d (%s) in workflow %s",
        node_instance_id,
        target_node.node_id,
        workflow_id,
    )

    result = await execute_single_node(target_node, upstream_data=upstream_dataframe)

    if auto_pin and result.error_message is None:
        logger.info(
            "auto_pin=True — pinning result for node %d in workflow %s",
            node_instance_id,
            workflow_id,
        )
        await pin_node(
            workflow_id=workflow_id,
            node_instance_id=node_instance_id,
            user_id=user_id,
            data=result.data,
            columns=[
                ColumnInfo(name=col.name, data_type=col.data_type)
                for col in result.columns
            ],
        )

    return result
