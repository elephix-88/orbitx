from pydantic import BaseModel

import httpx
from loguru import logger

from common.database import get_mongodb
from common.model.connection import ConnectionItem
from common.model.token import GoogleConnectionParams
from server.configs.config import settings
from server.services.exceptions import (
    ConnectionAuthError,
    ConnectionNotFoundError,
    ExternalAPIError,
)

GA4_ACCOUNT_SUMMARIES_URL = (
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries"
)


class GA4Property(BaseModel):
    property_id: str
    display_name: str
    account_name: str


async def list_ga4_properties(connection_id: str, user_id: str) -> list[GA4Property]:
    """Fetch all GA4 properties accessible under a given connection.

    Calls the Analytics Admin API `accountSummaries.list` endpoint, handling
    pagination automatically. Verifies connection ownership before making any
    external calls.
    """
    connection = await get_mongodb().get_document(
        collection_name=settings.connection_collection,
        query={"_id": connection_id, "user_id": user_id},
        model_cls=ConnectionItem,
    )
    if not connection:
        logger.error("GA4 connection not found: id=%s user=%s", connection_id, user_id)
        raise ConnectionNotFoundError(connection_id)

    params = GoogleConnectionParams(**connection.params)

    access_token = await get_valid_access_token(params, connection_id)

    return await fetch_all_ga4_properties(access_token)


async def get_valid_access_token(
    params: GoogleConnectionParams, connection_id: str
) -> str:
    """Return a fresh access token, refreshing via token endpoint when needed."""
    if params.access_token:
        return params.access_token

    if not params.refresh_token:
        raise ConnectionAuthError(connection_id, "No refresh token available")

    return await refresh_access_token(params.refresh_token, connection_id)


async def refresh_access_token(refresh_token: str, connection_id: str) -> str:
    """Exchange a refresh token for a new access token."""
    data = {
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(settings.google_oauth_token_url, data=data)
            response.raise_for_status()
        except httpx.HTTPStatusError as error:
            logger.error("Token refresh failed for connection %s: %s", connection_id, error)
            raise ConnectionAuthError(connection_id, "Token refresh failed") from error

    return response.json()["access_token"]


async def fetch_all_ga4_properties(access_token: str) -> list[GA4Property]:
    """Page through accountSummaries.list and collect all GA4 properties."""
    properties: list[GA4Property] = []
    page_token: str | None = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            query_params: dict[str, str] = {"pageSize": "200"}
            if page_token:
                query_params["pageToken"] = page_token

            try:
                response = await client.get(
                    GA4_ACCOUNT_SUMMARIES_URL,
                    params=query_params,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as error:
                logger.error("GA4 Admin API error: %s", error)
                raise ExternalAPIError(
                    "Google Analytics Admin",
                    str(error),
                    error.response.status_code,
                ) from error

            body = response.json()

            for account_summary in body.get("accountSummaries", []):
                account_name = account_summary.get("displayName", "")
                for property_summary in account_summary.get("propertySummaries", []):
                    raw_property = property_summary.get("property", "")
                    # property resource name format: "properties/123456789"
                    property_id = raw_property.split("/")[-1] if raw_property else ""
                    properties.append(
                        GA4Property(
                            property_id=property_id,
                            display_name=property_summary.get("displayName", ""),
                            account_name=account_name,
                        )
                    )

            page_token = body.get("nextPageToken")
            if not page_token:
                break

    return properties
