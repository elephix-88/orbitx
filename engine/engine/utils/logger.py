import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from loguru import logger


@asynccontextmanager
async def execution_timer(label: str) -> AsyncGenerator[None, None]:
    start = time.perf_counter()
    logger.info(f"Starting: {label}")
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        logger.info(f"Completed: {label} ({elapsed:.2f}s)")


def log_progress(
    current: int,
    total: int,
    operation_name: str,
    unit: str = "",
    interval: int = 10,
    include_first_last: bool = False,
    failed_count: int = 0,
    is_final: bool = False,
) -> bool:
    if is_final:
        total_attempted = current + failed_count
        success_percentage = (
            (current / total_attempted * 100) if total_attempted > 0 else 0
        )
        logger.info(
            f"{operation_name} Success Rate: {current}/{total_attempted} "
            f"({success_percentage:.1f}%) - Failed: {failed_count}"
        )
        return True
    else:
        should_log = (
            current % interval == 0
            or current == total
            or (include_first_last and current == 1)
        )

        if should_log:
            progress_percentage = (current / total * 100) if total > 0 else 0
            unit_text = f" {unit}" if unit else ""
            logger.info(
                f"{operation_name}: {current}/{total} ({progress_percentage:.1f}%){unit_text}"
            )
            return True

        return False
