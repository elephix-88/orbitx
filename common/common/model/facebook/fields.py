from pydantic import BaseModel

from common.model.common import BaseFieldSchema


class Endpoints(BaseModel):
    insights: str | None = None
    actions: str | None = None
    action_values: str | None = None
    conversions: str | None = None
    breakdowns: str | None = None
    campaigns: str | None = None
    ads: str | None = None


class FacebookField(BaseFieldSchema):
    display_name: str | None = None
    group: str
    is_primary_key: bool
    active: bool = True
    endpoints: Endpoints
    action_type: str | None = None
