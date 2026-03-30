from common.model.workflow import ScheduleConfig
from server.services.auth.context import get_current_user
from server.services.workflow_field import (
    get_workflow_field,
    remove_workflow_field,
    set_workflow_field,
)

SCHEDULE_FIELD = "schedule"


async def set_workflow_schedule(
    workflow_id: str,
    schedule: ScheduleConfig,
) -> ScheduleConfig:
    """Set or replace the schedule config on a workflow owned by the current user."""
    user = get_current_user()
    return await set_workflow_field(workflow_id, user.id, SCHEDULE_FIELD, schedule)


async def get_workflow_schedule(workflow_id: str) -> ScheduleConfig | None:
    """Get the schedule config for a workflow owned by the current user."""
    user = get_current_user()
    return await get_workflow_field(
        workflow_id, user.id, SCHEDULE_FIELD, ScheduleConfig
    )


async def remove_workflow_schedule(workflow_id: str) -> None:
    """Remove the schedule config from a workflow owned by the current user."""
    user = get_current_user()
    await remove_workflow_field(workflow_id, user.id, SCHEDULE_FIELD)
