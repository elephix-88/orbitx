import asyncio
import os

from dagster import Definitions
from loguru import logger

engine_root = os.path.join(os.path.dirname(__file__), "..", "..", "engine")
if os.path.isdir(engine_root):
    os.chdir(engine_root)

from engine.configs.adapter import init_settings

init_settings()

from common.database.mongodb import get_mongodb
from engine.configs.config import settings
from common.model.workflow import WorkflowData
from dagster_orbitx.graph_builder import build_workflow_job
from dagster_orbitx.jobs.workflow_executor import sanitize_dagster_name
from dagster_orbitx.schedules import build_workflow_schedule


def load_all_workflows() -> list[WorkflowData]:
    async def fetch() -> list[WorkflowData]:
        mongodb = get_mongodb()
        results = await mongodb.get_all_documents(
            collection_name=settings.workflow_collection,
            query={},
        )
        return [WorkflowData(**doc) for doc in results]

    try:
        return asyncio.run(fetch())
    except Exception as error:
        logger.warning(f"Failed to load workflows from MongoDB: {error}")
        return []


def deduplicate_name(name: str, seen: set[str]) -> str:
    if name not in seen:
        seen.add(name)
        return name

    counter = 2
    while f"{name}_{counter}" in seen:
        counter += 1

    deduplicated = f"{name}_{counter}"
    seen.add(deduplicated)
    return deduplicated


def build_definitions() -> Definitions:
    workflows = load_all_workflows()
    logger.info(f"Loaded {len(workflows)} workflows from MongoDB")

    jobs = []
    schedules = []
    seen_names: set[str] = set()

    for workflow in workflows:
        if not workflow.id:
            continue

        job_name = deduplicate_name(sanitize_dagster_name(workflow.job_name), seen_names)

        try:
            job_definition = build_workflow_job(workflow, job_name)
            jobs.append(job_definition)
            logger.info(f"Job '{job_name}' → '{workflow.job_name}'")
        except Exception as error:
            logger.error(f"Failed to build job for '{workflow.job_name}': {error}")
            continue

        schedule_definition = build_workflow_schedule(workflow, job_name)
        if schedule_definition:
            schedules.append(schedule_definition)
            logger.info(f"Schedule '{job_name}' cron='{workflow.schedule_expression}'")

    logger.info(f"Built {len(jobs)} jobs, {len(schedules)} schedules")
    return Definitions(jobs=jobs, schedules=schedules)


definitions = build_definitions()
