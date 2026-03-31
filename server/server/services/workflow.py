import time

from loguru import logger

from common.database import get_mongodb
from common.model.execution import ExecutionHistory, Status
from common.model.workflow import JobIdRequest, WorkflowData, WorkflowSummary
from common.model.workflow_rules import validate_workflow_structure
from server.configs.config import settings
from server.services import dagster_client
from server.services.auth.context import get_current_user
from server.services.exceptions import (
    ValidationError,
    WorkflowNotFoundError,
    WorkflowStructureError,
)
from server.services.utils import generate_uuid


async def get_all_workflows() -> list[WorkflowSummary]:
    """Get all workflows owned by the current user."""
    user = get_current_user()
    results = await get_mongodb().get_all_documents(
        collection_name=settings.workflow_collection,
        query={"user_id": user.id},
    )
    return [WorkflowSummary(**doc) for doc in results]


async def get_workflow_builder(request: JobIdRequest) -> WorkflowData:
    """Get workflow by ID with ownership verification."""
    if not request.id:
        raise ValidationError("workflow_id", "Workflow ID is required")

    user = get_current_user()
    workflow = await get_mongodb().get_document(
        collection_name=settings.workflow_collection,
        query={"_id": request.id, "user_id": user.id},
        model_cls=WorkflowData,
    )

    if not workflow:
        raise WorkflowNotFoundError(request.id)

    return workflow


async def update_workflow(workflow_data: WorkflowData) -> bool:
    """Update workflow with ownership verification."""
    if not workflow_data.id:
        raise ValidationError("workflow_id", "Workflow ID (_id) is required for update")

    user = get_current_user()
    result = await get_mongodb().update_document(
        collection_name=settings.workflow_collection,
        query={"_id": workflow_data.id, "user_id": user.id},
        data=workflow_data,
        upsert=False,
    )

    if result.matched_count == 0:
        raise WorkflowNotFoundError(workflow_data.id)

    # Dagster picks up schedule changes via code location reload
    dagster_client.reload_code_location()

    logger.success(f"Workflow {workflow_data.id} updated successfully")
    return True


async def delete_workflow(id: str) -> bool:
    """Delete workflow with ownership verification."""
    if not id:
        return False

    user = get_current_user()
    query = {"_id": id, "user_id": user.id}

    workflow = await get_mongodb().get_document(
        collection_name=settings.workflow_collection,
        query=query,
        model_cls=WorkflowData,
    )

    if not workflow:
        return False

    deleted = await get_mongodb().delete_document(
        collection_name=settings.workflow_collection,
        query=query,
    )

    if deleted:
        # Dagster will drop the schedule on next code location reload
        dagster_client.reload_code_location()
        logger.info(f"Workflow {id} deleted")

    return deleted


async def create_new_workflow(workflow_data: WorkflowData) -> WorkflowData:
    if not workflow_data.id:
        workflow_data.id = generate_uuid()

    user = get_current_user()
    workflow_data.user_id = user.id

    inserted_id = await get_mongodb().insert_document(
        collection_name=settings.workflow_collection,
        data=workflow_data,
    )

    workflow_data.id = inserted_id

    # Dagster will pick up the new schedule on code location reload
    dagster_client.reload_code_location()
    logger.info(f"Workflow {inserted_id} created")

    return workflow_data


async def execute_workflow(job_id: str) -> dict[str, str]:
    """Execute a workflow with ownership check.

    Creates an initial execution document in MongoDB with status RUNNING,
    then launches the Dagster run. Returns the run_id so the frontend
    can subscribe to the execution stream.
    """
    if not job_id:
        raise ValidationError("workflow_id", "Workflow ID is required")

    user = get_current_user()
    mongodb = get_mongodb()
    workflow = await mongodb.get_document(
        collection_name=settings.workflow_collection,
        query={"_id": job_id, "user_id": user.id},
        model_cls=WorkflowData,
    )

    if not workflow:
        raise WorkflowNotFoundError(job_id)

    validation = validate_workflow_structure(workflow.nodes, workflow.connections)
    if not validation.is_valid:
        raise WorkflowStructureError(validation.errors)

    run_id = dagster_client.launch_run(
        workflow_id=job_id,
        workflow_name=workflow.job_name,
        run_type="all",
        user_id=user.id,
    )

    execution = ExecutionHistory(
        _id=run_id,
        execution_id=run_id,
        workflow_id=job_id,
        workflow_name=workflow.job_name,
        status=Status.RUNNING,
        triggered_by="manual",
        start_time=time.time(),
        total_nodes=len(workflow.nodes),
    )

    collection = mongodb.get_collection(settings.execution_history_collection)
    await collection.update_one(
        {"execution_id": run_id},
        {"$set": execution.model_dump(by_alias=True, exclude_none=True)},
        upsert=True,
    )

    logger.success(f"Dagster run {run_id} launched for workflow: {job_id}")
    return {"run_id": run_id}
