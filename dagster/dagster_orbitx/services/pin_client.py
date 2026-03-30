import asyncio

import pandas as pd
from loguru import logger

from common.database.mongodb import close_mongodb, get_mongodb
from dagster_orbitx.ops.node_result import NodeResult

PINNED_DATA_COLLECTION = "pinned_node_data"


def fetch_pinned_data(workflow_id: str) -> dict[int, NodeResult]:
    """Fetch all pinned node data for a workflow from MongoDB.

    Returns a dict keyed by node_instance_id, each value being a NodeResult
    reconstructed from the pinned JSON data. Returns an empty dict if no
    pins exist or if the fetch fails.
    """

    async def query_pinned_nodes() -> list[dict]:
        mongodb = get_mongodb()
        collection = mongodb.get_collection(PINNED_DATA_COLLECTION)
        cursor = collection.find({"workflow_id": workflow_id})
        return await cursor.to_list(length=None)

    try:
        documents = asyncio.run(query_pinned_nodes())
    except Exception as error:
        logger.warning(
            f"Failed to fetch pinned data for workflow {workflow_id}: {error}"
        )
        return {}
    finally:
        close_mongodb()

    if not documents:
        return {}

    pinned_outputs: dict[int, NodeResult] = {}

    for document in documents:
        node_instance_id = document["node_instance_id"]
        data = document.get("data", [])
        dataframe = pd.DataFrame(data) if data else pd.DataFrame()

        pinned_outputs[node_instance_id] = NodeResult(data=dataframe)

    logger.info(
        f"Loaded {len(pinned_outputs)} pinned nodes for workflow {workflow_id}: "
        f"node_instance_ids={list(pinned_outputs.keys())}"
    )

    return pinned_outputs
