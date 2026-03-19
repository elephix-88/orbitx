from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from common.model.connection import (
    ConnectionNamePayload,
    ConnectionType,
    OAuthLoginResponse,
    ServiceName,
)
from common.model.google.ads import GoogleAdsAccount, GoogleAdsFields
from common.model.user import UserInDB
from server.configs.config import settings
from server.services.auth.dependencies import get_current_user
from server.services.exceptions import OrbitXError
from server.services.google.ads import get_google_ads_accounts, get_google_ads_fields
from server.services.google.oauth import build_google_oauth_url
from server.services.utils import generate_uuid

router = APIRouter(prefix="/api/google/google_ads", tags=["google_ads"])


@router.post("/login")
async def login_google_ads(
    payload: ConnectionNamePayload,
    user: UserInDB = Depends(get_current_user),
):
    connection_id = generate_uuid()
    oauth_url = build_google_oauth_url(
        scope=settings.google_oauth_ads_scope,
        connection_type=ConnectionType.SOURCE.value,
        connection_id=connection_id,
        service_name=ServiceName.GOOGLE_ADS.value,
        connection_name=payload.connection_name,
        user_id=user.id,
    )
    logger.info(f"Generated Google OAuth URL: {oauth_url}")
    return OAuthLoginResponse(
        oauth_url=oauth_url,
        connection_id=connection_id,
        message="Redirect user to this URL to authorize Google Ads",
    )


@router.get("/fields", response_model=list[GoogleAdsFields])
async def google_ads_fields_endpoint(
    _current_user: UserInDB = Depends(get_current_user),
):
    """Retrieves a list of available fields for Google Ads reporting."""
    try:
        return await get_google_ads_fields()
    except OrbitXError as e:
        logger.error(f"Error fetching Google Ads fields: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/accounts", response_model=list[GoogleAdsAccount])
async def google_ads_accounts_endpoint(
    connection_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    """Retrieves Google Ads accounts accessible with a given connection_id."""
    try:
        return await get_google_ads_accounts(connection_id, current_user.id)
    except OrbitXError as e:
        logger.error(f"Error fetching Google Ads accounts: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
