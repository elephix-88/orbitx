import asyncio

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from google.auth.exceptions import RefreshError
from loguru import logger

from common.database import get_mongodb
from common.model.connection import ConnectionItem
from common.model.google.ads import GoogleAdsAccount, GoogleAdsFields
from common.model.token import GoogleConnectionParams
from server.configs.config import settings
from server.services.exceptions import (
    ConnectionAuthError,
    ConnectionNotFoundError,
    ExternalAPIError,
)
from server.services.field_service import get_fields


async def get_google_ads_fields() -> list[GoogleAdsFields]:
    return await get_fields(settings.google_fields, GoogleAdsFields)


def _get_google_ads_accounts_sync(
    connection: ConnectionItem,
) -> list[GoogleAdsAccount]:
    """
    Synchronous implementation - fetches Google Ads accounts.
    Receives pre-fetched connection to avoid async calls inside sync code.
    """
    params = GoogleConnectionParams(**connection.params)

    config = {
        "developer_token": settings.google_ads_developer_token,
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "refresh_token": params.refresh_token,
        "use_proto_plus": True,
    }

    try:
        client = GoogleAdsClient.load_from_dict(config)
        customer_service = client.get_service("CustomerService")
        response = customer_service.list_accessible_customers()
    except RefreshError as e:
        logger.error(f"Token refresh failed for connection {connection.id}: {e}")
        raise ConnectionAuthError(connection.id, "Token expired or revoked")
    except GoogleAdsException as e:
        logger.error(f"Google Ads API error: {e}")
        raise ExternalAPIError("Google Ads", str(e))

    ga_service = client.get_service("GoogleAdsService")
    accounts: list[GoogleAdsAccount] = []

    for resource_name in response.resource_names:
        customer_id = resource_name.split("/")[-1]
        query = """
            SELECT
              customer.id,
              customer.descriptive_name
            FROM customer
            LIMIT 1
        """
        try:
            results = ga_service.search(customer_id=customer_id, query=query)
            for row in results:
                account = GoogleAdsAccount(
                    resource_name=row.customer.resource_name,
                    id=str(row.customer.id),
                    descriptive_name=row.customer.descriptive_name,
                )
                accounts.append(account)
        except GoogleAdsException as ex:
            logger.warning(f"Error fetching account {customer_id}: {ex}")

    return accounts


async def get_google_ads_accounts(
    connection_id: str, user_id: str
) -> list[GoogleAdsAccount]:
    """
    Returns a list of Google Ads accounts (id + name) accessible
    from the connection stored in MongoDB.
    Verifies user ownership of the connection.
    Runs blocking Google Ads API calls in a thread pool.
    """
    google_ads_connection = await get_mongodb().get_document(
        collection_name=settings.connection_collection,
        query={"_id": connection_id, "user_id": user_id},
        model_cls=ConnectionItem,
    )
    if not google_ads_connection:
        logger.error("Connection not found for id=%s", connection_id)
        raise ConnectionNotFoundError(connection_id)

    return await asyncio.to_thread(
        _get_google_ads_accounts_sync, google_ads_connection
    )
