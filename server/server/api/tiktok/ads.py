from fastapi import APIRouter, Depends

from common.model.tiktok.account import TikTokAdsAccount
from common.model.user import UserInDB
from server.services.auth.dependencies import get_current_user
from server.services.tiktok.ads import get_tiktok_ads_accounts

router = APIRouter(prefix="/api/tiktok/ads", tags=["tiktok_ads"])


@router.get("/accounts", response_model=list[TikTokAdsAccount])
async def tiktok_ads_accounts_endpoint(
    connection_id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> list[TikTokAdsAccount]:
    """Retrieves TikTok advertiser accounts accessible with a given connection_id."""
    return await get_tiktok_ads_accounts(connection_id)
