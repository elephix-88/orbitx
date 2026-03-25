from fastapi import APIRouter, Depends

from common.model.tiktok import TikTokField
from common.model.user import UserInDB
from server.services.auth.dependencies import get_current_user
from server.services.tiktok.fields import get_tiktok_fields

router = APIRouter(prefix="/api/tiktok", tags=["tiktok"])


@router.get("/tiktok_fields", response_model=list[TikTokField])
async def tiktok_fields_endpoint(
    _current_user: UserInDB = Depends(get_current_user),
) -> list[TikTokField]:
    """Retrieves a list of available fields for TikTok Ads reporting."""
    return await get_tiktok_fields()
