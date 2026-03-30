import asyncio
from typing import Any, TypedDict

from loguru import logger

from common.model.facebook.common import ExecutionMode
from common.model.facebook.response import BatchItem, ReportMeta
from engine.configs.config import settings
from engine.node.extractors.facebook_ads.api.client import (
    fetch_insights_paged,
    get_report_status,
)
from engine.utils.logger import log_progress
from engine.utils.retry import calculate_backoff_with_jitter
from engine.utils.utils import ProgressCounter


class BatchProcessResultDict(TypedDict):
    data_by_tag: dict[str, list[dict[str, Any]]]


async def wait_for_all_reports(
    reports: list[ReportMeta],
    access_token: str,
    timeout: int = settings.report_wait_timeout,
    interval: int = settings.retry_delay,
) -> list[ReportMeta]:
    pending = reports.copy()
    completed: list[ReportMeta] = []

    total_reports = len(reports)
    progress = ProgressCounter(total_reports)
    last_success_count = 0
    poll_attempt = 0

    logger.info(f"Waiting for {total_reports} reports to complete")
    import time
    start = time.time()

    while pending and (time.time() - start < timeout):
        poll_attempt += 1
        next_round: list[ReportMeta] = []
        for report in pending:
            status = await get_report_status(report.report_run_id, access_token)

            if status == "Job Completed":
                completed.append(report)
                progress.mark_success()
                logger.success(f"Report {report.report_run_id} completed")
            elif status in ("Job Failed", "Job Skipped"):
                progress.mark_failed()
                logger.error(f"Report {report.report_run_id} failed/skipped")
            else:
                next_round.append(report)

        if progress.success != last_success_count and log_progress(
            progress.success,
            total_reports,
            "Async reports",
            "completed",
            interval=10,
            include_first_last=True,
        ):
            last_success_count = progress.success

        pending = next_round
        if pending:
            sleep_time = calculate_backoff_with_jitter(poll_attempt, interval)
            await asyncio.sleep(sleep_time)

    if pending:
        progress.mark_failed(len(pending))
        logger.warning(
            f"{len(pending)} reports did not complete within {timeout}s timeout"
        )

    log_progress(
        progress.success,
        len(reports),
        "Report Processing",
        failed_count=progress.failed,
        is_final=True,
    )

    return completed


async def process_facebook_batch_result(
    batch_results: list[BatchItem], access_token: str
) -> BatchProcessResultDict:
    logger.info("Starting batch results processing")

    async_reports = [
        ReportMeta(report_run_id=r.report_run_id, tag=r.tag)
        for r in batch_results
        if r.type == ExecutionMode.ASYNC
    ]

    logger.info(f"Found {len(async_reports)} reports requiring follow-up fetch")
    completed_reports = await wait_for_all_reports(async_reports, access_token)

    result_by_tag: dict[str, list[dict[str, Any]]] = {}

    for item in batch_results:
        if item.type == ExecutionMode.SYNC and item.data is not None:
            rows = item.data if isinstance(item.data, list) else [item.data]
            result_by_tag[item.tag] = rows
    if completed_reports:
        result_rows = await _process_async_reports_parallel(
            completed_reports, access_token
        )
        result_by_tag.update(result_rows)

    total_rows = sum(len(v) for v in result_by_tag.values())
    logger.success(
        f"Collected {total_rows:,} rows across {len(result_by_tag)} tags from reports"
    )

    return {"data_by_tag": result_by_tag}


async def _fetch_single_report(
    report: ReportMeta, access_token: str
) -> tuple[str, str, list[dict[str, Any]]]:
    data = await fetch_insights_paged(report.report_run_id, access_token)
    return report.report_run_id, report.tag, data


async def _process_async_reports_parallel(
    completed_reports: list[ReportMeta],
    access_token: str,
    max_workers: int = settings.max_workers,
) -> dict[str, list[dict[str, Any]]]:
    result_rows: dict[str, list[dict[str, Any]]] = {}
    total_reports = len(completed_reports)
    progress = ProgressCounter(total=total_reports)

    logger.info(f"Fetching data for {total_reports} completed async reports")

    tasks = [
        _fetch_single_report(report, access_token)
        for report in completed_reports
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for report, result in zip(completed_reports, results, strict=False):
        if isinstance(result, Exception):
            progress.mark_failed()
            logger.error(f"Failed to process async report {report.tag}: {result}")
            continue

        _, tag, data = result
        result_rows[tag] = data
        progress.mark_success()

        log_progress(
            progress.completed(),
            total_reports,
            "Data fetched",
            "reports",
            interval=10,
            include_first_last=True,
        )

    logger.success(f"Completed parallel processing of {len(result_rows)} reports")
    return result_rows
