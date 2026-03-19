import asyncio

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from loguru import logger

from engine.configs.config import settings
from common.database.mongodb import get_mongodb
from common.model.common import ConnectionConfig


def build_credentials(
    refresh_token: str,
    access_token: str | None = None,
    scopes: list[str] | None = None,
) -> Credentials:
    """Return a valid Google OAuth Credentials object.
    Automatically refreshes the access token if expired.
    """
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri=settings.google_oauth_token_uri,
        client_id=settings.google_oauth_client_id,
        client_secret=settings.google_oauth_client_secret,
        scopes=scopes,
    )

    if creds.refresh_token:
        creds.refresh(Request())
    else:
        logger.warning("Google credentials are invalid and cannot be refreshed.")

    return creds


async def build_connection_credentials(
    connection_id: str, scopes: list[str] | None = None
) -> Credentials:
    """Build Credentials object for a stored connection document."""
    mongodb = get_mongodb()
    connection = await mongodb.find_one("connections", connection_id, ConnectionConfig)
    return await asyncio.to_thread(
        build_credentials,
        refresh_token=connection.params.refresh_token,
        access_token=connection.params.access_token,
        scopes=scopes,
    )
