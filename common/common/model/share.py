from datetime import UTC, datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(UTC)


class ShareToken(BaseModel):
    token: UUID = Field(default_factory=uuid4)
    workflow_id: str
    user_id: str
    execution_id: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime | None = None
    is_revoked: bool = False
    label: str | None = None
