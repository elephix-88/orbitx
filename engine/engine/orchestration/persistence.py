from collections.abc import Coroutine
from datetime import datetime
from typing import Any

from loguru import logger

from common.database.mongodb import database, find_one
from common.model.execution import Status
from common.model.workflow import Node
from engine.utils.async_runner import run_async

EXECUTION_HISTORY_COLLECTION = "execution_history"


def run_async_persist(coroutine: Coroutine, description: str) -> None:
    """Never raises — persistence failures must not crash Prefect tasks."""
    try:
        run_async(coroutine, timeout=60)
    except Exception as error:
        logger.warning(f"Failed to {description}: {error}")


# ---------------------------------------------------------------------------
# Async MongoDB operations
# ---------------------------------------------------------------------------


async def persist_node_execution(
    execution_id: str,
    workflow_id: str,
    node_instance_id: int,
    node_id: str,
    row_count: int = 0,
    error_trace: str | None = None,
) -> None:
    collection = database[EXECUTION_HISTORY_COLLECTION]

    step_key = str(node_instance_id)
    update_fields: dict[str, Any] = {
        "workflow_id": workflow_id,
        "node_id": node_id,
        f"steps.{step_key}.row_count": row_count,
    }

    if error_trace is not None:
        update_fields[f"steps.{step_key}.error_trace"] = error_trace

    await database[EXECUTION_HISTORY_COLLECTION].update_one(
        {"execution_id": execution_id},
        {"$set": update_fields},
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
    collection = database[EXECUTION_HISTORY_COLLECTION]

    step_key = str(node_instance_id)
    update_fields: dict[str, Any] = {
        f"steps.{step_key}.status": status,
        f"steps.{step_key}.node_id": node_id,
        f"steps.{step_key}.node_type": node_type,
        f"steps.{step_key}.node_instance_id": str(node_instance_id),
        "workflow_id": workflow_id,
    }

    if start_time is not None:
        update_fields[f"steps.{step_key}.start_time"] = start_time
    if end_time is not None:
        update_fields[f"steps.{step_key}.end_time"] = end_time

    result = await collection.update_one(
        {"execution_id": execution_id},
        {"$set": update_fields},
    )

    logger.success(
        f"Persisted status={status} for node {node_id} "
        f"(#{node_instance_id}) in execution {execution_id} "
        f"(matched={result.matched_count}, "
        f"modified={result.modified_count})"
    )


async def set_execution_ttl(
    execution_id: str,
    ttl_expires_at: datetime,
) -> None:
    collection = database[EXECUTION_HISTORY_COLLECTION]

    await collection.update_one(
        {"execution_id": execution_id},
        {"$set": {"ttl_expires_at": ttl_expires_at}},
    )

    logger.success(f"Set TTL on execution {execution_id}")


async def finalize_execution(
    execution_id: str,
    end_time: float,
) -> None:
    """Count completed nodes and set terminal status.

    Always sets a terminal status (SUCCESS/FAILED) when called — this
    function runs from Prefect's on_completion/on_failure hooks, so the
    flow is already done. If step status persistence failed earlier,
    we must not leave the execution stuck in RUNNING forever.
    """
    document = await find_one(
        EXECUTION_HISTORY_COLLECTION, {"execution_id": execution_id}
    )
    if not document:
        logger.warning(
            f"Cannot finalize execution {execution_id}: "
            f"document not found"
        )
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

    update_fields: dict[str, Any] = {
        "successful_nodes": successful_nodes,
        "failed_nodes": failed_nodes,
        "end_time": end_time,
        "duration": end_time - start_time,
    }

    if failed_nodes > 0:
        update_fields["status"] = Status.FAILED
    elif total_nodes > 0 and completed_nodes >= total_nodes:
        update_fields["status"] = Status.SUCCESS
    else:
        update_fields["status"] = Status.FAILED
        logger.warning(
            f"Execution {execution_id} finalized as FAILED: "
            f"only {completed_nodes}/{total_nodes} node statuses "
            f"were persisted"
        )

    logger.success(
        f"Finalized execution {execution_id}: "
        f"status={update_fields['status']}, "
        f"duration={end_time - start_time:.1f}s, "
        f"nodes={successful_nodes}ok/{failed_nodes}fail"
        f"/{total_nodes}total"
    )

    await database[EXECUTION_HISTORY_COLLECTION].update_one(
        {"execution_id": execution_id},
        {"$set": update_fields},
    )


# ---------------------------------------------------------------------------
# Task-level helpers — called from tasks.py and hooks.py
# ---------------------------------------------------------------------------


def notify_node_status(
    execution_id: str,
    workflow_id: str,
    node: Node,
    status: Status,
    **timestamp_kwargs: float,
) -> None:
    run_async_persist(
        persist_node_status(
            execution_id=execution_id,
            workflow_id=workflow_id,
            node_instance_id=node.node_instance_id,
            node_id=node.node_id,
            node_type=node.node_type,
            status=status,
            **timestamp_kwargs,
        ),
        f"persist status={status} for node {node.node_id}",
    )


def persist_node_output(
    execution_id: str,
    workflow_id: str,
    node: Node,
    row_count: int,
) -> None:
    run_async_persist(
        persist_node_execution(
            execution_id=execution_id,
            workflow_id=workflow_id,
            node_instance_id=node.node_instance_id,
            node_id=node.node_id,
            row_count=row_count,
        ),
        f"persist output for node {node.node_id} (#{node.node_instance_id})",
    )


def persist_node_error(
    execution_id: str,
    workflow_id: str,
    node: Node,
    error_trace: str,
) -> None:
    run_async_persist(
        persist_node_execution(
            execution_id=execution_id,
            workflow_id=workflow_id,
            node_instance_id=node.node_instance_id,
            node_id=node.node_id,
            error_trace=error_trace,
        ),
        f"persist error for node {node.node_id} (#{node.node_instance_id})",
    )


def finalize_execution_sync(execution_id: str, end_time: float) -> None:
    run_async_persist(
        finalize_execution(execution_id=execution_id, end_time=end_time),
        f"finalize execution {execution_id}",
    )
