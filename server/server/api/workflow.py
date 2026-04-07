import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from loguru import logger
from pymongo.errors import DuplicateKeyError

from common.database.mongodb import database, find_one
from common.model.execution import Status
from common.model.user import UserInDB
from common.model.workflow import JobIdRequest, WorkflowData, WorkflowSummary
from server.configs.config import settings
from server.middleware import limiter
from server.models.error_workflow import TriggerErrorRequest, TriggerErrorResponse
from server.models.pin import PinnedDataMap, PinNodeRequest
from server.models.schedule import ScheduleConfig, ScheduleResponse
from server.models.step_run import StepRunRequest
from server.services.auth.dependencies import get_current_user, get_current_user_optional
from server.services.error_workflow import trigger_error_workflow
from server.services.exceptions import WorkflowNotFoundError, WorkflowStructureError
from server.services.pin_service import (
    get_all_pinned_data,
    pin_node,
    unpin_node,
)
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
from server.services.step_run import step_run_node
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
        ) from e


@router.post("/execute")
@limiter.limit(settings.rate_limit_expensive)
async def execute_workflow_endpoint(
    request: Request,
    job_request: JobIdRequest,
    _current_user: UserInDB = Depends(get_current_user),
):
    try:
        result = await execute_workflow(job_request.id)
        return result
    except WorkflowStructureError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": error.message,
                "details": error.details,
                "validation_errors": [
                    {"error_type": e.error_type, "message": e.message}
                    for e in error.validation_errors
                ],
            },
        ) from error


TERMINAL_STATUSES = {Status.SUCCESS, Status.FAILED}
SSE_POLL_INTERVAL = 1.5
SSE_MAX_DURATION = 600  # 10 minutes safety cap


@router.get("/{workflow_id}/execution-stream")
async def execution_stream(
    workflow_id: str,
    _current_user: UserInDB = Depends(get_current_user),
):
    """SSE endpoint that streams execution status changes for a workflow.

    Watches the latest RUNNING execution in MongoDB and pushes updates
    whenever the document changes. Closes when the execution reaches
    a terminal status (SUCCESS/FAILED/CANCELED) or the safety cap expires.
    """
    collection = database[settings.execution_history_collection]

    async def find_latest(query: dict) -> dict | None:
        cursor = collection.find(query).sort("start_time", -1).limit(1)
        results = await cursor.to_list(length=1)
        return results[0] if results else None

    async def event_generator():
        previous_snapshot = None
        elapsed = 0.0

        while elapsed < SSE_MAX_DURATION:
            document = await find_latest(
                {"workflow_id": workflow_id, "status": Status.RUNNING}
            )

            if document is None:
                document = await find_latest(
                    {"workflow_id": workflow_id}
                )

            if document is None:
                yield "data: {}\n\n"
                return

            if "_id" in document:
                document["_id"] = str(document["_id"])

            current_snapshot = json.dumps(
                document, default=str, sort_keys=True
            )

            if current_snapshot != previous_snapshot:
                yield f"data: {json.dumps(document, default=str)}\n\n"
                previous_snapshot = current_snapshot

            execution_status = document.get("status", "")
            if execution_status in TERMINAL_STATUSES:
                return

            await asyncio.sleep(SSE_POLL_INTERVAL)
            elapsed += SSE_POLL_INTERVAL

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


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


@router.put("/{workflow_id}/nodes/{node_instance_id}/pin")
@limiter.limit(settings.rate_limit_expensive)
async def pin_node_endpoint(
    request: Request,
    workflow_id: str,
    node_instance_id: int,
    pin_request: PinNodeRequest,
    current_user: UserInDB = Depends(get_current_user),
) -> dict:
    """Pin node output data for a workflow node.

    Stores the provided data and column schema in MongoDB keyed by workflow_id
    and node_instance_id. Data is truncated to 1000 rows on write.
    """
    await pin_node(
        workflow_id=workflow_id,
        node_instance_id=node_instance_id,
        user_id=current_user.id,
        data=pin_request.data,
        columns=pin_request.columns,
    )
    return {"success": True}


@router.delete("/{workflow_id}/nodes/{node_instance_id}/pin")
async def unpin_node_endpoint(
    workflow_id: str,
    node_instance_id: int,
    current_user: UserInDB = Depends(get_current_user),
) -> dict:
    """Remove pinned data for a workflow node.

    Returns 404 if no pin exists for the given workflow and node.
    """
    removed = await unpin_node(
        workflow_id=workflow_id,
        node_instance_id=node_instance_id,
        user_id=current_user.id,
    )
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No pinned data found for node {node_instance_id}"
                f" in workflow {workflow_id}"
            ),
        )
    return {"success": True}


@router.get("/{workflow_id}/pinned-data", response_model=PinnedDataMap)
async def get_pinned_data_endpoint(
    workflow_id: str,
    current_user: UserInDB = Depends(get_current_user),
) -> PinnedDataMap:
    """Return all pinned nodes for a workflow as a dict keyed by node_instance_id."""
    return await get_all_pinned_data(
        workflow_id=workflow_id,
        user_id=current_user.id,
    )


@router.post("/{workflow_id}/nodes/{node_instance_id}/step-run")
@limiter.limit(settings.rate_limit_expensive)
async def step_run_node_endpoint(
    request: Request,
    workflow_id: str,
    node_instance_id: int,
    step_run_request: StepRunRequest,
    current_user: UserInDB = Depends(get_current_user),
) -> dict:
    """Execute a single workflow node outside of Prefect.

    Resolves upstream data from pins (fast path) or via live execution (fallback).
    Always returns 200. Execution errors are reported inline via error_message
    and traceback fields so the frontend can display them next to the node.
    """
    try:
        result = await step_run_node(
            workflow_id=workflow_id,
            node_instance_id=node_instance_id,
            auto_pin=step_run_request.auto_pin,
            user_id=current_user.id,
        )
        return result.model_dump()
    except WorkflowNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@router.post(
    "/{workflow_id}/trigger-error",
    response_model=TriggerErrorResponse,
)
@limiter.limit(settings.rate_limit_expensive)
async def trigger_error_endpoint(
    request: Request,
    workflow_id: str,
    trigger_request: TriggerErrorRequest,
    current_user: UserInDB | None = Depends(get_current_user_optional),
) -> TriggerErrorResponse:
    """Trigger an error-handling workflow on behalf of a failed execution.

    Called by the engine on_flow_failure hook when a workflow with
    error_workflow_id configured fails. Accepts either JWT auth or
    X-Internal-Service-Key header for engine-to-server calls.

    HTTP 404 — workflow_id or caller_workflow_id not found.
    HTTP 400 — target workflow has no error_trigger node, or loop prevention
               triggered (caller is itself an error-handling workflow).
    """
    if current_user:
        user_id = current_user.id
    else:
        # Engine-to-server call: validate internal service key
        service_key = request.headers.get("X-Internal-Service-Key")
        if not service_key or service_key != settings.internal_service_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )
        doc = await find_one(
            settings.workflow_collection,
            trigger_request.caller_workflow_id,
            projection={"user_id": 1},
        )
        if not doc or not doc.get("user_id"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Caller workflow {trigger_request.caller_workflow_id} not found",
            )
        user_id = doc["user_id"]
    try:
        return await trigger_error_workflow(
            workflow_id=workflow_id,
            request=trigger_request,
            user_id=user_id,
        )
    except WorkflowNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
