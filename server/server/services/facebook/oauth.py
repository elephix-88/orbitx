"""Facebook OAuth service using base OAuth patterns."""

from common.model.connection import ConnectionKey
from common.model.token import FacebookConnectionParams
from server.configs.config import settings
from server.services.oauth.base import BaseOAuthService, save_connection_to_mongo


class FacebookOAuthService(BaseOAuthService):
    """Facebook-specific OAuth service implementation."""

    @property
    def provider_name(self) -> str:
        return "facebook"

    @property
    def auth_url(self) -> str:
        return f"https://www.facebook.com/{settings.facebook_api_version}/dialog/oauth"

    @property
    def client_id(self) -> str:
        return settings.facebook_app_id

    @property
    def redirect_uri(self) -> str:
        return settings.facebook_redirect_uri

    def get_scope_string(self, scope: str | list[str]) -> str:
        """Facebook uses comma-separated scopes."""
        return ",".join(scope) if isinstance(scope, list) else scope

    def get_additional_params(self) -> dict[str, str]:
        """Facebook doesn't require additional params."""
        return {}


# Singleton instance
_facebook_oauth_service = FacebookOAuthService()


def build_facebook_oauth_url(
    scope: str | list[str],
    connection_type: str,
    connection_id: str,
    service_name: str,
    connection_name: str,
    user_id: str | None = None,
) -> str:
    """Build Facebook OAuth authorization URL."""
    return _facebook_oauth_service.build_oauth_url(
        scope=scope,
        connection_type=connection_type,
        connection_id=connection_id,
        service_name=service_name,
        connection_name=connection_name,
        user_id=user_id,
    )


async def save_to_mongo(connection: ConnectionKey, tokens: FacebookConnectionParams):
    """Save Facebook OAuth connection to MongoDB."""
    await save_connection_to_mongo(
        connection=connection,
        params=tokens,
        params_class=FacebookConnectionParams,
    )
