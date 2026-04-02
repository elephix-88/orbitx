import time

from loguru import logger

from common.database.mongodb import database, find_many, find_one
from common.model.execution import ExecutionHistory, Status
from common.model.workflow import JobIdRequest, WorkflowData, WorkflowSummary
from common.model.workflow_rules import validate_workflow_structure
from server.configs.config import settings
from server.services import prefect_client
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
    return await find_many(
        settings.workflow_collection, {"user_id": user.id}, WorkflowSummary
    )


async def get_workflow_builder(request: JobIdRequest) -> WorkflowData:
    """Get workflow by ID with ownership verification."""
    if not request.id:
        raise ValidationError("workflow_id", "Workflow ID is required")

    user = get_current_user()
    workflow = await find_one(
        settings.workflow_collection,
        {"_id": request.id, "user_id": user.id},
        WorkflowData,
    )

    if not workflow:
        raise WorkflowNotFoundError(request.id)

    return workflow


async def update_workflow(workflow_data: WorkflowData) -> bool:
    """Update workflow with ownership verification."""
    if not workflow_data.id:
        raise ValidationError("workflow_id", "Workflow ID (_id) is required for update")

    user = get_current_user()
    payload = workflow_data.model_dump(
        by_alias=True, exclude_none=True, exclude={"id", "_id"}
    )
    result = await database[settings.workflow_collection].update_one(
        {"_id": workflow_data.id, "user_id": user.id},
        {"$set": payload},
        upsert=False,
    )

    if result.matched_count == 0:
        raise WorkflowNotFoundError(workflow_data.id)

    await prefect_client.sync_deployment(workflow_data)

    logger.success(f"Workflow {workflow_data.id} updated successfully")
    return True


async def delete_workflow(id: str) -> bool:
    """Delete workflow with ownership verification."""
    if not id:
        return False

    user = get_current_user()
    query = {"_id": id, "user_id": user.id}

    workflow = await find_one(settings.workflow_collection, query, WorkflowData)

    if not workflow:
        return False

    result = await database[settings.workflow_collection].delete_one(query)
    deleted = result.deleted_count > 0

    if deleted:
        await prefect_client.delete_deployment(id)
        logger.info(f"Workflow {id} deleted")

    return deleted


async def create_new_workflow(workflow_data: WorkflowData) -> WorkflowData:
    if not workflow_data.id:
        workflow_data.id = generate_uuid()

    user = get_current_user()
    workflow_data.user_id = user.id

    doc = workflow_data.model_dump(by_alias=True, exclude_none=True)
    if "_id" not in doc:
        raise ValueError("WorkflowData must have an _id before inserting")
    await database[settings.workflow_collection].insert_one(doc)
    inserted_id = str(doc["_id"])

    workflow_data.id = inserted_id

    await prefect_client.sync_deployment(workflow_data)
    logger.info(f"Workflow {inserted_id} created")

    return workflow_data


async def execute_workflow(job_id: str) -> dict[str, str]:
    """Execute a workflow with ownership check.

    Creates an initial execution document in MongoDB with status RUNNING,
    then launches the Prefect run. Returns the run_id so the frontend
    can subscribe to the execution stream.
    """
    if not job_id:
        raise ValidationError("workflow_id", "Workflow ID is required")

    user = get_current_user()
    workflow = await find_one(
        settings.workflow_collection,
        {"_id": job_id, "user_id": user.id},
        WorkflowData,
    )

    if not workflow:
        raise WorkflowNotFoundError(job_id)

    validation = validate_workflow_structure(workflow.nodes, workflow.connections)
    if not validation.is_valid:
        raise WorkflowStructureError(validation.errors)

    execution_id = generate_uuid()

    execution = ExecutionHistory(
        _id=execution_id,
        execution_id=execution_id,
        workflow_id=job_id,
        workflow_name=workflow.job_name,
        status=Status.RUNNING,
        triggered_by="manual",
        start_time=time.time(),
        total_nodes=len(workflow.nodes),
    )

    await database[settings.execution_history_collection].update_one(
        {"execution_id": execution_id},
        {"$set": execution.model_dump(by_alias=True, exclude_none=True)},
        upsert=True,
    )

    await prefect_client.launch_run(
        workflow_id=job_id,
        workflow_name=workflow.job_name,
        run_type="all",
        user_id=user.id,
        execution_id=execution_id,
    )

    logger.success(f"Prefect run launched for workflow: {job_id}")
    return {"run_id": execution_id}
