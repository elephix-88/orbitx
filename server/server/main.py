import sys
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from slowapi.errors import RateLimitExceeded

from common.database.mongodb import database
from server.api.auth import router as auth_router
from server.api.connection.connections import router as connections_router
from server.api.delivery import router as delivery_router
from server.api.execution_history import router as execution_history_router
from server.api.facebook.ads import router as facebook_ads_router
from server.api.facebook.facebook_fields import (
    router as facebook_fields_router,
)
from server.api.facebook.oauth import router as facebook_oauth_router
from server.api.google.ads import router as google_ads_fields
from server.api.google.bigquery import router as google_bigquery_router
from server.api.google.oauth import router as google_oauth
from server.api.google.sheets import router as google_sheets_router
from server.api.slack.oauth import router as slack_router
from server.api.tiktok.ads import router as tiktok_ads_router
from server.api.tiktok.oauth import router as tiktok_oauth_router
from server.api.tiktok.tiktok_fields import router as tiktok_fields_router
from server.api.workflow import router as workflow_router
from server.configs.config import settings
from server.middleware import (
    AuthContextMiddleware,
    CSRFMiddleware,
    SecurityHeadersMiddleware,
    limiter,
    rate_limit_exceeded_handler,
)
from server.services import prefect_client
from server.services.exceptions import OrbitXError

logger.remove()
logger.add(sys.stdout, colorize=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await prefect_client.register_flow()
    yield


app = FastAPI(
    title="OrbitX API",
    version="0.1.0",
    description="Marketing Data Intelligence Platform",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


@app.exception_handler(OrbitXError)
async def orbitx_error_handler(request: Request, exc: OrbitXError) -> JSONResponse:
    logger.error(f"OrbitX error on {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"data": None, "success": False, "error": exc.message},
    )

origins = settings.cors_origins

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
    max_age=3600,
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware)
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
app.include_router(delivery_router)
app.include_router(slack_router)


health_router = APIRouter()


@health_router.get("/healthz")
async def healthz():
    return {"status": "ok"}


@health_router.get("/readyz")
async def readyz():
    checks = {}

    try:
        await database.client.admin.command("ping")
        checks["mongodb"] = "ok"
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        checks["mongodb"] = "error"

    all_ok = all(v == "ok" for v in checks.values())
    return JSONResponse(
        status_code=200 if all_ok else 503,
        content={
            "status": "ready" if all_ok else "not_ready",
            "checks": checks,
        },
    )


app.include_router(health_router)
