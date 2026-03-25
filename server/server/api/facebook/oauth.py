import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from loguru import logger

from common.model.connection import (
    ConnectionKey,
    ConnectionNamePayload,
    ConnectionType,
    OAuthLoginResponse,
    ServiceName,
)
from common.model.token import FacebookConnectionParams
from server.configs.config import settings
from server.middleware import limiter
from server.services.auth.context import get_current_user
from server.services.facebook.oauth import build_facebook_oauth_url, save_to_mongo
from server.services.oauth_utils import verify_state
from server.services.utils import generate_uuid

router = APIRouter(prefix="/api/facebook", tags=["facebook"])


@router.post("/login", response_model=OAuthLoginResponse)
@limiter.limit(settings.rate_limit_auth)
async def login(request: Request, payload: ConnectionNamePayload):
    user = get_current_user()
    connection_id = generate_uuid()

    url = build_facebook_oauth_url(
        scope=settings.facebook_scope,
        connection_type=ConnectionType.SOURCE.value,
        connection_id=connection_id,
        service_name=ServiceName.FACEBOOK_ADS.value,
        connection_name=payload.connection_name,
        user_id=user.id,
    )
    return OAuthLoginResponse(
        oauth_url=url,
        connection_id=connection_id,
        message="Redirect user to this URL to authorize Facebook Ads",
    )


@router.get("/oauth2callback")
async def oauth2callback(code: str | None = None, state: str | None = None):
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code/state")
    try:
        result = verify_state(state)
        connection = ConnectionKey(**result)

        params = {
            "client_id": settings.facebook_app_id,
            "redirect_uri": settings.facebook_redirect_uri,
            "client_secret": settings.facebook_app_secret,
            "code": code,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                settings.facebook_oauth_token_url, params=params
            )
            resp.raise_for_status()
            token_data = resp.json()

        fb_params = FacebookConnectionParams(
            access_token=token_data["access_token"],
            token_type=token_data.get("token_type", "bearer"),
            expires_in=token_data.get("expires_in", 0),
        )

        await save_to_mongo(connection=connection, tokens=fb_params)

        provider = connection.service_name.lower()
        redirect_url = f"{settings.frontend_oauth_success_url}?provider={provider}"
        return RedirectResponse(url=redirect_url)
    except ValueError as e:
        logger.error(f"OAuth callback state verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state") from e
    except httpx.HTTPStatusError as e:
        logger.error(f"OAuth token exchange failed: {e}")
        raise HTTPException(status_code=502, detail="Token exchange with provider failed") from e
