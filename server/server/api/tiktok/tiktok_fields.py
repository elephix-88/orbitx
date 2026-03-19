
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from common.model.tiktok import TikTokField
from common.model.user import UserInDB
from server.services.auth.dependencies import get_current_user
from server.services.exceptions import OrbitXError
from server.services.tiktok_fields import get_tiktok_fields

router = APIRouter(prefix="/api/tiktok", tags=["tiktok"])


@router.get("/tiktok_fields", response_model=list[TikTokField])
async def tiktok_fields_endpoint(
    _current_user: UserInDB = Depends(get_current_user),
) -> list[TikTokField]:
    """Retrieves a list of available fields for TikTok Ads reporting."""
    logger.info("Fetching TikTok Ads fields")
    try:
        return await get_tiktok_fields()
    except OrbitXError as e:
        logger.error(f"Error fetching TikTok Ads fields: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
