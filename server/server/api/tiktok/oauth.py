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
from common.model.token import TikTokConnectionParams
from server.configs.config import settings
from server.middleware import limiter
from server.services.auth.context import get_current_user
from server.services.oauth_utils import verify_state
from server.services.tiktok.oauth import build_tiktok_oauth_url, save_to_mongo
from server.services.utils import generate_uuid

router = APIRouter(prefix="/api/tiktok", tags=["tiktok"])


@router.post("/login", response_model=OAuthLoginResponse)
@limiter.limit(settings.rate_limit_auth)
async def login(request: Request, payload: ConnectionNamePayload):
    user = get_current_user()
    connection_id = generate_uuid()

    url = build_tiktok_oauth_url(
        connection_type=ConnectionType.SOURCE.value,
        connection_id=connection_id,
        service_name=ServiceName.TIKTOK_ADS.value,
        connection_name=payload.connection_name,
        user_id=user.id,
    )
    return OAuthLoginResponse(
        oauth_url=url,
        connection_id=connection_id,
        message="Redirect user to this URL to authorize TikTok Ads",
    )


@router.get("/oauth2callback")
async def oauth2callback(auth_code: str | None = None, state: str | None = None):
    """TikTok uses auth_code (not code) in the callback URL."""
    if not auth_code or not state:
        raise HTTPException(status_code=400, detail="Missing auth_code/state")

    try:
        result = verify_state(state)
        connection = ConnectionKey(**result)

        payload = {
            "app_id": str(settings.tiktok_app_id or ""),
            "secret": str(settings.tiktok_app_secret or ""),
            "auth_code": auth_code,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                settings.tiktok_token_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            response_data = resp.json()

        # TikTok API returns 200 with error in body: {"code": 40001, "message": "..."}
        if response_data.get("code") != 0:
            raise ValueError(
                f"TikTok API error: {response_data.get('message', 'Unknown error')}"
            )

        token_data = response_data.get("data", {})

        tiktok_params = TikTokConnectionParams(
            access_token=token_data["access_token"],
            advertiser_ids=token_data.get("advertiser_ids", []),
            token_type="bearer",
            expires_in=token_data.get("expires_in"),
            refresh_token=token_data.get("refresh_token"),
        )

        await save_to_mongo(connection=connection, tokens=tiktok_params)

        provider = connection.service_name.lower()
        redirect_url = f"{settings.frontend_oauth_success_url}?provider={provider}"
        return RedirectResponse(url=redirect_url)
    except ValueError as e:
        logger.error(
            f"OAuth callback state/token verification failed: {e}"
        )
        raise HTTPException(
            status_code=400, detail="Invalid or expired OAuth state"
        ) from e
    except httpx.HTTPStatusError as e:
        logger.error(f"OAuth token exchange failed: {e}")
        raise HTTPException(
            status_code=502, detail="Token exchange with provider failed"
        ) from e
