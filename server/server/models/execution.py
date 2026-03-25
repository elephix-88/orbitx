from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class DeliveryStatus(StrEnum):
    pending = "pending"
    sent = "sent"
    failed = "failed"
    skipped = "skipped"


class ChannelDeliveryResult(BaseModel):
    channel_type: str
    channel_id: str
    channel_name: str
    status: DeliveryStatus
    error: str | None = None


class ExecutionDeliveryStatus(BaseModel):
    status: DeliveryStatus
    channels: list[ChannelDeliveryResult] = []


class ExecutionHistoryWithDelivery(BaseModel):
    """Execution history document with the delivery_status field appended."""

    id: str
    workflow_id: str
    status: str
    delivery_status: ExecutionDeliveryStatus | None = None
    extra: dict[str, Any] = {}
