from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from loguru import logger
from pymongo.errors import DuplicateKeyError

from common.model.user import UserInDB
from common.model.workflow import JobIdRequest, WorkflowData, WorkflowSummary
from server.configs.config import settings
from server.middleware import limiter
from server.services.auth.dependencies import get_current_user
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
