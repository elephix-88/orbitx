import urllib.parse

from common.model.connection import ConnectionKey
from common.model.token import TikTokConnectionParams
from server.configs.config import settings
from server.services.oauth.base import save_connection_to_mongo
from server.services.oauth.utils import make_state


def build_tiktok_oauth_url(
    connection_type: str,
    connection_id: str,
    service_name: str,
    connection_name: str,
    user_id: str | None = None,
) -> str:
    """Build TikTok OAuth authorization URL.

    TikTok OAuth uses a different URL structure than Google/Facebook:
    - Uses app_id instead of client_id
    - Does not require scope in the authorization URL (configured in app settings)
    - State is passed as a query parameter
    """
    state = make_state(
        connection_type, connection_id, service_name, connection_name, user_id
    )

    params = {
        "app_id": str(settings.tiktok_app_id or ""),
        "redirect_uri": settings.tiktok_redirect_uri,
        "state": state,
    }

    return f"{settings.tiktok_oauth_url}?{urllib.parse.urlencode(params)}"


async def save_to_mongo(
    connection: ConnectionKey, tokens: TikTokConnectionParams
) -> None:
    """Save TikTok OAuth connection to MongoDB."""
    await save_connection_to_mongo(
        connection=connection,
        params=tokens,
        params_class=TikTokConnectionParams,
    )
