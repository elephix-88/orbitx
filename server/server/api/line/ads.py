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
from common.model.token import LineConnectionParams
from server.configs.config import settings
from server.middleware import limiter
from server.services.auth.context import get_current_user
from server.services.line.ads import LineAdsAccount, get_line_ads_accounts
from server.services.line.oauth import build_line_ads_oauth_url, save_to_mongo
from server.services.oauth_utils import verify_state
from server.services.utils import generate_uuid

LINE_ADS_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token"
LINE_ADS_OAUTH_SCOPE = "profile openid"

router = APIRouter(prefix="/api/line/ads", tags=["line_ads"])


@router.post("/login", response_model=OAuthLoginResponse)
@limiter.limit(settings.rate_limit_auth)
async def login_line_ads(request: Request, payload: ConnectionNamePayload):
    user = get_current_user()
    connection_id = generate_uuid()

    oauth_url = build_line_ads_oauth_url(
        scope=LINE_ADS_OAUTH_SCOPE,
        connection_type=ConnectionType.SOURCE.value,
        connection_id=connection_id,
        service_name=ServiceName.LINE_ADS.value,
        connection_name=payload.connection_name,
        user_id=user.id,
    )
    return OAuthLoginResponse(
        oauth_url=oauth_url,
        connection_id=connection_id,
        message="Redirect user to this URL to authorize LINE Ads",
    )


@router.get("/oauth2callback")
async def oauth2callback(code: str | None = None, state: str | None = None):
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    try:
        result = verify_state(state)
        connection = ConnectionKey(**result)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                LINE_ADS_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.line_ads_redirect_uri,
                    "client_id": settings.line_ads_client_id,
                    "client_secret": settings.line_ads_client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            token_data = response.json()

        line_params = LineConnectionParams(
            access_token=token_data["access_token"],
            token_type=token_data.get("token_type", "Bearer"),
            expires_in=token_data.get("expires_in"),
            refresh_token=token_data.get("refresh_token"),
            scope=token_data.get("scope", ""),
        )

        await save_to_mongo(connection=connection, tokens=line_params)

        provider = connection.service_name.lower()
        redirect_url = f"{settings.frontend_oauth_success_url}?provider={provider}"
        return RedirectResponse(url=redirect_url)

    except ValueError as error:
        logger.error("LINE Ads OAuth callback state verification failed: %s", error)
        raise HTTPException(
            status_code=400, detail="Invalid or expired OAuth state"
        ) from error
    except httpx.HTTPStatusError as error:
        logger.error("LINE Ads token exchange failed: %s", error)
        raise HTTPException(
            status_code=502, detail="Token exchange with LINE failed"
        ) from error


@router.get("/accounts", response_model=list[LineAdsAccount])
async def list_line_ads_accounts(connection_id: str, request: Request):
    user = get_current_user()
    return await get_line_ads_accounts(connection_id, user.id)
