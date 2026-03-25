from common.model.workflow import WorkflowData
from dagster import DefaultScheduleStatus, ScheduleDefinition


def build_workflow_schedule(
    workflow: WorkflowData, job_name: str
) -> ScheduleDefinition | None:
    """Build a Dagster schedule from a workflow's schedule configuration.

    Uses ScheduleConfig if present (with timezone and enabled flag).
    Falls back to the legacy schedule_expression field for backward compatibility.
    """
    if workflow.schedule:
        if not workflow.schedule.enabled:
            return None

        cron = workflow.schedule.cron_expression.strip()
        if not cron:
            return None

        return ScheduleDefinition(
            name=f"{job_name}_schedule",
            job_name=job_name,
            cron_schedule=cron,
            execution_timezone=workflow.schedule.timezone,
            default_status=DefaultScheduleStatus.RUNNING,
            tags={
                "workflow_id": workflow.id,
                "user_id": workflow.user_id,
            },
        )

    if not workflow.schedule_expression or not workflow.schedule_expression.strip():
        return None

    return ScheduleDefinition(
        name=f"{job_name}_schedule",
        job_name=job_name,
        cron_schedule=workflow.schedule_expression,
        default_status=DefaultScheduleStatus.RUNNING,
        tags={
            "workflow_id": workflow.id,
            "user_id": workflow.user_id,
        },
    )
