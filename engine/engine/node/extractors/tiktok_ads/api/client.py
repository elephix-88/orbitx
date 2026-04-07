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

    async def _paginate(
        self,
        url: str,
        params: dict[str, Any],
        page_size: int,
        context: str = "",
        row_limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Shared pagination logic for all TikTok API endpoints."""
        all_data: list[dict[str, Any]] = []
        page = 1

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while True:
                params["page"] = page
                params["page_size"] = page_size

                response = await client.get(url, headers=self.headers, params=params)

                if response.status_code != 200:
                    logger.error(
                        f"TikTok API error{f' ({context})' if context else ''}: "
                        f"status={response.status_code}, body={response.text}"
                    )
                    raise Exception(
                        "TikTok API request failed with "
                        f"status {response.status_code}: "
                        f"{response.text}"
                    )

                result = response.json()

                if result.get("code") != 0:
                    error_message = result.get("message", "Unknown error")
                    logger.error(
                        f"TikTok API error{f' ({context})' if context else ''}: "
                        f"code={result.get('code')}, msg={error_message}"
                    )
                    raise Exception(f"TikTok API error: {error_message}")

                data = result.get("data", {})
                rows = data.get("list", [])
                all_data.extend(rows)

                if row_limit and len(all_data) >= row_limit:
                    all_data = all_data[:row_limit]
                    break

                page_info = data.get("page_info", {})
                total_page = page_info.get("total_page", 1)

                if page >= total_page:
                    break

                page += 1

        return all_data

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
        url = f"{self.api_base}/report/integrated/get/"
        params: dict[str, Any] = {
            "advertiser_id": advertiser_id,
            "report_type": report_type,
            "data_level": data_level,
            "dimensions": json.dumps(dimensions),
            "metrics": json.dumps(metrics),
            "start_date": start_date,
            "end_date": end_date,
        }
        return await self._paginate(
            url=url,
            params=params,
            page_size=page_size or settings.default_page_size,
            context="report",
        )

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
        url = f"{self.api_base}/{endpoint}/get/"
        params: dict[str, Any] = {
            "advertiser_id": advertiser_id,
        }
        if fields:
            params["fields"] = json.dumps(fields)

        return await self._paginate(
            url=url,
            params=params,
            page_size=page_size or settings.default_page_size,
            context=endpoint,
        )
