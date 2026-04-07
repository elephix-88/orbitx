from pydantic import BaseModel

from common.model.error_trigger import ErrorPayload


class TriggerErrorRequest(BaseModel):
    error_payload: ErrorPayload
    caller_workflow_id: str


class TriggerErrorResponse(BaseModel):
    triggered: bool
    execution_id: str | None = None
