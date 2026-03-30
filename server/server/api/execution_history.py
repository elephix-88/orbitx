from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from common.model.execution import ExecutionHistory
from common.model.user import UserInDB
from server.models.execution import ExecutionDeliveryStatus
from server.models.execution_debug import ExecutionSummary, RetryResponse
from server.services.auth.dependencies import get_current_user
from server.services.exceptions import WorkflowNotFoundError
from server.services.execution_debug import (
    get_execution_detail,
    get_execution_summaries,
    retry_execution,
)
from server.services.execution_delivery import (
    get_execution_delivery_status,
    set_execution_delivery_status,
)
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
            names_dict = dict(zip(ids_list, names_list, strict=False))
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


@router.get(
    "/executions/{execution_id}/delivery-status",
    response_model=ExecutionDeliveryStatus,
)
async def get_delivery_status_endpoint(
    execution_id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> ExecutionDeliveryStatus:
    """Get the delivery status for a specific execution."""
    result = await get_execution_delivery_status(execution_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    return result


@router.put(
    "/executions/{execution_id}/delivery-status",
    response_model=ExecutionDeliveryStatus,
)
async def set_delivery_status_endpoint(
    execution_id: str,
    delivery_status: ExecutionDeliveryStatus,
    _current_user: UserInDB = Depends(get_current_user),
) -> ExecutionDeliveryStatus:
    """Set the delivery status for a specific execution.

    Called by the delivery layer after attempting to send notifications.
    """
    await set_execution_delivery_status(execution_id, delivery_status)
    return delivery_status


@router.get(
    "/workflow/{workflow_id}/executions",
    response_model=list[ExecutionSummary],
)
async def list_execution_summaries(
    workflow_id: str,
    current_user: UserInDB = Depends(get_current_user),
) -> list[ExecutionSummary]:
    """List lightweight execution summaries for a workflow, newest first.

    Scoped to the last 30 days, capped at 100 results.
    Returns an empty list when the workflow does not exist or is not owned
    by the requesting user.
    """
    return await get_execution_summaries(workflow_id, current_user.id)


@router.get(
    "/workflow/{workflow_id}/executions/{execution_id}",
    response_model=ExecutionHistory,
)
async def get_execution_detail_endpoint(
    workflow_id: str,
    execution_id: str,
    current_user: UserInDB = Depends(get_current_user),
) -> ExecutionHistory:
    """Return the full execution document including per-node output_rows.

    Raises 404 when the workflow or execution is not found.
    """
    try:
        return await get_execution_detail(workflow_id, execution_id, current_user.id)
    except WorkflowNotFoundError:
        raise HTTPException(status_code=404, detail="Workflow not found") from None
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from None


@router.post(
    "/workflow/{workflow_id}/executions/{execution_id}/retry",
    response_model=RetryResponse,
)
async def retry_execution_endpoint(
    workflow_id: str,
    execution_id: str,
    current_user: UserInDB = Depends(get_current_user),
) -> RetryResponse:
    """Re-run a workflow using intermediate data from a previous execution.

    Pins output_rows from each completed step, then launches a new Dagster
    run so the engine skips re-fetching from source for pinned nodes.

    Raises 404 when the workflow or execution is not found.
    Raises 422 when Dagster fails to launch the retry run.
    """
    try:
        return await retry_execution(workflow_id, execution_id, current_user.id)
    except WorkflowNotFoundError:
        raise HTTPException(status_code=404, detail="Workflow not found") from None
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from None
