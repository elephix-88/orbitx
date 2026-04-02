import os
import time
from datetime import UTC, datetime

import httpx
from loguru import logger

from common.database.mongodb import find_one
from common.model.error_trigger import ErrorPayload
from engine.orchestration.persistence import (
    finalize_execution_sync,
    set_execution_ttl,
)
from engine.utils.async_runner import run_async

ORBITX_SERVER_URL = os.environ.get("ORBITX_SERVER_URL", "http://localhost:8000")
INTERNAL_SERVICE_KEY = os.environ.get("INTERNAL_SERVICE_KEY", "")
WORKFLOW_COLLECTION = "workflow"
TRIGGER_ERROR_TIMEOUT_SECONDS = 30

EXECUTION_TTL_DAYS = 7
EXECUTION_TTL_SECONDS = EXECUTION_TTL_DAYS * 86400


def on_flow_completion(flow, flow_run, state) -> None:
    parameters = flow_run.parameters or {}
    execution_id = parameters.get("execution_id", "unknown")
    workflow_id = parameters.get("workflow_id", "unknown")
    user_id = parameters.get("user_id", "unknown")

    logger.success(f"Run completed — workflow={workflow_id} user={user_id}")

    finalize_execution_sync(execution_id=execution_id, end_time=time.time())
    _set_ttl_on_execution(execution_id)


def on_flow_failure(flow, flow_run, state) -> None:
    parameters = flow_run.parameters or {}
    execution_id = parameters.get("execution_id", "unknown")
    workflow_id = parameters.get("workflow_id", "unknown")
    user_id = parameters.get("user_id", "unknown")
    workflow_name = parameters.get("workflow_name", "unknown")

    logger.error(f"Run failed — workflow={workflow_id} user={user_id}")

    finalize_execution_sync(execution_id=execution_id, end_time=time.time())
    _set_ttl_on_execution(execution_id)

    extra_tags = parameters.get("extra_tags") or {}
    is_error_workflow = extra_tags.get("is_error_workflow", "false")
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
            f"Failed to look up error_workflow_id for workflow {workflow_id}: {error}"
        )
        return

    if not error_workflow_id:
        return

    failed_node_name = _extract_failed_node_name(state)
    error_message = _extract_error_message(state)

    payload = ErrorPayload(
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        execution_id=execution_id,
        failed_node=failed_node_name,
        error_message=error_message,
        timestamp=time.time(),
    )

    try:
        _trigger_error_workflow(error_workflow_id, payload, workflow_id)
        logger.info(
            f"Triggering error workflow {error_workflow_id} "
            f"for failed workflow {workflow_id}"
        )
    except Exception as error:
        logger.error(
            f"Failed to trigger error workflow "
            f"{error_workflow_id} for workflow {workflow_id}: {error}"
        )


def _extract_failed_node_name(state) -> str | None:
    try:
        return state.result.task_run.name
    except (AttributeError, TypeError):
        return None


def _extract_error_message(state) -> str:
    try:
        if state.message:
            return state.message
    except (AttributeError, TypeError):
        pass
    return "Unknown error"


def _lookup_error_workflow_id(workflow_id: str) -> str | None:
    async def query() -> str | None:
        document = await find_one(
            WORKFLOW_COLLECTION, workflow_id, projection={"error_workflow_id": 1}
        )
        if not document:
            return None
        return document.get("error_workflow_id")

    return run_async(query())


def _trigger_error_workflow(
    error_workflow_id: str,
    payload: ErrorPayload,
    caller_workflow_id: str,
) -> None:
    url = (
        f"{ORBITX_SERVER_URL}/api/workflows"
        f"/{error_workflow_id}/trigger-error"
    )

    request_body = {
        "error_payload": payload.model_dump(),
        "caller_workflow_id": caller_workflow_id,
    }

    headers = {}
    if INTERNAL_SERVICE_KEY:
        headers["X-Internal-Service-Key"] = INTERNAL_SERVICE_KEY

    response = httpx.post(
        url, json=request_body, headers=headers, timeout=TRIGGER_ERROR_TIMEOUT_SECONDS
    )
    response.raise_for_status()


def _set_ttl_on_execution(execution_id: str) -> None:
    ttl_expires_at = datetime.fromtimestamp(
        time.time() + EXECUTION_TTL_SECONDS, tz=UTC
    )
    try:
        run_async(set_execution_ttl(execution_id, ttl_expires_at))
    except Exception as error:
        logger.warning(
            f"Failed to set TTL on execution {execution_id}: {error}"
        )
