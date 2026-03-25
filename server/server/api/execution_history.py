from typing import Any

from fastapi import APIRouter, Depends, Query

from common.model.user import UserInDB
from server.services.auth.dependencies import get_current_user
from server.services.execution_history import (
    get_dashboard_stats,
    get_execution_history_by_workflow,
)

router = APIRouter(prefix="/api/execution-history", tags=["Execution History"])


@router.get("/dashboard-stats")
async def get_dashboard_statistics(
    current_user: UserInDB = Depends(get_current_user),
    workflow_ids: str | None = Query(
        None, description="Comma-separated workflow IDs"
    ),
    workflow_names: str | None = Query(
        None, description="Comma-separated workflow names (same order as IDs)"
    ),
) -> dict[str, Any]:
    """Get aggregated dashboard statistics for all workflows owned by the current user.

    If workflow_ids and workflow_names are provided, skips workflow DB query entirely.
    Otherwise, fetches workflow data from DB.

    Returns stats computed via MongoDB aggregation in a single query:
    - total_executions, successful_executions, failed_executions, running_executions
    - success_rate (percentage)
    - avg_duration (in seconds)
    - recent_executions (top 10 most recent)
    - executions_by_workflow (per-workflow stats)
    """
    ids_list = workflow_ids.split(",") if workflow_ids else None
    names_dict = None
    if ids_list and workflow_names:
        names_list = workflow_names.split(",")
        if len(names_list) == len(ids_list):
            names_dict = dict(zip(ids_list, names_list))
    return await get_dashboard_stats(
        current_user.id, workflow_ids=ids_list, workflow_names=names_dict
    )


@router.get("/workflow/{workflow_id}")
async def get_workflow_executions(
    workflow_id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """Get all execution history for a workflow owned by the current user.

    Returns raw execution history documents including nested node output data.
    """
    return await get_execution_history_by_workflow(workflow_id)
