"""LINE Ads API Client for the Reporting API."""

from typing import Any

import httpx
from loguru import logger

from engine.exceptions import ExtractorException


LINE_ADS_API_BASE = "https://ads.line.me/api/v3"
DEFAULT_PAGE_SIZE = 100
DEFAULT_TIMEOUT = 60


class LineAdsClient:
    """Client for LINE Ads Reporting API.

    LINE Ads API v3 uses bearer token authentication.
    Reports endpoint returns campaign/adgroup/ad performance data.
    """

    def __init__(self, access_token: str, timeout: int = DEFAULT_TIMEOUT):
        self.access_token = access_token
        self.timeout = timeout
        self.api_base = LINE_ADS_API_BASE
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def get_report(
        self,
        ad_account_id: str,
        start_date: str,
        end_date: str,
        granularity: str = "DAILY",
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> list[dict[str, Any]]:
        """Fetch performance report data from LINE Ads API with pagination.

        Args:
            ad_account_id: LINE Ads group ID
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            granularity: Report granularity (DAILY, HOURLY, etc.)
            page_size: Number of records per page

        Returns:
            List of report row dicts
        """
        url = f"{self.api_base}/reports"
        params: dict[str, Any] = {
            "adAccountId": ad_account_id,
            "startDate": start_date,
            "endDate": end_date,
            "granularity": granularity,
            "limit": page_size,
        }

        return await self.paginate(url, params, context="report")

    async def get_campaigns(
        self,
        ad_account_id: str,
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> list[dict[str, Any]]:
        """Fetch campaign list for an ad account."""
        url = f"{self.api_base}/campaigns"
        params: dict[str, Any] = {
            "adAccountId": ad_account_id,
            "limit": page_size,
        }

        return await self.paginate(url, params, context="campaigns")

    async def get_adgroups(
        self,
        ad_account_id: str,
        page_size: int = DEFAULT_PAGE_SIZE,
    ) -> list[dict[str, Any]]:
        """Fetch ad group list for an ad account."""
        url = f"{self.api_base}/adgroups"
        params: dict[str, Any] = {
            "adAccountId": ad_account_id,
            "limit": page_size,
        }

        return await self.paginate(url, params, context="adgroups")

    async def paginate(
        self,
        url: str,
        params: dict[str, Any],
        context: str = "",
    ) -> list[dict[str, Any]]:
        """Paginate through LINE Ads API results using cursor-based pagination.

        LINE Ads API returns a `nextToken` in the response for cursor-based
        pagination. Each page contains up to `limit` records.

        Args:
            url: API endpoint URL
            params: Query parameters
            context: Label for logging

        Returns:
            Accumulated list of records across all pages
        """
        all_records: list[dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while True:
                response = await client.get(url, headers=self.headers, params=params)

                if response.status_code != 200:
                    logger.error(
                        f"LINE Ads API error ({context}): "
                        f"status={response.status_code}, body={response.text}"
                    )
                    raise ExtractorException(
                        f"LINE Ads API request failed with status {response.status_code}: "
                        f"{response.text}",
                        source_type="line_ads",
                        details={"status_code": response.status_code, "context": context},
                    )

                result = response.json()

                records = result.get("data", [])
                all_records.extend(records)

                next_token = result.get("nextToken")
                if not next_token:
                    break

                params["nextToken"] = next_token

        logger.debug(
            f"LINE Ads API ({context}): fetched {len(all_records)} records"
        )

        return all_records
