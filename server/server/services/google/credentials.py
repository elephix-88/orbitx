from google.oauth2.credentials import Credentials

from common.model.connection import ConnectionItem
from common.model.token import GoogleConnectionParams
from server.configs.config import settings


def build_google_credentials(
    connection: ConnectionItem, scopes: list[str]
) -> Credentials:
    """Build Google OAuth credentials from a connection item."""
    params = GoogleConnectionParams(**connection.params)
    return Credentials(
        token=params.access_token,
        refresh_token=params.refresh_token,
        token_uri=settings.google_oauth_token_url,
        client_id=settings.google_oauth_client_id,
        client_secret=settings.google_oauth_client_secret,
        scopes=scopes,
    )
