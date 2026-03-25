from fastapi import APIRouter, Depends

from common.model.connection import (
    ConnectionNamePayload,
    ConnectionType,
    OAuthLoginResponse,
    ServiceName,
)
from common.model.user import UserInDB
from server.configs.config import settings
from server.services.auth.dependencies import get_current_user
from server.services.google.analytics import GA4Property, list_ga4_properties
from server.services.google.oauth import build_google_oauth_url
from server.services.utils import generate_uuid

router = APIRouter(prefix="/api/google/analytics", tags=["google_analytics"])


@router.post("/login")
async def login_google_analytics(
    payload: ConnectionNamePayload,
    user: UserInDB = Depends(get_current_user),
):
    connection_id = generate_uuid()
    oauth_url = build_google_oauth_url(
        scope=settings.google_oauth_analytics_scope,
        connection_type=ConnectionType.SOURCE.value,
        connection_id=connection_id,
        service_name=ServiceName.GA4.value,
        connection_name=payload.connection_name,
        user_id=user.id,
    )
    return OAuthLoginResponse(
        oauth_url=oauth_url,
        connection_id=connection_id,
        message="Redirect user to this URL to authorize Google Analytics",
    )


@router.get("/properties", response_model=list[GA4Property])
async def list_ga4_properties_endpoint(
    connection_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    """Retrieves GA4 properties accessible with a given connection_id."""
    return await list_ga4_properties(connection_id, current_user.id)
