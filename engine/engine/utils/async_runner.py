"""Shared persistent event loop for all engine async operations.

Motor caches the event loop on first operation. If we use multiple
asyncio.run() calls (which each create and close a new loop), Motor
fails with "Event loop is closed". This module provides a single
persistent loop that stays alive for the entire engine subprocess.
"""

import asyncio
import threading
from collections.abc import Coroutine
from typing import Any

_loop: asyncio.AbstractEventLoop | None = None
_thread: threading.Thread | None = None


def _ensure_loop() -> asyncio.AbstractEventLoop:
    global _loop, _thread

    if _loop is not None and _loop.is_running():
        return _loop

    _loop = asyncio.new_event_loop()

    def run() -> None:
        asyncio.set_event_loop(_loop)
        _loop.run_forever()

    _thread = threading.Thread(target=run, daemon=True, name="engine-async-loop")
    _thread.start()

    return _loop


def run_async(coroutine: Coroutine, timeout: float = 120) -> Any:
    """Run an async coroutine on the persistent engine loop.

    Use this instead of asyncio.run() everywhere in the engine to
    avoid Motor event-loop conflicts.
    """
    loop = _ensure_loop()
    future = asyncio.run_coroutine_threadsafe(coroutine, loop)
    return future.result(timeout=timeout)
