"""LINE Ads Extractor implementation."""

import asyncio
from datetime import date
from typing import Any

import pandas as pd
from loguru import logger

from common.model.common import BaseFieldSchema
from common.model.line_ads.config import LineAdsConfig
from common.model.result import ExtractorResult
from common.model.token import LineAdsToken
from engine.configs.config import settings
from engine.interfaces.node import Extractor
from engine.node.extractors.line_ads.client import LineAdsClient
from engine.services.connection import get_connection_token
from engine.utils.datetime import chunk_date_range, get_time_range
from engine.utils.extraction import extraction_lifecycle


# Fields returned by the LINE Ads reporting API.
# These are the standard metric and dimension fields available.
REPORT_FIELDS: list[str] = [
    "date",
    "campaign_id",
    "campaign_name",
    "adgroup_id",
    "adgroup_name",
    "ad_id",
    "ad_name",
    "account_id",
    "advertiser_name",
    "impressions",
    "clicks",
    "cost",
    "conversions",
    "conversion_value",
    "reach",
]


class LineAdsExtractor(Extractor):
    """Extractor for LINE Ads Reporting API.

    Pulls campaign, ad group, and ad performance data from the
    LINE Ads Platform API v3. Supports date-range chunking and
    concurrent extraction across multiple ad accounts.
    """

    def __init__(self, config: LineAdsConfig):
        self.config = config

    async def fetch_report_for_account(
        self,
        client: LineAdsClient,
        ad_account_id: str,
        date_chunks: list[tuple[date, date]],
    ) -> list[dict[str, Any]]:
        """Fetch report data for a single ad account across all date chunks.

        Args:
            client: LINE Ads API client
            ad_account_id: LINE Ads account ID
            date_chunks: List of (start_date, end_date) tuples

        Returns:
            List of raw report row dicts
        """
        records: list[dict[str, Any]] = []

        for chunk_start, chunk_end in date_chunks:
            start_date = chunk_start.strftime("%Y-%m-%d")
            end_date = chunk_end.strftime("%Y-%m-%d")

            rows = await client.get_report(
                ad_account_id=ad_account_id,
                start_date=start_date,
                end_date=end_date,
            )
            records.extend(rows)

        return records

    def build_field_schemas(self) -> list[BaseFieldSchema]:
        """Build field schemas from the configured field list.

        Maps each requested field to its data type for downstream
        schema propagation.
        """
        field_type_map: dict[str, str] = {
            "date": "string",
            "campaign_id": "string",
            "campaign_name": "string",
            "adgroup_id": "string",
            "adgroup_name": "string",
            "ad_id": "string",
            "ad_name": "string",
            "account_id": "string",
            "advertiser_name": "string",
            "impressions": "integer",
            "clicks": "integer",
            "cost": "float",
            "conversions": "integer",
            "conversion_value": "float",
            "reach": "integer",
        }

        schemas: list[BaseFieldSchema] = []
        for field in self.config.fields:
            data_type = field_type_map.get(field, "string")
            schemas.append(BaseFieldSchema(field=field, data_type=data_type))

        return schemas

    async def extract(self) -> ExtractorResult:
        """Extract data from LINE Ads API.

        Fetches performance report data for all configured ad accounts,
        concatenates results into a single DataFrame, and returns
        an ExtractorResult with primary keys and field schemas.
        """
        async with extraction_lifecycle(
            "LINE Ads Extraction",
            settings.services.line_ads,
            self.config.connection_id,
        ):
            token = await get_connection_token(
                self.config.connection_id,
                settings.services.line_ads,
                LineAdsToken,
            )

            start_dt, end_dt = get_time_range(self.config.time_config)
            date_chunks = chunk_date_range(start_dt, end_dt)

            if len(date_chunks) > 1:
                logger.info(
                    f"Date range {start_dt} to {end_dt} split into {len(date_chunks)} chunks"
                )

            client = LineAdsClient(access_token=token.access_token)

            tasks = [
                self.fetch_report_for_account(client, ad_account_id, date_chunks)
                for ad_account_id in self.config.ad_account_id
            ]
            results = await asyncio.gather(*tasks)

            all_records: list[dict[str, Any]] = []
            for records in results:
                all_records.extend(records)

            if all_records:
                df = pd.DataFrame(all_records)
                # Filter to only requested fields that exist in the data
                available_columns = [
                    field for field in self.config.fields if field in df.columns
                ]
                if available_columns:
                    df = df[available_columns]
            else:
                df = pd.DataFrame()

            primary_keys = ["account_id", "date", "campaign_id", "adgroup_id", "ad_id"]
            field_schemas = self.build_field_schemas()

            logger.success(f"LINE Ads extraction complete: {len(df)} total rows")

            return ExtractorResult(
                data=df,
                primary_keys=primary_keys,
                report_level="ad",
                field_schemas=field_schemas,
            )
