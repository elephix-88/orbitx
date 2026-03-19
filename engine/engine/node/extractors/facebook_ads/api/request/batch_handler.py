import asyncio

from loguru import logger

from engine.node.extractors.facebook_ads.api.client import parse_batch_item, post_batch
from engine.utils.logger import log_progress
from engine.utils.utils import ProgressCounter, chunked
from common.model.facebook.request import BatchPlan
from common.model.facebook.response import BatchItem, BatchResponseBase


async def send_batch_request(
    batch_plans: list[BatchPlan],
    access_token: str,
    max_batch_size: int,
    max_workers: int,
) -> list[BatchItem]:
    """Split batch_plans into batches, send requests to Facebook API concurrently."""
    batch_plans = list(batch_plans)
    batches = list(chunked(batch_plans, max_batch_size))

    logger.info(
        f"Processing {len(batch_plans)} requests in {len(batches)} batches (max_workers={max_workers})"
    )
    all_batch_items: list[BatchItem] = []
    progress = ProgressCounter(total=len(batches))

    # Use semaphore to limit concurrency
    semaphore = asyncio.Semaphore(max_workers)

    async def process_batch(batch: list[BatchPlan], batch_num: int) -> list[BatchResponseBase]:
        async with semaphore:
            return await _process_batch(batch, access_token, batch_num)

    tasks = [
        process_batch(batch, batch_num)
        for batch_num, batch in enumerate(batches, 1)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for batch_num, result in enumerate(results, 1):
        if isinstance(result, Exception):
            progress.mark_failed()
            logger.error(f"Batch {batch_num} failed with error: {result}")
            raise result

        batch_results = result
        progress.mark_success()
        logger.success(
            f"Batch {batch_num} completed: {len(batch_results)} responses"
        )
        for response in batch_results:
            batch_item = BatchItem(
                tag=response.tag,
                type=response.type,
                report_run_id=getattr(response, "report_run_id", None),
                data=getattr(response, "data", None),
                status=response.status,
            )
            all_batch_items.append(batch_item)

    logger.success(f"Completed processing {len(all_batch_items)} batch items")
    log_progress(
        progress.success,
        progress.total,
        "Batch Processing",
        failed_count=progress.failed,
        is_final=True,
    )
    return all_batch_items


async def _process_batch(
    batch: list[BatchPlan], access_token: str, batch_num: int
) -> list[BatchResponseBase]:
    """Send a batch of requests to Facebook API and parse responses."""
    raw_items = await post_batch(access_token, batch)
    return [
        parse_batch_item(raw, plan, batch_num, i)
        for i, (raw, plan) in enumerate(zip(raw_items, batch), 1)
    ]
