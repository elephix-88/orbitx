from common.database.mongodb import find_one
from common.model.workflow import WorkflowData
from server.configs.config import settings
from server.services.exceptions import WorkflowNotFoundError


async def get_user_workflow(workflow_id: str, user_id: str) -> WorkflowData:
    """Load a workflow with ownership check. Raises on miss."""
    workflow = await find_one(
        settings.workflow_collection,
        {"_id": workflow_id, "user_id": user_id},
        WorkflowData,
    )
    if workflow is None:
        raise WorkflowNotFoundError(workflow_id)
    return workflow


async def find_user_workflow(workflow_id: str, user_id: str) -> WorkflowData | None:
    """Load a workflow with ownership check. Returns None on miss."""
    return await find_one(
        settings.workflow_collection,
        {"_id": workflow_id, "user_id": user_id},
        WorkflowData,
    )
