from dagster import DefaultScheduleStatus, ScheduleDefinition

from common.model.workflow import WorkflowData


def build_workflow_schedule(
    workflow: WorkflowData, job_name: str
) -> ScheduleDefinition | None:
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
