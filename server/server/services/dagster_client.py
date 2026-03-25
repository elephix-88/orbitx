import re

from dagster_graphql import DagsterGraphQLClient
from loguru import logger

from server.configs.config import settings

_client: DagsterGraphQLClient | None = None


def get_dagster_client() -> DagsterGraphQLClient:
    global _client
    if _client is None:
        hostname = settings.get("dagster_host", "dagster")
        port = settings.get("dagster_port", 3000)
        _client = DagsterGraphQLClient(hostname=hostname, port_number=port)
    return _client


def sanitize_dagster_name(name: str) -> str:
    sanitized = re.sub(r"[^A-Za-z0-9_]", "_", name)
    sanitized = re.sub(r"_+", "_", sanitized).strip("_").lower()
    return sanitized or "unnamed"


def launch_run(
    workflow_id: str,
    workflow_name: str,
    run_type: str,
    user_id: str,
) -> str | None:
    job_name = sanitize_dagster_name(workflow_name)

    try:
        run_id = get_dagster_client().submit_job_execution(
            job_name=job_name,
            run_config={
                "ops": {
                    "execute_workflow_op": {
                        "config": {
                            "workflow_id": workflow_id,
                            "run_type": run_type,
                        }
                    }
                }
            },
            tags={
                "workflow_id": workflow_id,
                "user_id": user_id,
                "run_type": run_type,
            },
        )
        logger.info(f"Dagster run {run_id} launched for job={job_name}")
        return run_id

    except Exception as error:
        logger.error(f"Failed to launch Dagster run for job={job_name}: {error}")
        return None


def get_run_status(run_id: str) -> str | None:
    try:
        status = get_dagster_client().get_run_status(run_id)
        return status.value

    except Exception as error:
        logger.error(f"Failed to get run status for {run_id}: {error}")
        return None


def reload_code_location() -> bool:
    try:
        get_dagster_client().reload_repository_location("dagster_orbitx.definitions")
        logger.info("Dagster code location reloaded")
        return True

    except Exception as error:
        logger.error(f"Failed to reload Dagster code location: {error}")
        return False
