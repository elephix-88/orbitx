from fastapi import APIRouter, Depends, HTTPException

from common.model.delivery import DeliveryConfig
from common.model.user import UserInDB
from server.models.delivery import DeleteDeliveryResponse, DeliveryConfigResponse
from server.services.auth.dependencies import get_current_user
from server.services.exceptions import WorkflowNotFoundError
from server.services.workflow.delivery import (
    get_workflow_delivery,
    remove_workflow_delivery,
    set_workflow_delivery,
)

router = APIRouter(prefix="/api/workflows", tags=["delivery"])


@router.put("/{id}/delivery", response_model=DeliveryConfigResponse)
async def set_delivery_endpoint(
    id: str,
    delivery: DeliveryConfig,
    _current_user: UserInDB = Depends(get_current_user),
) -> DeliveryConfigResponse:
    """Configure delivery channels for a workflow."""
    try:
        saved = await set_workflow_delivery(id, delivery)
        return DeliveryConfigResponse(workflow_id=id, delivery=saved)
    except WorkflowNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/{id}/delivery", response_model=DeliveryConfigResponse)
async def get_delivery_endpoint(
    id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> DeliveryConfigResponse:
    """Get current delivery config for a workflow."""
    try:
        delivery = await get_workflow_delivery(id)
        return DeliveryConfigResponse(workflow_id=id, delivery=delivery)
    except WorkflowNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.delete("/{id}/delivery", response_model=DeleteDeliveryResponse)
async def remove_delivery_endpoint(
    id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> DeleteDeliveryResponse:
    """Remove delivery config from a workflow."""
    try:
        await remove_workflow_delivery(id)
        return DeleteDeliveryResponse(success=True)
    except WorkflowNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
