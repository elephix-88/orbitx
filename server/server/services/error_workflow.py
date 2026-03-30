from loguru import logger

from common.database import get_mongodb
from common.model.error_trigger import ErrorPayload
from common.model.workflow import WorkflowData
from server.configs.config import settings
from server.models.error_workflow import TriggerErrorRequest, TriggerErrorResponse
from server.services import dagster_client
from server.services.exceptions import WorkflowNotFoundError

ERROR_TRIGGER_NODE_ID = "error_trigger"
ERROR_PAYLOAD_TAG_KEY = "error_payload"


async def load_workflow(workflow_id: str, user_id: str) -> WorkflowData | None:
    """Load a workflow by ID with ownership verification.

    Returns None if the workflow does not exist or belongs to a different user.
    """
    return await get_mongodb().get_document(
        collection_name=settings.workflow_collection,
        query={"_id": workflow_id, "user_id": user_id},
        model_cls=WorkflowData,
    )


def workflow_has_error_trigger_node(workflow: WorkflowData) -> bool:
    """Return True if any node in the workflow has node_id == 'error_trigger'."""
    return any(node.node_id == ERROR_TRIGGER_NODE_ID for node in workflow.nodes)


def serialise_error_payload_as_tags(payload: ErrorPayload) -> dict[str, str]:
    """Encode ErrorPayload as a single JSON string tag for Dagster.

    Dagster run tags are string→string. We pack the full payload into one
    tag so the ErrorTriggerExtractor can deserialise it from context.run_tags.
    """
    return {ERROR_PAYLOAD_TAG_KEY: payload.model_dump_json()}


async def trigger_error_workflow(
    workflow_id: str,
    request: TriggerErrorRequest,
    user_id: str,
) -> TriggerErrorResponse:
    """Trigger an error-handling workflow in response to a failed execution.

    Validation steps (each raises ValueError with a descriptive message):
    1. The error workflow (workflow_id) must exist and be owned by user.
    2. The error workflow must contain an error_trigger node.
    3. The caller workflow (caller_workflow_id) must exist and be owned by user.
    4. Loop prevention: the caller workflow must NOT have error_workflow_id set.
       Error workflows cannot themselves trigger further error workflows.

    On success, launches the error workflow via Dagster with the ErrorPayload
    serialised into the run tags under the key 'error_payload'.
    """
    error_workflow = await load_workflow(workflow_id, user_id)
    if error_workflow is None:
        raise WorkflowNotFoundError(workflow_id)

    if not workflow_has_error_trigger_node(error_workflow):
        raise ValueError(
            f"Workflow '{workflow_id}' has no error_trigger node "
            f"and cannot be used as an error handler"
        )

    caller_workflow = await load_workflow(request.caller_workflow_id, user_id)
    if caller_workflow is None:
        raise WorkflowNotFoundError(request.caller_workflow_id)

    if caller_workflow.error_workflow_id is not None:
        raise ValueError(
            f"Loop prevention: workflow '{request.caller_workflow_id}' is itself an "
            f"error-handling workflow and cannot trigger another error workflow"
        )

    logger.info(
        "Triggering error workflow %s for failed workflow %s (execution %s)",
        workflow_id,
        request.caller_workflow_id,
        request.error_payload.execution_id,
    )

    run_id = dagster_client.launch_run(
        workflow_id=workflow_id,
        workflow_name=error_workflow.job_name,
        run_type="all",
        user_id=user_id,
        extra_tags=serialise_error_payload_as_tags(request.error_payload),
    )

    if run_id is None:
        logger.error(
            "Dagster failed to launch error workflow %s for execution %s",
            workflow_id,
            request.error_payload.execution_id,
        )
        return TriggerErrorResponse(triggered=False, execution_id=None)

    logger.info(
        "Error workflow %s launched as Dagster run %s",
        workflow_id,
        run_id,
    )
    return TriggerErrorResponse(triggered=True, execution_id=run_id)
