"""Retry utilities for transient failures."""

import random
from collections.abc import Callable
from typing import Any, TypeVar

from loguru import logger
from tenacity import (
    Retrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

T = TypeVar("T")

# Transient exceptions that warrant retry
TRANSIENT_EXCEPTIONS = (
    ConnectionError,
    TimeoutError,
    OSError,
)


async def with_retry(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """Execute an async function with retry logic for transient failures.

    Retries up to 3 times with exponential backoff (1-30s) and jitter.
    Only retries on transient network/connection errors.
    """
    retryer = Retrying(
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=1, max=30),
        retry=retry_if_exception_type(TRANSIENT_EXCEPTIONS),
        reraise=True,
    )

    for attempt in retryer:
        with attempt:
            result = await func(*args, **kwargs)
            if attempt.retry_state.attempt_number > 1:
                logger.info(
                    f"Succeeded after {attempt.retry_state.attempt_number} attempts"
                )
            return result

    # This should never be reached due to reraise=True
    raise RuntimeError("Retry loop exited unexpectedly")


def calculate_backoff_with_jitter(
    attempt: int, base_interval: float, max_interval: float = 60.0
) -> float:
    """Calculate exponential backoff with jitter to avoid thundering herd."""
    backoff: float = min(base_interval * (2 ** (attempt - 1)), max_interval)
    jitter: float = backoff * random.uniform(-0.3, 0.3)
    return float(max(1.0, backoff + jitter))
