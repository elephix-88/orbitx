"""TikTok Ads Extractor implementation."""

import asyncio
from datetime import date
from typing import Any

import pandas as pd
from loguru import logger

from common.database.mongodb import find_many
from common.model.result import ExtractorResult
from common.model.tiktok.config import TikTokAdsConfig
from common.model.tiktok.fields import TikTokField
from common.model.token import TikTokToken
from engine.configs.config import settings
from engine.exceptions import ValidationException
from engine.interfaces.node import Extractor
from engine.node.extractors.tiktok_ads.api.client import TikTokAdsClient
from engine.node.extractors.tiktok_ads.api.request import (
    RequestPlan,
    TikTokRequestPlanner,
)
from engine.node.extractors.tiktok_ads.api.response import TikTokDataMerger
from engine.services.connection import get_connection_token
from engine.utils.datetime import chunk_date_range, get_time_range
from engine.utils.extraction import extraction_lifecycle


class TikTokAdsExtractor(Extractor):
    """Extractor for TikTok Ads Reporting API."""

    def __init__(self, config: TikTokAdsConfig):
        self.config = config

    async def _fetch_report(
        self,
        client: TikTokAdsClient,
        advertiser_id: str,
        date_chunks: list[tuple[date, date]],
        dimensions: list[str],
        metrics: list[str],
        data_level: str,
        report_type: str,
    ) -> list[dict[str, Any]]:
        """Fetch report data for a single advertiser."""
        records: list[dict[str, Any]] = []

        for chunk_start, chunk_end in date_chunks:
            start_date = chunk_start.strftime("%Y-%m-%d")
            end_date = chunk_end.strftime("%Y-%m-%d")

            rows = await client.get_report(
                advertiser_id=advertiser_id,
                dimensions=dimensions,
                metrics=metrics,
                start_date=start_date,
                end_date=end_date,
                data_level=data_level,
                report_type=report_type,
            )
            records.extend(rows)

        return records

    async def _fetch_hierarchy(
        self,
        client: TikTokAdsClient,
        advertiser_id: str,
        endpoint: str,
        fields: list[str],
    ) -> list[dict[str, Any]]:
        """Fetch hierarchy data for a single advertiser."""
        if endpoint == "ad":
            return await client.get_ads(advertiser_id, fields=fields)
        elif endpoint == "adgroup":
            return await client.get_adgroups(advertiser_id, fields=fields)
        else:
            return await client.get_campaigns(advertiser_id, fields=fields)

    async def _execute_plan_for_advertiser(
        self,
        advertiser_id: str,
        client: TikTokAdsClient,
        plan: RequestPlan,
        date_chunks: list[tuple[date, date]],
    ) -> pd.DataFrame:
        """Execute the request plan for a single advertiser."""
        basic_data: list[dict[str, Any]] | None = None
        audience_data: list[dict[str, Any]] | None = None
        hierarchy_data: dict[str, list[dict[str, Any]]] = {}

        if plan.basic_request:
            basic_data = await self._fetch_report(
                client=client,
                advertiser_id=advertiser_id,
                date_chunks=date_chunks,
                dimensions=plan.basic_request.dimensions,
                metrics=plan.basic_request.metrics,
                data_level=plan.basic_request.data_level,
                report_type=plan.basic_request.report_type,
            )

        if plan.audience_request:
            audience_data = await self._fetch_report(
                client=client,
                advertiser_id=advertiser_id,
                date_chunks=date_chunks,
                dimensions=plan.audience_request.dimensions,
                metrics=plan.audience_request.metrics,
                data_level=plan.audience_request.data_level,
                report_type=plan.audience_request.report_type,
            )

        for hierarchy_req in plan.hierarchy_requests:
            hierarchy_data[hierarchy_req.endpoint] = await self._fetch_hierarchy(
                client=client,
                advertiser_id=advertiser_id,
                endpoint=hierarchy_req.endpoint,
                fields=hierarchy_req.fields,
            )

        merger = TikTokDataMerger(advertiser_id)
        merged_df = merger.merge_all(
            basic_data=basic_data,
            audience_data=audience_data,
            hierarchy_data=hierarchy_data if hierarchy_data else None,
            merge_keys=plan.get_merge_keys(),
        )

        return merged_df

    async def extract(self) -> ExtractorResult:
        """Extract data from TikTok Ads API."""
        async with extraction_lifecycle(
            "TikTok Ads Extraction",
            settings.services.tiktok_ads,
            self.config.connection_id,
        ):
            token = await get_connection_token(
                self.config.connection_id,
                settings.services.tiktok_ads,
                TikTokToken,
            )
            access_token = token.access_token

            field_configs = await find_many(
                settings.tiktok_fields,
                {"field": {"$in": self.config.fields}},
                TikTokField,
            )

            if not field_configs:
                raise ValidationException(
                    "No TikTok Ads fields resolved from configuration.",
                    validation_type="field_config",
                    details={"fields": self.config.fields},
                )

            planner = TikTokRequestPlanner(field_configs)
            plan = planner.plan()

            logger.info(
                f"TikTok extraction plan: {plan.total_requests} requests, "
                f"level={plan.report_level.value}"
            )

            if not plan.basic_request and not plan.audience_request:
                raise ValidationException(
                    "No report requests generated from field configuration.",
                    validation_type="request_plan",
                    details={"fields": self.config.fields},
                )

            start_dt, end_dt = get_time_range(self.config.time_config)
            date_chunks = chunk_date_range(start_dt, end_dt)

            if len(date_chunks) > 1:
                logger.info(
                    f"Date range {start_dt} to {end_dt} "
                    f"split into {len(date_chunks)} chunks"
                )

            client = TikTokAdsClient(access_token=access_token)

            # Fetch data for each advertiser ID concurrently
            tasks = [
                self._execute_plan_for_advertiser(
                    advertiser_id, client, plan, date_chunks
                )
                for advertiser_id in self.config.ad_account_id
            ]
            results = await asyncio.gather(*tasks)

            all_dfs = [df for df in results if not df.empty]

            df = pd.concat(all_dfs, ignore_index=True) if all_dfs else pd.DataFrame()

            primary_keys = plan.primary_keys.copy()
            if "advertiser_id" not in primary_keys:
                primary_keys = ["advertiser_id", *primary_keys]

            logger.success(f"TikTok extraction complete: {len(df)} total rows")

            return ExtractorResult(
                data=df,
                primary_keys=primary_keys,
                report_level=plan.report_level,
                field_schemas=field_configs,
            )
