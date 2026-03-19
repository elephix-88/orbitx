from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from common.model.facebook.fields import FacebookField
from common.model.user import UserInDB
from server.services.auth.dependencies import get_current_user
from server.services.exceptions import OrbitXError
from server.services.facebook_fields import get_facebook_fields

router = APIRouter(prefix="/api/facebook", tags=["facebook"])


@router.get("/facebook_fields", response_model=list[FacebookField])
async def facebook_fields_endpoint(
    _current_user: UserInDB = Depends(get_current_user),
) -> list[FacebookField]:
    """Retrieves a list of available fields for Facebook Ads reporting."""
    logger.info("Fetching Facebook Ads fields")
    try:
        return await get_facebook_fields()
    except OrbitXError as e:
        logger.error(f"Error fetching Facebook Ads fields: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
