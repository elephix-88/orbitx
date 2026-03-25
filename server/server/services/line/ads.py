import httpx
from loguru import logger
from pydantic import BaseModel

from common.database import get_mongodb
from common.model.connection import ConnectionItem
from common.model.token import LineConnectionParams
from server.configs.config import settings
from server.services.exceptions import (
    ConnectionAuthError,
    ConnectionNotFoundError,
    ExternalAPIError,
)

LINE_ADS_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token"
LINE_ADS_ACCOUNTS_URL = "https://ads.line.me/api/v3/adaccounts"


class LineAdsAccount(BaseModel):
    account_id: str
    account_name: str


async def get_line_ads_accounts(connection_id: str, user_id: str) -> list[LineAdsAccount]:
    """Fetch LINE Ads accounts accessible under a given connection.

    Verifies connection ownership before making any external calls.
    Refreshes the access token when only a refresh token is available.
    """
    connection = await get_mongodb().get_document(
        collection_name=settings.connection_collection,
        query={"_id": connection_id, "user_id": user_id},
        model_cls=ConnectionItem,
    )
    if not connection:
        logger.error("LINE Ads connection not found: id=%s user=%s", connection_id, user_id)
        raise ConnectionNotFoundError(connection_id)

    params = LineConnectionParams(**connection.params)
    access_token = await get_valid_access_token(params, connection_id)

    return await fetch_line_ads_accounts(access_token, connection_id)


async def get_valid_access_token(params: LineConnectionParams, connection_id: str) -> str:
    """Return a fresh access token, refreshing via token endpoint when needed."""
    if params.access_token:
        return params.access_token

    if not params.refresh_token:
        raise ConnectionAuthError(connection_id, "No refresh token available")

    return await refresh_access_token(params.refresh_token, connection_id)


async def refresh_access_token(refresh_token: str, connection_id: str) -> str:
    """Exchange a LINE Ads refresh token for a new access token."""
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": settings.line_ads_client_id,
        "client_secret": settings.line_ads_client_secret,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                LINE_ADS_TOKEN_URL,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            logger.error(
                "LINE Ads token refresh failed for connection %s: %s", connection_id, error
            )
            raise ConnectionAuthError(connection_id, "Token refresh failed") from error

    return response.json()["access_token"]


async def fetch_line_ads_accounts(
    access_token: str, connection_id: str
) -> list[LineAdsAccount]:
    """Call LINE Ads API to list ad accounts accessible with the given token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                LINE_ADS_ACCOUNTS_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            logger.error("LINE Ads API error for connection %s: %s", connection_id, error)
            raise ExternalAPIError(
                "LINE Ads",
                str(error),
                error.response.status_code,
            ) from error

    body = response.json()
    accounts: list[LineAdsAccount] = []

    for raw_account in body.get("adAccounts", []):
        accounts.append(
            LineAdsAccount(
                account_id=str(raw_account.get("adAccountId", "")),
                account_name=raw_account.get("adAccountName", ""),
            )
        )

    return accounts
