from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from common.model.facebook.ads import FacebookAdsAccount
from common.model.user import UserInDB
from server.services.auth.dependencies import get_current_user
from server.services.exceptions import OrbitXError
from server.services.facebook.ads import get_facebook_ads_accounts

router = APIRouter(prefix="/api/facebook/ads", tags=["facebook_ads"])


@router.get("/accounts", response_model=list[FacebookAdsAccount])
async def facebook_ads_accounts_endpoint(
    connection_id: str,
    _current_user: UserInDB = Depends(get_current_user),
):
    """Retrieves Facebook Ads accounts accessible with a given connection_id."""
    try:
        return await get_facebook_ads_accounts(connection_id)
    except OrbitXError as e:
        logger.error(f"Error fetching Facebook Ads accounts: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
