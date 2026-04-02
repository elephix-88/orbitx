
import httpx
from loguru import logger

from common.database.mongodb import find_one
from common.model.connection import ConnectionItem
from common.model.facebook.ads import FacebookAdsAccount
from common.model.token import FacebookConnectionParams
from server.configs.config import settings
from server.services.auth.context import get_current_user
from server.services.exceptions import (
    ConnectionAuthError,
    ConnectionNotFoundError,
    ExternalAPIError,
)


async def get_facebook_ads_accounts(connection_id: str) -> list[FacebookAdsAccount]:
    """
    Returns a list of Facebook Ads accounts accessible
    from the connection stored in MongoDB.

    Includes ownership verification to prevent horizontal privilege escalation.
    """
    user = get_current_user()

    # Query with user_id to ensure ownership
    connection = await find_one(
        settings.connection_collection,
        {"_id": connection_id, "user_id": user.id},
        ConnectionItem,
    )
    if not connection:
        logger.warning(
            "Connection not found or access denied",
            connection_id=connection_id,
            user_id=user.id,
        )
        raise ConnectionNotFoundError(connection_id)

    connection_params = FacebookConnectionParams(**connection.params)
    access_token = connection_params.access_token

    url = f"https://graph.facebook.com/{settings.facebook_api_version}/me/adaccounts"
    query_params = {
        "access_token": access_token,
        "fields": "id,name,account_id,account_status",
        "limit": 100,
    }

    accounts: list[FacebookAdsAccount] = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            while url:
                response = await client.get(url, params=query_params)
                response.raise_for_status()
                data = response.json()

                for item in data.get("data", []):
                    account = FacebookAdsAccount(
                        id=item.get("id"),
                        name=item.get("name", f"Account {item.get('account_id')}"),
                        account_id=item.get("account_id"),
                        account_status=item.get("account_status"),
                    )
                    accounts.append(account)

                # Pagination
                url = data.get("paging", {}).get("next")
                if url:
                    query_params = {}  # params are included in the next url

    except httpx.HTTPStatusError as e:
        logger.error(
            "HTTP error fetching Facebook Ads accounts",
            status_code=e.response.status_code,
            error=str(e),
        )
        if e.response.status_code == 401:
            raise ConnectionAuthError(
                connection_id, "Access token expired or invalid"
            ) from e
        raise ExternalAPIError("Facebook", str(e), e.response.status_code) from e
    except httpx.RequestError as e:
        logger.error("Request error fetching Facebook Ads accounts", error=str(e))
        raise ExternalAPIError("Facebook", f"Request failed: {e}") from e

    return accounts
