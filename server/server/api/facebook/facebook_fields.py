from fastapi import APIRouter, Depends

from common.model.facebook.fields import FacebookField
from common.model.user import UserInDB
from server.services.auth.dependencies import get_current_user
from server.services.facebook.fields import get_facebook_fields

router = APIRouter(prefix="/api/facebook", tags=["facebook"])


@router.get("/facebook_fields", response_model=list[FacebookField])
async def facebook_fields_endpoint(
    _current_user: UserInDB = Depends(get_current_user),
) -> list[FacebookField]:
    """Retrieves a list of available fields for Facebook Ads reporting."""
    return await get_facebook_fields()
