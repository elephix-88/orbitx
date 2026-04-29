from uuid import UUID

from loguru import logger
from prefect import get_client
from prefect.client.schemas.actions import (
    DeploymentScheduleCreate,
    DeploymentScheduleUpdate,
    DeploymentUpdate,
)
from prefect.client.schemas.schedules import CronSchedule

from common.model.workflow import WorkflowData
from server.configs.config import settings
from server.services.exceptions import OrbitXError
from server.services.utils import generate_uuid

WORK_POOL_NAME = settings.get("prefect_work_pool", "orbitx-worker-pool")
FLOW_NAME = "orbitx-workflow"
BASE_DEPLOYMENT_NAME = "manual"
ENTRYPOINT = "engine.orchestration.runner:execute_workflow_flow"


async def register_flow() -> None:
    """Register the base deployment with Prefect server on startup.

    Creates a single deployment called "orbitx-workflow/manual" that the
    Process worker uses to run any workflow. This only needs to happen once —
    subsequent calls are idempotent.
    """
    async with get_client() as client:
        try:
            await client.read_deployment_by_name(f"{FLOW_NAME}/{BASE_DEPLOYMENT_NAME}")
            logger.info("Prefect deployment already registered")
            return
        except Exception:
            pass

        flow_id = await client.create_flow_from_name(FLOW_NAME)

        await client.create_deployment(
            flow_id=flow_id,
            name=BASE_DEPLOYMENT_NAME,
            work_pool_name=WORK_POOL_NAME,
            entrypoint=ENTRYPOINT,
            path="/app",
        )
        logger.success("Prefect deployment registered: orbitx-workflow/manual")


async def launch_run(
    workflow_id: str,
    workflow_name: str,
    run_type: str,
    user_id: str,
    execution_id: str | None = None,
    extra_tags: dict[str, str] | None = None,
) -> str:
    """Submit a workflow run to Prefect. Returns the execution_id."""
    if execution_id is None:
        execution_id = generate_uuid()

    parameters = {
        "workflow_id": workflow_id,
        "workflow_name": workflow_name,
        "execution_id": execution_id,
        "user_id": user_id,
        "run_type": run_type,
    }
    if extra_tags:
        parameters["extra_tags"] = extra_tags

    try:
        async with get_client() as client:
            deployment = await client.read_deployment_by_name(
                f"{FLOW_NAME}/{BASE_DEPLOYMENT_NAME}"
            )
            flow_run = await client.create_flow_run_from_deployment(
                deployment_id=deployment.id,
                parameters=parameters,
                tags=[f"workflow:{workflow_id}", f"user:{user_id}"],
            )

        logger.info(
            f"Prefect flow run {flow_run.id} launched for workflow={workflow_id}"
        )
        return execution_id

    except Exception as error:
        logger.error(
            f"Failed to launch Prefect run for workflow={workflow_id}: {error}"
        )
        raise OrbitXError(
            f"Prefect failed to launch workflow '{workflow_name}': {error}"
        ) from error


async def sync_deployment(workflow: WorkflowData) -> None:
    """Create or update a scheduled deployment for a workflow.

    Only creates a Prefect deployment if the workflow has a cron schedule.
    Manual-only workflows use the base "manual" deployment.
    """
    workflow_id = workflow.id
    schedule_deployment_name = f"{FLOW_NAME}/schedule-{workflow_id}"

    has_schedule = False
    cron_expression = None
    timezone = "Asia/Bangkok"

    if workflow.schedule:
        if workflow.schedule.enabled and workflow.schedule.cron_expression.strip():
            has_schedule = True
            cron_expression = workflow.schedule.cron_expression.strip()
            timezone = workflow.schedule.timezone
    elif workflow.schedule_expression and workflow.schedule_expression.strip():
        has_schedule = True
        cron_expression = workflow.schedule_expression.strip()

    existing_deployment_id = await _find_deployment_id(schedule_deployment_name)

    if not has_schedule:
        if existing_deployment_id:
            await _delete_deployment_by_id(existing_deployment_id)
            logger.info(f"Removed schedule deployment for workflow {workflow_id}")
        return

    cron_schedule = CronSchedule(cron=cron_expression, timezone=timezone)

    if existing_deployment_id:
        try:
            update_schedules = [
                DeploymentScheduleUpdate(schedule=cron_schedule, active=True)
            ]
            async with get_client() as client:
                await client.update_deployment(
                    deployment_id=existing_deployment_id,
                    deployment=DeploymentUpdate(schedules=update_schedules),
                )
            logger.info(
                f"Updated schedule for workflow {workflow_id}: cron='{cron_expression}'"
            )
        except Exception as error:
            logger.warning(
                f"Failed to update schedule for workflow {workflow_id}: {error}"
            )
    else:
        try:
            async with get_client() as client:
                flow_id = await client.create_flow_from_name(FLOW_NAME)
                await client.create_deployment(
                    flow_id=flow_id,
                    name=f"schedule-{workflow_id}",
                    work_pool_name=WORK_POOL_NAME,
                    entrypoint=ENTRYPOINT,
                    path="/app",
                    schedules=[
                        DeploymentScheduleCreate(schedule=cron_schedule, active=True)
                    ],
                    parameters={
                        "workflow_id": workflow_id,
                        "execution_id": "",
                        "user_id": workflow.user_id,
                        "run_type": "all",
                    },
                )
            logger.info(
                f"Created schedule deployment for workflow {workflow_id}: "
                f"cron='{cron_expression}'"
            )
        except Exception as error:
            logger.warning(
                f"Failed to create schedule for workflow {workflow_id}: {error}"
            )


async def delete_deployment(workflow_id: str) -> None:
    """Remove the schedule deployment when a workflow is deleted."""
    schedule_deployment_name = f"{FLOW_NAME}/schedule-{workflow_id}"
    deployment_id = await _find_deployment_id(schedule_deployment_name)
    if deployment_id:
        await _delete_deployment_by_id(deployment_id)
        logger.info(f"Deleted schedule deployment for workflow {workflow_id}")


async def _find_deployment_id(deployment_name: str) -> UUID | None:
    try:
        async with get_client() as client:
            deployment = await client.read_deployment_by_name(deployment_name)
            return deployment.id
    except Exception:
        return None


async def _delete_deployment_by_id(deployment_id: UUID) -> None:
    try:
        async with get_client() as client:
            await client.delete_deployment(deployment_id=deployment_id)
    except Exception as error:
        logger.warning(f"Failed to delete deployment {deployment_id}: {error}")
