import time
from typing import Any

from loguru import logger

from common.database.mongodb import database, find_one
from common.model.execution import ExecutionHistory
from common.model.workflow import WorkflowData
from server.configs.config import settings
from server.models.execution_debug import ExecutionSummary, RetryResponse
from server.services import prefect_client
from server.services.exceptions import WorkflowNotFoundError

EXECUTION_LIST_DAYS = 30
EXECUTION_LIST_LIMIT = 100


async def verify_workflow_ownership(workflow_id: str, user_id: str) -> WorkflowData:
    """Load a workflow and verify it belongs to user_id.

    Raises WorkflowNotFoundError if absent or not owned.
    """
    workflow = await find_one(
        settings.workflow_collection,
        {"_id": workflow_id, "user_id": user_id},
        WorkflowData,
    )
    if workflow is None:
        raise WorkflowNotFoundError(workflow_id)
    return workflow


def extract_failed_node(document: dict[str, Any]) -> str | None:
    """Return the node_id of the first failed step in an execution document.

    Iterates the steps dict in insertion order and returns the first step
    whose status is 'FAILED'. Returns None if no step failed.
    """
    for step in document.get("steps", {}).values():
        if step.get("status") == "FAILED":
            return step.get("node_id")
    return None


def document_to_execution_summary(document: dict[str, Any]) -> ExecutionSummary:
    """Convert a raw MongoDB execution document to an ExecutionSummary."""
    return ExecutionSummary(
        execution_id=document.get("execution_id", ""),
        status=document.get("status", ""),
        start_time=document.get("start_time", 0.0),
        end_time=document.get("end_time"),
        duration=document.get("duration"),
        triggered_by=document.get("triggered_by", "manual"),
        failed_node=extract_failed_node(document),
    )


async def get_execution_summaries(
    workflow_id: str, user_id: str
) -> list[ExecutionSummary]:
    """Return lightweight execution summaries for a workflow, newest first.

    Scoped to the last EXECUTION_LIST_DAYS days. Verifies workflow ownership
    before querying. Returns an empty list if the workflow is not found or
    not owned by the user.
    """
    try:
        await verify_workflow_ownership(workflow_id, user_id)
    except WorkflowNotFoundError:
        return []

    cutoff = time.time() - EXECUTION_LIST_DAYS * 24 * 3600
    collection = database[settings.execution_history_collection]

    cursor = (
        collection.find(
            {"workflow_id": workflow_id, "start_time": {"$gte": cutoff}},
            projection={
                "execution_id": 1,
                "status": 1,
                "start_time": 1,
                "end_time": 1,
                "duration": 1,
                "triggered_by": 1,
                "steps": 1,
            },
        )
        .sort("start_time", -1)
        .limit(EXECUTION_LIST_LIMIT)
    )

    documents = await cursor.to_list(length=None)

    logger.info(
        "Fetched %d execution summaries for workflow %s (user %s)",
        len(documents),
        workflow_id,
        user_id,
    )
    return [document_to_execution_summary(doc) for doc in documents]


async def get_execution_detail(
    workflow_id: str, execution_id: str, user_id: str
) -> ExecutionHistory:
    """Return the full execution document including per-node output_rows.

    Verifies workflow ownership before returning data.

    Raises:
        WorkflowNotFoundError: workflow not found or not owned by user.
        ValueError: execution_id not found in the given workflow.
    """
    await verify_workflow_ownership(workflow_id, user_id)

    document = await find_one(
        settings.execution_history_collection,
        {"execution_id": execution_id, "workflow_id": workflow_id},
    )

    if document is None:
        raise ValueError(
            f"Execution '{execution_id}' not found in workflow '{workflow_id}'"
        )

    # Normalise _id to string in case it is an ObjectId
    if "_id" in document:
        document["_id"] = str(document["_id"])

    return ExecutionHistory(**document)


async def retry_execution(
    workflow_id: str, execution_id: str, user_id: str
) -> RetryResponse:
    """Re-run a workflow. Uses any existing pinned node data.

    Raises:
        WorkflowNotFoundError: workflow not found or not owned by user.
        ValueError: Prefect fails to launch.
    """
    workflow = await verify_workflow_ownership(workflow_id, user_id)

    execution_id = await prefect_client.launch_run(
        workflow_id=workflow_id,
        workflow_name=workflow.job_name,
        run_type="all",
        user_id=user_id,
    )

    logger.info(
        "Retry run %s launched for workflow %s",
        execution_id,
        workflow_id,
    )
    return RetryResponse(execution_id=execution_id)
