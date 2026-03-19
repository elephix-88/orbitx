from typing import Literal

from pydantic import BaseModel

from common.model.facebook.common import TimeRange


class BatchPlan(BaseModel):
    method: Literal["GET", "POST"]
    relative_url: str
    tag: str


class BatchPlannerConfig(BaseModel):
    primary_key: list[str]
    level: str
    max_batch_size: int


class InsightsUrlParams(BaseModel):
    account: str
    fields: set[str]
    time_range: TimeRange
    level: str
    time_increment: int
    actions: set[str] | None = None
    action_values: set[str] | None = None
    conversions: set[str] | None = None
    breakdowns: set[str] | None = None
    action_type: set[str] | None = None


class RawBatchItem(BaseModel):
    code: int
    body: str
