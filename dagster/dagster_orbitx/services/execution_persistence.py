import asyncio
from datetime import datetime
from typing import Any

from loguru import logger

from common.database.mongodb import close_mongodb, get_mongodb

EXECUTION_HISTORY_COLLECTION = "execution_history"


async def persist_node_execution(
    execution_id: str,
    workflow_id: str,
    node_instance_id: int,
    node_id: str,
    output_rows: list[dict[str, Any]] | None = None,
    error_trace: str | None = None,
) -> None:
    """Persist per-node execution output to the execution_history document.

    Updates the steps subdocument for the matching node_instance_id within
    the execution_history document identified by execution_id.

    This is called from each Dagster op after computing its result (success)
    or catching an exception (failure).
    """
    mongodb = get_mongodb()
    collection = mongodb.get_collection(
        EXECUTION_HISTORY_COLLECTION
    )

    step_key = str(node_instance_id)
    update_fields: dict[str, Any] = {}

    if output_rows is not None:
        update_fields[f"steps.{step_key}.output_rows"] = (
            output_rows
        )

    if error_trace is not None:
        update_fields[f"steps.{step_key}.error_trace"] = (
            error_trace
        )

    if not update_fields:
        return

    update_fields["workflow_id"] = workflow_id
    update_fields["node_id"] = node_id

    await collection.update_one(
        {"execution_id": execution_id},
        {"$set": update_fields},
        upsert=True,
    )

    action = "error_trace" if error_trace else "output_rows"
    row_count = len(output_rows) if output_rows else 0
    logger.success(
        f"Persisted {action} for node {node_id} "
        f"(#{node_instance_id}) in execution "
        f"{execution_id}"
        + (f" ({row_count} rows)" if output_rows else "")
    )


async def set_execution_ttl(
    execution_id: str,
    ttl_expires_at: datetime,
) -> None:
    """Set the TTL expiry timestamp on an execution_history document.

    Called by the workflow hook to schedule document cleanup.
    MongoDB TTL indexes require a Date-typed field, so ttl_expires_at
    must be a datetime — not a float.
    """
    mongodb = get_mongodb()
    collection = mongodb.get_collection(
        EXECUTION_HISTORY_COLLECTION
    )

    await collection.update_one(
        {"execution_id": execution_id},
        {"$set": {"ttl_expires_at": ttl_expires_at}},
        upsert=True,
    )

    logger.success(
        f"Set TTL on execution {execution_id}"
    )


def persist_output_sync(
    run_id: str,
    workflow_id: str,
    node_instance_id: int,
    node_id: str,
    output_rows: list[dict] | None,
) -> None:
    """Sync wrapper to persist successful output rows from a Dagster op.

    Catches all exceptions so that persistence failures never crash the op.
    """
    try:
        asyncio.run(
            persist_node_execution(
                execution_id=run_id,
                workflow_id=workflow_id,
                node_instance_id=node_instance_id,
                node_id=node_id,
                output_rows=output_rows,
            )
        )
    except Exception as error:
        logger.warning(
            f"Failed to persist output for node "
            f"{node_id} (#{node_instance_id}): {error}"
        )
    finally:
        close_mongodb()


def persist_error_sync(
    run_id: str,
    workflow_id: str,
    node_instance_id: int,
    node_id: str,
    error_trace: str,
) -> None:
    """Sync wrapper to persist error trace from a failed Dagster op.

    Catches all exceptions so that persistence failures never crash the op.
    """
    try:
        asyncio.run(
            persist_node_execution(
                execution_id=run_id,
                workflow_id=workflow_id,
                node_instance_id=node_instance_id,
                node_id=node_id,
                error_trace=error_trace,
            )
        )
    except Exception as error:
        logger.warning(
            f"Failed to persist error trace for node "
            f"{node_id} (#{node_instance_id}): {error}"
        )
    finally:
        close_mongodb()
