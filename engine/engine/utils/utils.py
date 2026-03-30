from collections.abc import Iterable, Iterator
from typing import TypeVar

T = TypeVar("T")


def chunked[T](items: Iterable[T], size: int) -> Iterator[list[T]]:
    """Yield lists of up to 'size' items from an iterable."""
    bucket: list[T] = []
    for item in items:
        bucket.append(item)
        if len(bucket) >= size:
            yield bucket
            bucket = []
    if bucket:
        yield bucket


class ProgressCounter:
    """Simple success/failure counter for batch operations."""

    def __init__(self, total: int) -> None:
        self.total = total
        self.success = 0
        self.failed = 0

    def mark_success(self, n: int = 1) -> None:
        self.success += n

    def mark_failed(self, n: int = 1) -> None:
        self.failed += n

    def completed(self) -> int:
        return self.success + self.failed
