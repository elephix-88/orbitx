"""Google OAuth service using base OAuth patterns."""

from common.model.connection import ConnectionKey
from common.model.token import GoogleConnectionParams
from server.configs.config import settings
from server.services.oauth.base import BaseOAuthService, save_connection_to_mongo


class GoogleOAuthService(BaseOAuthService):
    """Google-specific OAuth service implementation."""

    @property
    def provider_name(self) -> str:
        return "google"

    @property
    def auth_url(self) -> str:
        return "https://accounts.google.com/o/oauth2/v2/auth"

    @property
    def client_id(self) -> str:
        return settings.google_oauth_client_id

    @property
    def redirect_uri(self) -> str:
        return settings.google_oauth_redirect_uri

    def get_scope_string(self, scope: str | list[str]) -> str:
        """Google uses space-separated scopes."""
        return " ".join(scope) if isinstance(scope, list) else scope

    def get_additional_params(self) -> dict[str, str]:
        """Google-specific OAuth parameters."""
        return {
            "access_type": "offline",
            "prompt": "consent",
        }


# Singleton instance
_google_oauth_service = GoogleOAuthService()


def build_google_oauth_url(
    scope: str | list[str],
    connection_type: str,
    connection_id: str,
    service_name: str,
    connection_name: str,
    user_id: str | None = None,
) -> str:
    """Build Google OAuth authorization URL."""
    return _google_oauth_service.build_oauth_url(
        scope=scope,
        connection_type=connection_type,
        connection_id=connection_id,
        service_name=service_name,
        connection_name=connection_name,
        user_id=user_id,
    )


async def save_to_mongo(connection: ConnectionKey, tokens: GoogleConnectionParams):
    """Save Google OAuth connection to MongoDB."""
    await save_connection_to_mongo(
        connection=connection,
        params=tokens,
        params_class=GoogleConnectionParams,
    )

