import time
from collections.abc import Callable

from loguru import logger

SKIP_PATHS = {"/health", "/ping", "/metrics"}


class RequestLoggingMiddleware:
    def __init__(self, app: Callable):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path in SKIP_PATHS:
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "")
        start_time = time.perf_counter()
        status_code = 500

        async def send_with_logging(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        await self.app(scope, receive, send_with_logging)

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        if status_code < 400:
            logger.success(f"{method} {path} → {status_code} ({elapsed_ms:.0f}ms)")
        elif status_code < 500:
            logger.warning(f"{method} {path} → {status_code} ({elapsed_ms:.0f}ms)")
        else:
            logger.error(f"{method} {path} → {status_code} ({elapsed_ms:.0f}ms)")
