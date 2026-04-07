from loguru import logger

from common.database.mongodb import database, find_one
from server.configs.config import settings
from server.models.execution import DeliveryStatus, ExecutionDeliveryStatus
from server.services.auth.context import get_current_user
from server.services.workflow_utils import find_user_workflow


async def set_execution_delivery_status(
    execution_id: str,
    delivery_status: ExecutionDeliveryStatus,
) -> None:
    """Write delivery_status onto an execution history document.

    Verifies that the execution's workflow is owned by the current user before writing.
    Called by the delivery layer after attempting to send to configured channels.
    """
    user = get_current_user()
    document = await find_one(
        settings.execution_history_collection, {"execution_id": execution_id}
    )

    if document is None:
        logger.warning(
            f"Execution {execution_id} not found — delivery_status not recorded"
        )
        return

    workflow_id = document.get("workflow_id")
    owned_workflow = await find_user_workflow(workflow_id, user.id)

    if owned_workflow is None:
        logger.warning(
            f"Execution {execution_id}: workflow {workflow_id} "
            f"not owned by user {user.id}"
        )
        return

    await database[settings.execution_history_collection].update_one(
        {"execution_id": execution_id},
        {"$set": {"delivery_status": delivery_status.model_dump()}},
    )

    logger.info(
        f"delivery_status={delivery_status.status} written to execution {execution_id}"
    )


async def get_execution_delivery_status(
    execution_id: str,
) -> ExecutionDeliveryStatus | None:
    """Get the delivery_status for an execution, with ownership verification."""
    user = get_current_user()

    document = await find_one(
        settings.execution_history_collection, {"execution_id": execution_id}
    )

    if document is None:
        return None

    workflow_id = document.get("workflow_id")
    owned_workflow = await find_user_workflow(workflow_id, user.id)

    if owned_workflow is None:
        return None

    delivery_data = document.get("delivery_status")
    if not delivery_data:
        return ExecutionDeliveryStatus(status=DeliveryStatus.skipped)

    return ExecutionDeliveryStatus(**delivery_data)
