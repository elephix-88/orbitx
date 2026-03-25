from common.model.connection import ConnectionKey
from common.model.token import LineConnectionParams
from server.configs.config import settings
from server.services.oauth_base import BaseOAuthService, save_connection_to_mongo

LINE_ADS_AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize"


class LineAdsOAuthService(BaseOAuthService):
    """LINE Ads OAuth service using LINE Login (authorization code grant)."""

    @property
    def provider_name(self) -> str:
        return "line"

    @property
    def auth_url(self) -> str:
        return LINE_ADS_AUTHORIZE_URL

    @property
    def client_id(self) -> str:
        return settings.line_ads_client_id

    @property
    def redirect_uri(self) -> str:
        return settings.line_ads_redirect_uri

    def get_scope_string(self, scope: str | list[str]) -> str:
        """LINE uses space-separated scopes."""
        return " ".join(scope) if isinstance(scope, list) else scope

    def get_additional_params(self) -> dict[str, str]:
        """LINE requires response_type=code — no extra params needed beyond the base."""
        return {}


_line_ads_oauth_service = LineAdsOAuthService()


def build_line_ads_oauth_url(
    scope: str | list[str],
    connection_type: str,
    connection_id: str,
    service_name: str,
    connection_name: str,
    user_id: str | None = None,
) -> str:
    """Build LINE Ads OAuth authorization URL."""
    return _line_ads_oauth_service.build_oauth_url(
        scope=scope,
        connection_type=connection_type,
        connection_id=connection_id,
        service_name=service_name,
        connection_name=connection_name,
        user_id=user_id,
    )


async def save_to_mongo(connection: ConnectionKey, tokens: LineConnectionParams) -> None:
    """Save LINE Ads OAuth connection to MongoDB."""
    await save_connection_to_mongo(
        connection=connection,
        params=tokens,
        params_class=LineConnectionParams,
    )
