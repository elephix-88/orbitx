import asyncio
import threading
from collections.abc import Coroutine
from datetime import datetime
from typing import Any

from loguru import logger

from common.database.mongodb import get_mongodb
from common.model.execution import Status
from common.model.workflow import Node
from dagster import OpExecutionContext

EXECUTION_HISTORY_COLLECTION = "execution_history"

# ---------------------------------------------------------------------------
# Persistent event loop — reused across all async calls in a Dagster process.
# This prevents asyncio.run() from creating a new loop each time, which would
# cause get_mongodb() to detect a loop change and recreate the MongoDBClient.
# ---------------------------------------------------------------------------

_loop: asyncio.AbstractEventLoop | None = None
_loop_thread: threading.Thread | None = None


def _get_persistent_loop() -> asyncio.AbstractEventLoop:
    """Get or create a persistent event loop running in a background thread."""
    global _loop, _loop_thread

    if _loop is not None and _loop.is_running():
        return _loop

    _loop = asyncio.new_event_loop()

    def run_loop() -> None:
        asyncio.set_event_loop(_loop)
        _loop.run_forever()

    _loop_thread = threading.Thread(
        target=run_loop, daemon=True, name="mongodb-event-loop"
    )
    _loop_thread.start()

    return _loop


def run_async_persist(
    coroutine: Coroutine, description: str
) -> None:
    """Run an async persistence function on the persistent event loop.

    Uses a single long-lived event loop so that get_mongodb() always
    sees the same loop id and reuses the same MongoDBClient.
    Never raises — persistence failures must not crash Dagster ops.
    """
    try:
        loop = _get_persistent_loop()
        future = asyncio.run_coroutine_threadsafe(coroutine, loop)
        future.result(timeout=60)
    except Exception as error:
        logger.warning(f"Failed to {description}: {error}")


# ---------------------------------------------------------------------------
# Per-node persistence
# ---------------------------------------------------------------------------


async def persist_node_execution(
    execution_id: str,
    workflow_id: str,
    node_instance_id: int,
    node_id: str,
    row_count: int = 0,
    error_trace: str | None = None,
) -> None:
    """Persist per-node row count or error trace to MongoDB."""
    mongodb = get_mongodb()
    collection = mongodb.get_collection(
        EXECUTION_HISTORY_COLLECTION
    )

    step_key = str(node_instance_id)
    update_fields: dict[str, Any] = {
        "workflow_id": workflow_id,
        "node_id": node_id,
        f"steps.{step_key}.row_count": row_count,
    }

    if error_trace is not None:
        update_fields[f"steps.{step_key}.error_trace"] = (
            error_trace
        )

    await collection.update_one(
        {"execution_id": execution_id},
        {"$set": update_fields},
        upsert=True,
    )

    action = "error_trace" if error_trace else "row_count"
    logger.success(
        f"Persisted {action} for node {node_id} "
        f"(#{node_instance_id}) in execution "
        f"{execution_id} ({row_count} rows)"
    )


async def persist_node_status(
    execution_id: str,
    workflow_id: str,
    node_instance_id: int,
    node_id: str,
    node_type: str,
    status: str,
    start_time: float | None = None,
    end_time: float | None = None,
) -> None:
    """Persist per-node execution status to MongoDB."""
    mongodb = get_mongodb()
    collection = mongodb.get_collection(
        EXECUTION_HISTORY_COLLECTION
    )

    step_key = str(node_instance_id)
    update_fields: dict[str, Any] = {
        f"steps.{step_key}.status": status,
        f"steps.{step_key}.node_id": node_id,
        f"steps.{step_key}.node_type": node_type,
        f"steps.{step_key}.node_instance_id": str(
            node_instance_id
        ),
        "workflow_id": workflow_id,
    }

    if start_time is not None:
        update_fields[f"steps.{step_key}.start_time"] = (
            start_time
        )
    if end_time is not None:
        update_fields[f"steps.{step_key}.end_time"] = end_time

    await collection.update_one(
        {"execution_id": execution_id},
        {"$set": update_fields},
        upsert=True,
    )


# ---------------------------------------------------------------------------
# Execution-level persistence
# ---------------------------------------------------------------------------


async def set_execution_ttl(
    execution_id: str,
    ttl_expires_at: datetime,
) -> None:
    """Set the TTL expiry timestamp on an execution_history document."""
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


