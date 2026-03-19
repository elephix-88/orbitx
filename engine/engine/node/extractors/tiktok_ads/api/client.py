"""TikTok Ads API Client for the Reporting API."""

import json
from typing import Any

import httpx
from loguru import logger

from engine.configs.config import settings


class TikTokAdsClient:
    """Client for TikTok Ads Reporting API."""

    def __init__(self, access_token: str, timeout: int | None = None):
        self.access_token = access_token
        self.timeout = timeout or settings.default_timeout
        self.api_base = settings.api_base
        self.headers = {
            "Access-Token": access_token,
            "Content-Type": "application/json",
        }

    async def get_report(
        self,
        advertiser_id: str,
        dimensions: list[str],
        metrics: list[str],
        start_date: str,
        end_date: str,
        data_level: str = "AUCTION_AD",
        report_type: str = "BASIC",
        page_size: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch report data from TikTok Ads API with pagination."""
        all_data: list[dict[str, Any]] = []
        page = 1
        page_size = page_size or settings.default_page_size
        report_endpoint = f"{self.api_base}/report/integrated/get/"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while True:
                params = {
                    "advertiser_id": advertiser_id,
                    "report_type": report_type,
                    "data_level": data_level,
                    "dimensions": json.dumps(dimensions),
                    "metrics": json.dumps(metrics),
                    "start_date": start_date,
                    "end_date": end_date,
                    "page": page,
                    "page_size": page_size,
                }

                response = await client.get(
                    report_endpoint,
                    headers=self.headers,
                    params=params,
                )

                if response.status_code != 200:
                    logger.error(
                        f"TikTok API error: status={response.status_code}, "
                        f"body={response.text}"
                    )
                    raise Exception(
                        f"TikTok API request failed with status {response.status_code}: "
                        f"{response.text}"
                    )

                result = response.json()

                if result.get("code") != 0:
                    error_msg = result.get("message", "Unknown error")
                    logger.error(
                        f"TikTok API error: code={result.get('code')}, msg={error_msg}"
                    )
                    raise Exception(f"TikTok API error: {error_msg}")

                data = result.get("data", {})
                rows = data.get("list", [])
                all_data.extend(rows)

                page_info = data.get("page_info", {})
                total_page = page_info.get("total_page", 1)

                if page >= total_page:
                    break

                page += 1

        return all_data

    async def get_ads(
        self,
        advertiser_id: str,
        fields: list[str] | None = None,
        page_size: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch ad details from TikTok Ads API."""
        return await self._get_hierarchy(
            advertiser_id=advertiser_id,
            endpoint="ad",
            fields=fields,
            page_size=page_size,
        )

    async def get_adgroups(
        self,
        advertiser_id: str,
        fields: list[str] | None = None,
        page_size: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch ad group details from TikTok Ads API."""
        return await self._get_hierarchy(
            advertiser_id=advertiser_id,
            endpoint="adgroup",
            fields=fields,
            page_size=page_size,
        )

    async def get_campaigns(
        self,
        advertiser_id: str,
        fields: list[str] | None = None,
        page_size: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch campaign details from TikTok Ads API."""
        return await self._get_hierarchy(
            advertiser_id=advertiser_id,
            endpoint="campaign",
            fields=fields,
            page_size=page_size,
        )

    async def _get_hierarchy(
        self,
        advertiser_id: str,
        endpoint: str,
        fields: list[str] | None = None,
        page_size: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch hierarchy data from TikTok API."""
        all_data: list[dict[str, Any]] = []
        page = 1
        page_size = page_size or settings.default_page_size
        url = f"{self.api_base}/{endpoint}/get/"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while True:
                params: dict[str, Any] = {
                    "advertiser_id": advertiser_id,
                    "page": page,
                    "page_size": page_size,
                }

                if fields:
                    params["fields"] = json.dumps(fields)

                response = await client.get(
                    url,
                    headers=self.headers,
                    params=params,
                )

                if response.status_code != 200:
                    logger.error(
                        f"TikTok API error ({endpoint}): status={response.status_code}, "
                        f"body={response.text}"
                    )
                    raise Exception(
                        f"TikTok API request failed with status {response.status_code}: "
                        f"{response.text}"
                    )

                result = response.json()

                if result.get("code") != 0:
                    error_msg = result.get("message", "Unknown error")
                    logger.error(
                        f"TikTok API error ({endpoint}): code={result.get('code')}, "
                        f"msg={error_msg}"
                    )
                    raise Exception(f"TikTok API error: {error_msg}")

                data = result.get("data", {})
                rows = data.get("list", [])
                all_data.extend(rows)

                page_info = data.get("page_info", {})
                total_page = page_info.get("total_page", 1)

                if page >= total_page:
                    break

                page += 1

        return all_data
