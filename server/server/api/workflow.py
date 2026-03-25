from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from loguru import logger
from pymongo.errors import DuplicateKeyError

from common.model.user import UserInDB
from common.model.workflow import JobIdRequest, WorkflowData, WorkflowSummary
from server.configs.config import settings
from server.middleware import limiter
from server.models.schedule import ScheduleConfig, ScheduleResponse
from server.services.auth.dependencies import get_current_user
from server.services.exceptions import WorkflowNotFoundError
from server.services.preview import (
    PreviewNodeRequest,
    PreviewNodeResponse,
    preview_node_data,
)
from server.services.schedule import (
    get_workflow_schedule,
    remove_workflow_schedule,
    set_workflow_schedule,
)
from server.services.workflow import (
    create_new_workflow,
    delete_workflow,
    execute_workflow,
    get_all_workflows,
    get_workflow_builder,
    update_workflow,
)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.post("", response_model=WorkflowData)
@limiter.limit(settings.rate_limit_expensive)
async def create_workflow(
    request: Request,
    workflow_data: WorkflowData,
    _current_user: UserInDB = Depends(get_current_user),
):
    try:
        created_workflow = await create_new_workflow(workflow_data)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED, content=created_workflow.model_dump()
        )
    except DuplicateKeyError as e:
        logger.warning(
            f"Create workflow duplicate: id={workflow_data.id} | {e.details}"
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Workflow with this id already exists",
        )


@router.post("/execute")
@limiter.limit(settings.rate_limit_expensive)
async def execute_workflow_endpoint(
    request: Request,
    job_request: JobIdRequest,
    _current_user: UserInDB = Depends(get_current_user),
):
    result = await execute_workflow(job_request.id)
    return result


@router.post("/preview-node", response_model=PreviewNodeResponse)
@limiter.limit(settings.rate_limit_expensive)
async def preview_node(
    request: Request,
    preview_request: PreviewNodeRequest,
    _current_user: UserInDB = Depends(get_current_user),
) -> PreviewNodeResponse:
    return await preview_node_data(preview_request)


@router.get("", response_model=list[WorkflowSummary])
async def read_all_workflows_endpoint(
    _current_user: UserInDB = Depends(get_current_user),
):
    logger.info("Fetching workflow summaries")
    return await get_all_workflows()


@router.put("", response_model=bool)
@limiter.limit(settings.rate_limit_expensive)
async def update_workflow_endpoint(
    request: Request,
    workflow_data: WorkflowData,
    _current_user: UserInDB = Depends(get_current_user),
) -> bool:
    result = await update_workflow(workflow_data)
    return result


@router.put("/{id}", response_model=bool)
@limiter.limit(settings.rate_limit_expensive)
async def update_workflow_by_id_endpoint(
    request: Request,
    id: str,
    workflow_data: WorkflowData,
    _current_user: UserInDB = Depends(get_current_user),
) -> bool:
    # If the workflow_data doesn't have an ID, use the URL parameter
    if not workflow_data.id:
        workflow_data.id = id
    result = await update_workflow(workflow_data)
    return result


@router.get("/{id}", response_model=WorkflowData)
async def get_workflow_builder_endpoint(
    id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> WorkflowData:
    request = JobIdRequest(_id=id)
    results = await get_workflow_builder(request)
    if not results:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return results


@router.delete("/{id}", response_model=bool)
async def delete_workflow_endpoint(
    id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> bool:
    deleted = await delete_workflow(id)
    if not deleted:
        logger.error(f"Workflow ID {id} not found or access denied")
        raise HTTPException(status_code=404, detail="Workflow not found")

    logger.info(f"Workflow ID {id} has been deleted")
    return True


@router.put("/{id}/schedule", response_model=ScheduleResponse)
@limiter.limit(settings.rate_limit_expensive)
async def set_schedule_endpoint(
    request: Request,
    id: str,
    schedule: ScheduleConfig,
    _current_user: UserInDB = Depends(get_current_user),
) -> ScheduleResponse:
    """Set or update the schedule config on a workflow."""
    try:
        saved = await set_workflow_schedule(id, schedule)
        return ScheduleResponse(workflow_id=id, schedule=saved)
    except WorkflowNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/{id}/schedule", response_model=ScheduleResponse)
async def get_schedule_endpoint(
    id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> ScheduleResponse:
    """Get the current schedule config for a workflow."""
    try:
        schedule = await get_workflow_schedule(id)
        return ScheduleResponse(workflow_id=id, schedule=schedule)
    except WorkflowNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.delete("/{id}/schedule")
async def remove_schedule_endpoint(
    id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> dict:
    """Remove the schedule from a workflow."""
    try:
        await remove_workflow_schedule(id)
        return {"success": True}
    except WorkflowNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