async def finalize_execution(
    execution_id: str,
    end_time: float,
) -> None:
    """Update node counts after each op completes. Only set terminal
    execution status when ALL nodes have finished.

    Called from Dagster per-op hooks (success/failure), so it fires
    after every single op — not once at the end of the run.
    """
    mongodb = get_mongodb()
    collection = mongodb.get_collection(
        EXECUTION_HISTORY_COLLECTION
    )

    document = await collection.find_one(
        {"execution_id": execution_id}
    )
    if not document:
        return

    start_time = document.get("start_time", end_time)
    total_nodes = document.get("total_nodes", 0)

    successful_nodes = 0
    failed_nodes = 0
    for step in document.get("steps", {}).values():
        step_status = step.get("status", "")
        if step_status == Status.SUCCESS:
            successful_nodes += 1
        elif step_status == Status.FAILED:
            failed_nodes += 1

    completed_nodes = successful_nodes + failed_nodes
    all_finished = total_nodes > 0 and completed_nodes >= total_nodes

    update_fields: dict[str, Any] = {
        "successful_nodes": successful_nodes,
        "failed_nodes": failed_nodes,
    }

    if all_finished:
        final_status = (
            Status.FAILED if failed_nodes > 0 else Status.SUCCESS
        )
        update_fields["status"] = final_status
        update_fields["end_time"] = end_time
        update_fields["duration"] = end_time - start_time

        logger.success(
            f"Finalized execution {execution_id}: "
            f"status={final_status}, "
            f"duration={end_time - start_time:.1f}s, "
            f"nodes={successful_nodes}ok/{failed_nodes}fail"
        )

    await collection.update_one(
        {"execution_id": execution_id},
        {"$set": update_fields},
    )


# ---------------------------------------------------------------------------
# Sync wrappers (used by Dagster ops and hooks)
# ---------------------------------------------------------------------------


def persist_output_sync(
    run_id: str,
    workflow_id: str,
    node_instance_id: int,
    node_id: str,
    row_count: int,
) -> None:
    """Persist successful row count from a Dagster op."""
    run_async_persist(
        persist_node_execution(
            execution_id=run_id,
            workflow_id=workflow_id,
            node_instance_id=node_instance_id,
            node_id=node_id,
            row_count=row_count,
        ),
        f"persist output for node {node_id} (#{node_instance_id})",
    )


def persist_error_sync(
    run_id: str,
    workflow_id: str,
    node_instance_id: int,
    node_id: str,
    error_trace: str,
) -> None:
    """Persist error trace from a failed Dagster op."""
    run_async_persist(
        persist_node_execution(
            execution_id=run_id,
            workflow_id=workflow_id,
            node_instance_id=node_instance_id,
            node_id=node_id,
            error_trace=error_trace,
        ),
        f"persist error for node {node_id} (#{node_instance_id})",
    )


def finalize_execution_sync(
    run_id: str,
    end_time: float,
) -> None:
    """Update node counts and finalize if all nodes done."""
    run_async_persist(
        finalize_execution(
            execution_id=run_id,
            end_time=end_time,
        ),
        f"finalize execution {run_id}",
    )


# ---------------------------------------------------------------------------
# Op-level helpers (eliminate repetitive calls in op files)
# ---------------------------------------------------------------------------


def notify_node_status(
    context: OpExecutionContext,
    node: Node,
    status: Status,
    **timestamp_kwargs: float,
) -> None:
    """Notify MongoDB of a node status change.

    Extracts run_id and workflow_id from the Dagster context automatically.
    Pass start_time or end_time as keyword arguments.
    """
    run_async_persist(
        persist_node_status(
            execution_id=context.run_id,
            workflow_id=context.run_tags.get(
                "workflow_id", ""
            ),
            node_instance_id=node.node_instance_id,
            node_id=node.node_id,
            node_type=node.node_type,
            status=status,
            **timestamp_kwargs,
        ),
        f"persist status={status} for node {node.node_id}",
    )


def persist_node_output(
    context: OpExecutionContext,
    node: Node,
    row_count: int,
) -> None:
    """Persist node row count. Extracts context automatically."""
    persist_output_sync(
        run_id=context.run_id,
        workflow_id=context.run_tags.get("workflow_id", ""),
        node_instance_id=node.node_instance_id,
        node_id=node.node_id,
        row_count=row_count,
    )


def persist_node_error(
    context: OpExecutionContext,
    node: Node,
    error_trace: str,
) -> None:
    """Persist node error trace. Extracts context automatically."""
    persist_error_sync(
        run_id=context.run_id,
        workflow_id=context.run_tags.get("workflow_id", ""),
        node_instance_id=node.node_instance_id,
        node_id=node.node_id,
        error_trace=error_trace,
    )
