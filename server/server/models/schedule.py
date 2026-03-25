from pydantic import BaseModel

from common.model.workflow import ScheduleConfig


class ScheduleResponse(BaseModel):
    workflow_id: str
    schedule: ScheduleConfig | None
