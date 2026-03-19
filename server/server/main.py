import asyncio
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from loguru import logger
from slowapi.errors import RateLimitExceeded

from common.database.mongodb import get_mongodb
from server.api.auth import router as auth_router
from server.api.connection.connections import router as connections_router
from server.api.execution_history import router as execution_history_router
from server.api.facebook.ads import router as facebook_ads_router
from server.api.facebook.facebook_fields import router as facebook_fields_router
from server.api.facebook.oauth import router as facebook_oauth_router
from server.api.google.ads import router as google_ads_fields
from server.api.google.bigquery import router as google_bigquery_router
from server.api.google.oauth import router as google_oauth
from server.api.google.sheets import router as google_sheets_router
from server.api.tiktok.ads import router as tiktok_ads_router
from server.api.tiktok.oauth import router as tiktok_oauth_router
from server.api.tiktok.tiktok_fields import router as tiktok_fields_router
from server.api.workflow import router as workflow_router
from server.change_stream import start_change_stream
from server.configs.adapter import init_settings
from server.configs.config import settings
from server.consumer import sse_manager
from server.middleware import (
    AuthContextMiddleware,
    CSRFMiddleware,
    SecurityHeadersMiddleware,
    limiter,
    rate_limit_exceeded_handler,
)

init_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup - use MongoDB Change Streams instead of Pub/Sub
    stream_task = asyncio.create_task(start_change_stream())
    yield
    # Shutdown
    stream_task.cancel()
    try:
        await stream_task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

origins = settings.cors_origins

# CORS middleware - must be first for preflight requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-CSRF-Token",
        "X-Request-ID",
        "Accept",
        "Origin",
    ],
    expose_headers=["X-CSRF-Token", "X-Request-ID"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Security headers middleware - adds security headers to all responses
app.add_middleware(SecurityHeadersMiddleware)

# CSRF protection middleware - validates CSRF tokens for state-changing requests
app.add_middleware(CSRFMiddleware)

# Auth context middleware - sets current user for each request
app.add_middleware(AuthContextMiddleware)

app.include_router(auth_router)
app.include_router(workflow_router)
app.include_router(execution_history_router)
app.include_router(google_bigquery_router)
app.include_router(google_oauth)
app.include_router(facebook_oauth_router)
app.include_router(facebook_ads_router)
app.include_router(google_ads_fields)
app.include_router(google_sheets_router)
app.include_router(connections_router)
app.include_router(facebook_fields_router)
app.include_router(tiktok_oauth_router)
app.include_router(tiktok_fields_router)
app.include_router(tiktok_ads_router)


# Health endpoints
health_router = APIRouter()


@health_router.get("/healthz")
async def healthz():
    """Liveness probe - is the process running?"""
    return {"status": "ok"}


@health_router.get("/readyz")
async def readyz():
    """Readiness probe - can the service handle requests?"""
    checks = {}

    # MongoDB check
    try:
        db = get_mongodb()
        # Ping the database
        db.client.admin.command("ping")
        checks["mongodb"] = "ok"
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        checks["mongodb"] = "error"

    # Overall status
    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "not_ready",
            "checks": checks,
        },
    )


app.include_router(health_router)


@app.get("/stream/{workflow_id}")
async def stream(workflow_id: str):
    return StreamingResponse(
        sse_manager.connect(workflow_id), media_type="text/event-stream"
    )
