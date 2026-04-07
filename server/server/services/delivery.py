from common.model.delivery import DeliveryConfig
from server.services.auth.context import get_current_user
from server.services.workflow_field import (
    get_workflow_field,
    remove_workflow_field,
    set_workflow_field,
)

DELIVERY_FIELD = "delivery"


async def set_workflow_delivery(
    workflow_id: str,
    delivery: DeliveryConfig,
) -> DeliveryConfig:
    """Set or replace the delivery config on a workflow owned by the current user."""
    user = get_current_user()
    return await set_workflow_field(workflow_id, user.id, DELIVERY_FIELD, delivery)


async def get_workflow_delivery(workflow_id: str) -> DeliveryConfig | None:
    """Get the delivery config for a workflow owned by the current user."""
    user = get_current_user()
    return await get_workflow_field(
        workflow_id, user.id, DELIVERY_FIELD, DeliveryConfig
    )


async def remove_workflow_delivery(workflow_id: str) -> None:
    """Remove the delivery config from a workflow owned by the current user."""
    user = get_current_user()
    await remove_workflow_field(workflow_id, user.id, DELIVERY_FIELD)
