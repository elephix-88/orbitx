"""MongoDB Change Stream consumer for real-time workflow status updates."""

import asyncio
from typing import Any

from loguru import logger

from common.database.mongodb import get_mongodb
from common.model.execution import NodeStatusEvent, Status
from server.configs.config import settings
from server.consumer import sse_manager

_resume_token: dict | None = None
# Track broadcasted node states to detect changes
_broadcasted_states: dict[
    str, dict[str, str]
] = {}  # execution_id -> {node_instance_id -> status}


async def _watch_changes() -> None:
    """Watch execution_history collection for changes using motor async change streams."""
    global _resume_token, _broadcasted_states

    db = get_mongodb()
    collection = db.get_collection(settings.execution_history_collection)

    while True:
        try:
            pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
            options: dict[str, Any] = {"full_document": "updateLookup"}
            if _resume_token:
                options["resume_after"] = _resume_token

            async with collection.watch(pipeline, **options) as stream:
                async for change in stream:
                    _resume_token = change.get("_id")
                    doc = change.get("fullDocument")
                    if not doc:
                        continue

                    workflow_id = doc.get("workflow_id")
                    execution_id = doc.get("execution_id", doc.get("_id"))
                    steps = doc.get("steps", {})
                    if not workflow_id:
                        continue

                    # Initialize tracking for this execution
                    if execution_id not in _broadcasted_states:
                        _broadcasted_states[execution_id] = {}

                    # Broadcast all node status changes
                    for node_instance_id, step in steps.items():
                        current_status = step.get("status", "PENDING")
                        previous_status = _broadcasted_states[execution_id].get(
                            node_instance_id
                        )

                        # Only broadcast if status changed or new node
                        if current_status != previous_status:
                            _broadcasted_states[execution_id][
                                node_instance_id
                            ] = current_status

                            event = NodeStatusEvent(
                                workflow_id=workflow_id,
                                node_instance_id=node_instance_id,
                                status=Status(current_status),
                                error_message=step.get("error"),
                                metadata={
                                    "node_id": step.get("node_id"),
                                    "node_type": step.get("node_type"),
                                },
                            )

                            await sse_manager.broadcast(
                                event.model_dump_json(), workflow_id
                            )

                    # Clean up old execution tracking (keep last 100)
                    if len(_broadcasted_states) > 100:
                        oldest = list(_broadcasted_states.keys())[0]
                        del _broadcasted_states[oldest]

        except Exception as e:
            logger.error(f"Change stream error: {e}, reconnecting in 5s...")
            await asyncio.sleep(5)


async def start_change_stream() -> None:
    """Start MongoDB change stream consumer."""
    if not settings.enable_tracking:
        logger.info("Tracking disabled, skipping change stream")
        return

    logger.info("Change stream started")

    try:
        await _watch_changes()
    except asyncio.CancelledError:
        logger.info("Change stream stopped")
