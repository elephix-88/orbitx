import asyncio
import os
import time
from datetime import datetime, timezone

import httpx
from loguru import logger

from common.database.mongodb import close_mongodb, get_mongodb
from common.model.error_trigger import ErrorPayload
from dagster import HookContext, failure_hook, success_hook
from dagster_orbitx.services.execution_persistence import (
    set_execution_ttl,
)

ORBITX_SERVER_URL = os.environ.get(
    "ORBITX_SERVER_URL", "http://localhost:8000"
)
TRIGGER_ERROR_TIMEOUT_SECONDS = 30
WORKFLOW_COLLECTION = "workflow"
EXECUTION_TTL_DAYS = 7
EXECUTION_TTL_SECONDS = EXECUTION_TTL_DAYS * 86400


def _get_run_tags(context: HookContext) -> dict[str, str]:
    """Fetch run tags from the Dagster instance.

    HookContext doesn't expose run_tags directly — must go through
    the instance API.
    """
    run = context.instance.get_run_by_id(context.run_id)
    return run.tags if run else {}


@success_hook
def on_workflow_success(context: HookContext) -> None:
    tags = _get_run_tags(context)
    workflow_id = tags.get("workflow_id", "unknown")
    user_id = tags.get("user_id", "unknown")
    logger.success(
        f"Run completed — workflow={workflow_id} user={user_id}"
    )

    _set_ttl_on_execution(context.run_id)


@failure_hook
def on_workflow_failure(context: HookContext) -> None:
    tags = _get_run_tags(context)
    workflow_id = tags.get("workflow_id", "unknown")
    user_id = tags.get("user_id", "unknown")
    workflow_name = tags.get("workflow_name", "unknown")

    logger.error(
        f"Run failed — workflow={workflow_id} user={user_id}"
    )

    _set_ttl_on_execution(context.run_id)

    is_error_workflow = tags.get(
        "is_error_workflow", "false"
    )
    if is_error_workflow == "true":
        logger.info(
            f"Workflow {workflow_id} is itself an error workflow — "
            f"skipping error workflow trigger to prevent loops"
        )
        return

    try:
        error_workflow_id = _lookup_error_workflow_id(workflow_id)
    except Exception as error:
        logger.warning(
            f"Failed to look up error_workflow_id for "
            f"workflow {workflow_id}: {error}"
        )
        return

    if not error_workflow_id:
        return

    failed_node_name = _extract_failed_node_name(context)
    error_message = _extract_error_message(context)

    payload = ErrorPayload(
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        execution_id=context.run_id,
        failed_node=failed_node_name,
        error_message=error_message,
        timestamp=time.time(),
    )

    try:
        _trigger_error_workflow(
            error_workflow_id, payload, workflow_id
        )
        logger.info(
            f"Triggering error workflow {error_workflow_id} "
            f"for failed workflow {workflow_id}"
        )
    except Exception as error:
        logger.error(
            f"Failed to trigger error workflow "
            f"{error_workflow_id} for workflow {workflow_id}: "
            f"{error}"
        )


def _extract_failed_node_name(context: HookContext) -> str | None:
    """Extract the name of the failed op from the hook context."""
    try:
        return context.op.name
    except Exception:
        return None


def _extract_error_message(context: HookContext) -> str:
    """Extract the error message from the hook context."""
    try:
        exception = context.op_exception
        if exception:
            return str(exception)
    except Exception:
        pass
    return "Unknown error"


def _lookup_error_workflow_id(
    workflow_id: str,
) -> str | None:
    """Read the workflow from MongoDB to check if error_workflow_id is set."""

    async def query() -> str | None:
        mongodb = get_mongodb()
        collection = mongodb.get_collection(WORKFLOW_COLLECTION)
        document = await collection.find_one(
            {"_id": workflow_id},
            {"error_workflow_id": 1},
        )
        if not document:
            return None
        return document.get("error_workflow_id")

    try:
        return asyncio.run(query())
    finally:
        close_mongodb()


def _trigger_error_workflow(
    error_workflow_id: str,
    payload: ErrorPayload,
    caller_workflow_id: str,
) -> None:
    """Call the server's trigger-error endpoint to launch the error workflow.

    Uses the server API so that loop prevention logic in the endpoint
    is enforced.
    """
    url = (
        f"{ORBITX_SERVER_URL}/api/workflows/"
        f"{error_workflow_id}/trigger-error"
    )

    request_body = {
        "error_payload": payload.model_dump(),
        "caller_workflow_id": caller_workflow_id,
    }

    response = httpx.post(
        url,
        json=request_body,
        timeout=TRIGGER_ERROR_TIMEOUT_SECONDS,
    )
    response.raise_for_status()


def _set_ttl_on_execution(run_id: str) -> None:
    """Set the TTL expiry timestamp on the execution document."""
    ttl_expires_at = datetime.fromtimestamp(
        time.time() + EXECUTION_TTL_SECONDS, tz=timezone.utc
    )
    try:
        asyncio.run(set_execution_ttl(run_id, ttl_expires_at))
    except Exception as error:
        logger.warning(
            f"Failed to set TTL on execution {run_id}: {error}"
        )
    finally:
        close_mongodb()
