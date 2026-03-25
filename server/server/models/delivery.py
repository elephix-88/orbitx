# DeliveryConfig lives in common.model.delivery — re-exported here for convenience
from pydantic import BaseModel

from common.model.delivery import (
    DeliveryChannel,
    DeliveryConfig,
    LineChannelConfig,
    SlackChannelConfig,
)

__all__ = [
    "DeliveryChannel",
    "DeliveryConfig",
    "LineChannelConfig",
    "SlackChannelConfig",
    "DeliveryConfigResponse",
    "DeleteDeliveryResponse",
]


class DeliveryConfigResponse(BaseModel):
    workflow_id: str
    delivery: DeliveryConfig | None


class DeleteDeliveryResponse(BaseModel):
    success: bool
