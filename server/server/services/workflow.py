from fastapi import HTTPException
from loguru import logger

from common.database import get_mongodb
from common.model.workflow import JobIdRequest, WorkflowData, WorkflowSummary
from server.configs.config import settings
from server.services.auth.context import get_current_user
from server.services.google.scheduler import scheduler_service
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
        raise HTTPException(status_code=400, detail="Workflow ID is required")

    user = get_current_user()
    workflow = await get_mongodb().get_document(
        collection_name=settings.workflow_collection,
        query={"_id": request.id, "user_id": user.id},
        model_cls=WorkflowData,
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return workflow


async def update_workflow(workflow_data: WorkflowData) -> bool:
    """Update workflow with ownership verification."""
    if not workflow_data.id:
        logger.error("Workflow ID is required for update")
        raise HTTPException(
            status_code=400,
            detail={
                "status": False,
                "message": "Workflow ID (_id) is required for update",
                "workflow_id": None,
            },
        )

    user = get_current_user()
    result = await get_mongodb().update_document(
        collection_name=settings.workflow_collection,
        query={"_id": workflow_data.id, "user_id": user.id},
        data=workflow_data,
        upsert=False,
    )

    if result.matched_count == 0:
        logger.error(f"Workflow {workflow_data.id} not found or access denied")
        raise HTTPException(
            status_code=404,
            detail={
                "status": False,
                "message": "Workflow not found or access denied",
                "workflow_id": workflow_data.id,
            },
        )

    try:
        scheduler_success = scheduler_service.update_workflow_schedule(
            job_id=workflow_data.id,
            job_name=workflow_data.job_name,
            schedule_expression=workflow_data.schedule_expression,
        )

        if scheduler_success:
            logger.info(f"Updated scheduler job for workflow: {workflow_data.id}")
        else:
            logger.warning(
                f"Failed to update scheduler job for workflow: {workflow_data.id}"
            )

    except Exception as e:
        logger.error(
            f"Error updating scheduler job for workflow {workflow_data.id}: {e}"
        )

    logger.success(f"Workflow {workflow_data.id} updated successfully")
    return True


async def delete_workflow(id: str) -> bool:
    """Delete workflow with ownership verification."""
    if not id:
        return False

    user = get_current_user()
    query = {"_id": id, "user_id": user.id}

    # Get workflow data before deletion to get job_id for scheduler cleanup
    try:
        workflow = await get_mongodb().get_document(
            collection_name=settings.workflow_collection,
            query=query,
            model_cls=WorkflowData,
        )

        if workflow:
            # Delete Google Cloud Scheduler job
            try:
                scheduler_success = scheduler_service.delete_workflow_schedule(
                    job_id=workflow.id
                )

                if scheduler_success:
                    logger.info(f"Deleted scheduler job for workflow: {workflow.id}")
                else:
                    logger.warning(
                        f"Failed to delete scheduler job for workflow: {workflow.id}"
                    )

            except Exception as e:
                logger.error(
                    f"Error deleting scheduler job for workflow {workflow.id}: {e}"
                )
                # Continue with workflow deletion even if scheduler cleanup fails
        else:
            # Workflow not found or access denied
            return False

    except Exception as e:
        logger.error(f"Error retrieving workflow data for deletion: {e}")
        return False

    # Delete workflow from MongoDB with user_id filter
    return await get_mongodb().delete_document(
        collection_name=settings.workflow_collection,
        query=query,
    )


async def create_new_workflow(workflow_data: WorkflowData) -> WorkflowData:
    if not workflow_data.id:
        workflow_data.id = generate_uuid()

    # Set user_id from context
    user = get_current_user()
    workflow_data.user_id = user.id

    # Insert workflow into MongoDB
    inserted_id = await get_mongodb().insert_document(
        collection_name=settings.workflow_collection,
        data=workflow_data,
    )

    # Update the workflow data with the inserted ID
    workflow_data.id = inserted_id

    # Create Google Cloud Scheduler job
    try:
        scheduler_success = scheduler_service.create_workflow_schedule(
            job_id=inserted_id,
            job_name=workflow_data.job_name,
            schedule_expression=workflow_data.schedule_expression,
        )

        if scheduler_success:
            logger.info(f"Created scheduler job for workflow: {inserted_id}")
        else:
            logger.warning(
                f"Failed to create scheduler job for workflow: {inserted_id}"
            )

    except Exception as e:
        logger.error(f"Error creating scheduler job for workflow {inserted_id}: {e}")
        # Don't fail the workflow creation if scheduler fails

    return workflow_data


async def execute_workflow(job_id: str) -> bool:
    """Execute a workflow by triggering its Cloud Scheduler job with ownership check."""
    if not job_id:
        raise HTTPException(status_code=400, detail="Workflow ID is required")

    # Verify ownership
    user = get_current_user()
    workflow = await get_mongodb().get_document(
        collection_name=settings.workflow_collection,
        query={"_id": job_id, "user_id": user.id},
    )

    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    logger.info(f"Triggering immediate execution for workflow: {job_id}")
    try:
        success = scheduler_service.run_workflow_schedule(job_id)
        if success:
            logger.info(f"Successfully triggered scheduler for workflow: {job_id}")
        else:
            logger.warning(f"Failed to trigger scheduler for workflow: {job_id}")
        return success
    except Exception as e:
        logger.error(f"Error executing workflow: {e}")
        raise HTTPException(status_code=500, detail="Failed to execute workflow")
