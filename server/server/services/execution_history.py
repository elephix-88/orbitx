from typing import Any

from loguru import logger

from common.database import get_mongodb
from common.model.workflow import WorkflowData
from server.configs.config import settings
from server.services.auth.context import get_current_user


async def get_dashboard_stats(
    user_id: str,
    workflow_ids: list[str] | None = None,
    workflow_names: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Get aggregated dashboard statistics for all workflows owned by the user.

    Args:
        user_id: The user's ID for ownership verification
        workflow_ids: Optional list of workflow IDs.
        workflow_names: Optional dict of workflow_id -> name. If both workflow_ids
                       and workflow_names are provided, skips DB query entirely.

    Returns stats computed via MongoDB aggregation pipeline in a single query.
    """
    empty_response = {
        "total_executions": 0,
        "successful_executions": 0,
        "failed_executions": 0,
        "running_executions": 0,
        "success_rate": 0,
        "avg_duration": 0,
        "recent_executions": [],
        "executions_by_workflow": {},
    }

    # If both workflow_ids and names provided, skip DB query
    if workflow_ids and workflow_names:
        pass  # Use provided data directly
    else:
        # Fetch workflows from DB - always include user_id for ownership verification
        query: dict[str, Any] = {"user_id": user_id}
        if workflow_ids:
            query["_id"] = {"$in": workflow_ids}

        workflows = await get_mongodb().get_all_documents(
            collection_name=settings.workflow_collection,
            query=query,
            model_cls=WorkflowData,
        )
        if not workflows:
            return empty_response

        workflow_ids = [w.id for w in workflows]
        workflow_names = {w.id: w.job_name for w in workflows}

    logger.info(f"Fetching dashboard stats for {len(workflow_ids)} workflows")

    # Aggregation pipeline to compute all stats in one query
    pipeline = [
        # Match only executions for user's workflows
        {"$match": {"workflow_id": {"$in": workflow_ids}}},
        # Facet to run multiple aggregations in parallel
        {
            "$facet": {
                # Overall stats
                "stats": [
                    {
                        "$group": {
                            "_id": None,
                            "total": {"$sum": 1},
                            "successful": {
                                "$sum": {
                                    "$cond": [{"$eq": ["$status", "SUCCESS"]}, 1, 0]
                                }
                            },
                            "failed": {
                                "$sum": {
                                    "$cond": [{"$eq": ["$status", "FAILED"]}, 1, 0]
                                }
                            },
                            "running": {
                                "$sum": {
                                    "$cond": [{"$eq": ["$status", "RUNNING"]}, 1, 0]
                                }
                            },
                            "total_duration": {
                                "$sum": {
                                    "$cond": [
                                        {
                                            "$and": [
                                                {"$ne": ["$duration", None]},
                                                {"$gt": ["$duration", 0]},
                                            ]
                                        },
                                        "$duration",
                                        0,
                                    ]
                                }
                            },
                            "duration_count": {
                                "$sum": {
                                    "$cond": [
                                        {
                                            "$and": [
                                                {"$ne": ["$duration", None]},
                                                {"$gt": ["$duration", 0]},
                                            ]
                                        },
                                        1,
                                        0,
                                    ]
                                }
                            },
                        }
                    }
                ],
                # Per-workflow stats
                "by_workflow": [
                    {
                        "$group": {
                            "_id": "$workflow_id",
                            "count": {"$sum": 1},
                            "successful": {
                                "$sum": {
                                    "$cond": [{"$eq": ["$status", "SUCCESS"]}, 1, 0]
                                }
                            },
                        }
                    }
                ],
                # Recent executions (top 10)
                "recent": [
                    {"$sort": {"start_time": -1}},
                    {"$limit": 10},
                ],
            }
        },
    ]

    result = await get_mongodb().aggregate(
        collection_name=settings.execution_history_collection,
        pipeline=pipeline,
    )

    if not result:
        return {
            "total_executions": 0,
            "successful_executions": 0,
            "failed_executions": 0,
            "running_executions": 0,
            "success_rate": 0,
            "avg_duration": 0,
            "recent_executions": [],
            "executions_by_workflow": {},
        }

    data = result[0]
    stats = data["stats"][0] if data["stats"] else {}

    total = stats.get("total", 0)
    successful = stats.get("successful", 0)
    failed = stats.get("failed", 0)
    running = stats.get("running", 0)
    total_duration = stats.get("total_duration", 0)
    duration_count = stats.get("duration_count", 0)

    success_rate = round((successful / total) * 100) if total > 0 else 0
    avg_duration = total_duration / duration_count if duration_count > 0 else 0

    # Build executions by workflow with names
    executions_by_workflow = {}
    for wf in data["by_workflow"]:
        wf_id = wf["_id"]
        wf_count = wf["count"]
        wf_successful = wf["successful"]
        executions_by_workflow[wf_id] = {
            "name": workflow_names.get(wf_id, wf_id),
            "count": wf_count,
            "success_rate": round((wf_successful / wf_count) * 100)
            if wf_count > 0
            else 0,
        }

    # Process recent executions - add workflow_name field
    recent_executions = data["recent"]
    for exec_record in recent_executions:
        exec_record["workflow_name"] = workflow_names.get(
            exec_record.get("workflow_id"), exec_record.get("workflow_id")
        )
        # Convert ObjectId to string if present
        if "_id" in exec_record:
            exec_record["_id"] = str(exec_record["_id"])

    logger.info(
        f"Dashboard stats: {total} total, {successful} success, {failed} failed"
    )

    return {
        "total_executions": total,
        "successful_executions": successful,
        "failed_executions": failed,
        "running_executions": running,
        "success_rate": success_rate,
        "avg_duration": avg_duration,
        "recent_executions": recent_executions,
        "executions_by_workflow": executions_by_workflow,
    }


async def get_execution_history_by_workflow(workflow_id: str) -> list[dict[str, Any]]:
    """Get all execution history for a workflow with ownership verification.

    Returns raw dicts to preserve nested output data properly.
    """
    user = get_current_user()

    # First verify that the user owns this workflow
    workflow = await get_mongodb().get_document(
        collection_name=settings.workflow_collection,
        query={"_id": workflow_id, "user_id": user.id},
        model_cls=WorkflowData,
    )
    if not workflow:
        return []  # User doesn't own this workflow or it doesn't exist

    # Get raw documents to preserve all nested data including output
    return await get_mongodb().get_all_documents(
        collection_name=settings.execution_history_collection,
        query={"workflow_id": workflow_id},
        model_cls=None,  # Get raw dicts, not Pydantic models
    )
