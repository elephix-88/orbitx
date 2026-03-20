import time
from enum import Enum

from loguru import logger


class Unit(Enum):
    SECOND = "second"
    MINUTE = "minute"
    HOUR = "hour"


class ExecutionTimer:
    """Measures and logs execution time for operations."""

    def __init__(self, label: str = "Execution") -> None:
        self.label = label
        self.start_time: float | None = None
        self.end_time: float | None = None

    async def start(self) -> None:
        self.start_time = time.perf_counter()
        logger.info(f"{self.label} started...")

    async def stop(self, success: bool = True, error: Exception | None = None) -> None:
        self.end_time = time.perf_counter()
        duration = self.elapsed_time

        if duration >= 3600:
            duration_value = duration / 3600
            unit = Unit.HOUR.value
        elif duration >= 60:
            duration_value = duration / 60
            unit = Unit.MINUTE.value
        else:
            duration_value = duration
            unit = Unit.SECOND.value

        status_text = "SUCCESS" if success else "FAILED"
        logger.info(f"{self.label} took {duration_value:.2f} {unit} ({status_text})")

    @property
    def elapsed_time(self) -> float:
        if self.start_time is None:
            return 0.0
        end = self.end_time if self.end_time is not None else time.perf_counter()
        return end - self.start_time


# Backward compatibility
ExecutionTracker = ExecutionTimer


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
