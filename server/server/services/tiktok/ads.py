"""TikTok Ads service for fetching advertiser accounts."""

import json

import httpx
from loguru import logger

from common.database import get_mongodb
from common.model.connection import ConnectionItem
from common.model.tiktok.account import TikTokAdsAccount
from common.model.token import TikTokConnectionParams
from server.configs.config import settings
from server.services.auth.context import get_current_user
from server.services.exceptions import ConnectionNotFoundError

TIKTOK_ADVERTISER_INFO_URL = (
    "https://business-api.tiktok.com/open_api/v1.3/advertiser/info/"
)


async def _fetch_advertiser_info(
    access_token: str, advertiser_ids: list[str]
) -> dict[str, str]:
    """Fetch advertiser names from TikTok API.

    Args:
        access_token: TikTok access token
        advertiser_ids: List of advertiser IDs to fetch info for

    Returns:
        Dict mapping advertiser_id to advertiser_name
    """
    if not advertiser_ids:
        return {}

    result: dict[str, str] = {}

    headers = {
        "Access-Token": access_token,
    }

    # TikTok API accepts multiple advertiser_ids in a single request
    params = {
        "advertiser_ids": json.dumps(advertiser_ids),
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info(f"Fetching TikTok advertiser info for: {advertiser_ids}")
            logger.info(f"Request params: {params}")

            response = await client.get(
                TIKTOK_ADVERTISER_INFO_URL,
                headers=headers,
                params=params,
            )
            response.raise_for_status()
            data = response.json()

            logger.info(f"TikTok API response: {data}")

            if data.get("code") != 0:
                logger.warning(f"TikTok API error: {data.get('message')}")
                return result

            # Extract advertiser info from response
            adv_list = data.get("data", {}).get("list", [])
            for adv_info in adv_list:
                adv_id = str(adv_info.get("advertiser_id", ""))
                # Use name if available, fallback to company, then ID
                name = (
                    adv_info.get("name")
                    or adv_info.get("company")
                    or f"Advertiser {adv_id}"
                )
                result[adv_id] = name
                logger.info(f"Got advertiser: {adv_id} -> {name}")

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching TikTok advertiser info: {e}")
        logger.error(f"Response: {e.response.text if e.response else 'No response'}")
    except httpx.RequestError as e:
        logger.error(f"Request error fetching TikTok advertiser info: {e}")

    return result


async def get_tiktok_ads_accounts(connection_id: str) -> list[TikTokAdsAccount]:
    """
    Returns a list of TikTok advertiser accounts with names from the API.

    Fetches advertiser IDs from stored connection, then calls TikTok API
    to get the actual advertiser names.

    Includes ownership verification to prevent horizontal privilege escalation.
    """
    user = get_current_user()

    # Query with user_id to ensure ownership
    connection = await get_mongodb().get_document(
        collection_name=settings.connection_collection,
        query={"_id": connection_id, "user_id": user.id},
        model_cls=ConnectionItem,
    )
    if not connection:
        logger.warning(
            "Connection not found or access denied",
            connection_id=connection_id,
            user_id=user.id,
        )
        raise ConnectionNotFoundError(connection_id)

    connection_params = TikTokConnectionParams(**connection.params)
    access_token = connection_params.access_token
    advertiser_ids = connection_params.advertiser_ids or []

    # Fetch advertiser names from TikTok API
    advertiser_names = await _fetch_advertiser_info(access_token, advertiser_ids)

    # Build account list with names
    accounts: list[TikTokAdsAccount] = []
    for adv_id in advertiser_ids:
        name = advertiser_names.get(adv_id, f"Advertiser {adv_id}")
        accounts.append(
            TikTokAdsAccount(
                advertiser_id=adv_id,
                advertiser_name=name,
            )
        )

    logger.info(
        f"Found {len(accounts)} TikTok advertiser accounts "
        f"for connection {connection_id}"
    )
    return accounts
