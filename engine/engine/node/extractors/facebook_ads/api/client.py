import json
from typing import Any, cast

import httpx
from loguru import logger

from common.model.facebook.common import ExecutionMode
from common.model.facebook.request import BatchPlan, RawBatchItem
from common.model.facebook.response import (
    BatchResponseBase,
    ErrorResponse,
    InsightsAsyncResponse,
    SyncResponse,
)
from engine.configs.config import settings

API_ROOT = f"{settings.facebook_api_base_url}{settings.facebook_api_version}/"


async def post_batch(
    access_token: str,
    batch_items: list[RawBatchItem | dict[str, str]],
    timeout: int = settings.request_timeout,
) -> list[dict[str, str]]:
    """Send a batch request to Facebook Graph API root (form-encoded)."""
    normalized = [
        (item.model_dump() if hasattr(item, "model_dump") else item)
        for item in batch_items
    ]
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            API_ROOT,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={"access_token": access_token, "batch": json.dumps(normalized)},
        )
    if response.status_code != 200:
        raise Exception(f"Batch request failed: {response.text}")
    return cast(list[dict[str, str]], response.json())


def parse_batch_item(
    raw_item: dict[str, str],
    plan: BatchPlan,
    batch_num: int,
    request_num: int,
) -> BatchResponseBase:
    """Parse one raw batch item dict and return a BatchResponseBase object."""
    raw = RawBatchItem.model_validate(raw_item)

    if raw.code != 200:
        logger.error(
            {
                "event": "batch_request_failed",
                "batch_num": batch_num,
                "request_num": request_num,
                "tag": plan.tag,
                "status": raw.code,
                "body": raw.body,
            }
        )
        return ErrorResponse(
            type=ExecutionMode.ERROR, tag=plan.tag, status=raw.code, body=raw.body
        )

    response_data: dict[str, str] | None
    try:
        response_data = json.loads(raw.body)
    except Exception:
        response_data = None

    if response_data is None:
        return ErrorResponse(
            type=ExecutionMode.ERROR,
            tag=plan.tag,
            status=raw.code,
            body="Invalid JSON response",
        )

    if isinstance(response_data, dict) and "report_run_id" in response_data:
        return InsightsAsyncResponse(
            type=ExecutionMode.ASYNC,
            tag=plan.tag,
            status=raw.code,
            report_run_id=response_data["report_run_id"],
        )
    if isinstance(response_data, dict):
        if "data" in response_data and isinstance(response_data["data"], list):
            normalized = response_data["data"]
        else:
            normalized = [response_data]
    elif isinstance(response_data, list):
        normalized = response_data
    else:
        logger.warning(
            f"Unknown response format for tag={plan.tag}: {type(response_data)}"
        )
        normalized = []

    return SyncResponse(
        type=ExecutionMode.SYNC,
        tag=plan.tag,
        status=raw.code,
        data=normalized,
    )


async def get_report_status(report_run_id: str, access_token: str) -> str:
    """Check async report status."""
    url = f"{API_ROOT}{report_run_id}"
    params = {"access_token": access_token}
    timeout = settings.request_timeout
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(url, params=params)
    if resp.status_code != 200:
        logger.error(f"Failed to check report status: {resp.status_code}")
        raise Exception(f"Error checking report {report_run_id}: {resp.status_code}")
    return str(resp.json().get("async_status", "unknown"))


async def fetch_insights_paged(
    report_run_id: str, access_token: str
) -> list[dict[str, Any]]:
    """Fetch insights data for a report_run_id, following pagination."""
    url: str | None = f"{API_ROOT}{report_run_id}/insights"
    params: dict[str, Any] = {"access_token": access_token, "limit": 1000}
    timeout = settings.request_timeout
    all_data: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=timeout) as client:
        while url:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                body = resp.text[:500]
                logger.error(
                    f"Failed to fetch insights for report {report_run_id}: "
                    f"status={resp.status_code}, body={body}"
                )
                raise Exception(f"Error fetching report data: {resp.status_code}")
            result = resp.json()
            current_page_data = result.get("data", [])
            all_data.extend(current_page_data)

            next_url = result.get("paging", {}).get("next")
            if next_url:
                url = next_url
                params = {}
            else:
                url = None

    return all_data
