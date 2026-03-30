import time

from loguru import logger

from common.database import get_mongodb
from server.configs.config import settings
from server.models.pin import (
    ColumnInfo,
    PinnedDataMap,
    PinnedNodeSummary,
)

MAX_PINNED_ROWS = 1000


async def pin_node(
    workflow_id: str,
    node_instance_id: int,
    user_id: str,
    data: list[dict],
    columns: list[ColumnInfo],
) -> None:
    """Upsert pinned data for a node in a workflow.

    Truncates data to MAX_PINNED_ROWS rows on write.
    Raises ValueError if the workflow does not belong to the user.
    """
    collection = get_mongodb().get_collection(settings.pinned_data_collection)

    truncated_data = data[:MAX_PINNED_ROWS]
    if len(data) > MAX_PINNED_ROWS:
        logger.warning(
            "Pinned data for node %d in workflow %s truncated from %d to %d rows",
            node_instance_id,
            workflow_id,
            len(data),
            MAX_PINNED_ROWS,
        )

    document = {
        "workflow_id": workflow_id,
        "node_instance_id": node_instance_id,
        "user_id": user_id,
        "data": truncated_data,
        "columns": [column.model_dump() for column in columns],
        "pinned_at": time.time(),
    }

    await collection.update_one(
        {
            "workflow_id": workflow_id,
            "node_instance_id": node_instance_id,
            "user_id": user_id,
        },
        {"$set": document},
        upsert=True,
    )

    logger.info(
        "Pinned node %d for workflow %s (user %s, %d rows)",
        node_instance_id,
        workflow_id,
        user_id,
        len(truncated_data),
    )


async def unpin_node(
    workflow_id: str,
    node_instance_id: int,
    user_id: str,
) -> bool:
    """Remove pinned data for a node.

    Returns True if a document was deleted, False if no pin existed.
    """
    collection = get_mongodb().get_collection(settings.pinned_data_collection)

    result = await collection.delete_one(
        {
            "workflow_id": workflow_id,
            "node_instance_id": node_instance_id,
            "user_id": user_id,
        }
    )

    if result.deleted_count == 0:
        logger.info(
            "No pin found for node %d in workflow %s (user %s)",
            node_instance_id,
            workflow_id,
            user_id,
        )
        return False

    logger.info(
        "Unpinned node %d for workflow %s (user %s)",
        node_instance_id,
        workflow_id,
        user_id,
    )
    return True


async def get_all_pinned_data(workflow_id: str, user_id: str) -> PinnedDataMap:
    """Return all pinned nodes for a workflow as a map keyed by node_instance_id.

    Only returns pins owned by the given user.
    """
    collection = get_mongodb().get_collection(settings.pinned_data_collection)

    cursor = collection.find({"workflow_id": workflow_id, "user_id": user_id})
    documents = await cursor.to_list(length=None)

    pinned: dict[str, PinnedNodeSummary] = {}
    for document in documents:
        node_key = str(document["node_instance_id"])
        pinned[node_key] = PinnedNodeSummary(
            data=document["data"],
            columns=[ColumnInfo(**column) for column in document["columns"]],
            pinned_at=document["pinned_at"],
        )

    logger.info(
        "Retrieved %d pinned nodes for workflow %s (user %s)",
        len(pinned),
        workflow_id,
        user_id,
    )
    return PinnedDataMap(pinned=pinned)
