from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from common.model.facebook.common import ExecutionMode


class FacebookResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    tag: str
    status: int | None = None
    body: str | None = None


class BatchResponseBase(FacebookResponse):
    type: Literal["insights_async", "sync", "error"]
    report_run_id: str | None = None
    data: Any | None = None


class InsightsAsyncResponse(BatchResponseBase):
    type: Literal["insights_async"]
    report_run_id: str
    data: None = None


class SyncResponse(BatchResponseBase):
    type: Literal["sync"]
    data: list[dict[str, Any]] | None = None


class ErrorResponse(BatchResponseBase):
    type: Literal["error"]
    error_message: str | None = None


class BatchItem(BaseModel):
    tag: str
    type: ExecutionMode
    report_run_id: str | None = None
    data: Any | None = None
    status: int | None = None


class ReportMeta(BaseModel):
    report_run_id: str | None = None
    tag: str | None = None
