import asyncio
from typing import Any

import pandas as pd
from google.ads.googleads.client import GoogleAdsClient
from loguru import logger

from engine.configs.config import settings
from engine.exceptions import ExtractorException, ValidationException
from engine.interfaces.node import Extractor
from engine.node.extractors.google_ads.field_manager import get_gaql_level
from engine.node.extractors.google_ads.gaql_builder import GaqlBuildResult, build_gaql
from engine.node.extractors.google_ads.row_utils import flatten_row
from engine.services.connection import get_connection_token
from engine.services.google.auth import build_credentials
from engine.utils.logger import ExecutionTimer
from common.database.mongodb import get_mongodb
from common.model.execution import Status
from common.model.google.ads import GoogleAdsFields as FieldConfig
from common.model.google.ads_config import GoogleAdsConfig
from common.model.result import ExtractorResult
from common.model.token import GoogleToken

MAX_PARALLEL_ACCOUNTS = 10


class GoogleAdsExtractor(Extractor):
    def __init__(self, config: GoogleAdsConfig):
        self.config = config

    def _fetch_customer_data(
        self,
        customer_id: str,
        ga_service: Any,
        query: str,
        selected_pairs: list[tuple[str, str]],
        customer_key: str,
    ) -> list[dict[str, str]]:
        """Fetch data for a single customer ID (sync - will be wrapped with to_thread)."""
        records: list[dict[str, str]] = []

        stream = ga_service.search_stream(customer_id=customer_id, query=query)
        for batch in stream:
            for row in batch.results:
                rec = flatten_row(row, selected_pairs)
                rec.setdefault(customer_key, str(customer_id))
                records.append(rec)

        return records

    async def extract(self) -> ExtractorResult:
        """Extract data from Google Ads API."""
        execution_timer = ExecutionTimer("Google Ads Extraction")
        await execution_timer.start()

        try:
            token = await get_connection_token(
                self.config.connection_id,
                settings.services.google_ads,
                GoogleToken,
            )

            creds = build_credentials(
                refresh_token=token.refresh_token,
                access_token=token.access_token,
                scopes=token.scopes,
            )

            client = GoogleAdsClient(
                credentials=creds,
                developer_token=settings.google_ads_developer_token,
                login_customer_id=settings.google_ads_login_customer_id,
            )

            mongodb = get_mongodb()
            field_config = await mongodb.find_many(
                settings.google_fields, "field", self.config.fields, FieldConfig
            )

            if not field_config:
                raise ValidationException(
                    "No Google Ads fields resolved from configuration.",
                    validation_type="field_config",
                    details={"fields": self.config.fields},
                )

            gaql_level = get_gaql_level(field_config)

            gaql: GaqlBuildResult = build_gaql(
                gaql_level, field_config, self.config.time_config
            )

            ga_service = client.get_service("GoogleAdsService")

            customer_key = next(
                (
                    logical
                    for logical, path in gaql.selected_pairs
                    if path == "customer.id"
                ),
                None,
            )
            customer_key = customer_key or "customer_id"

            # Fetch data for each customer ID concurrently using asyncio.to_thread
            tasks = [
                asyncio.to_thread(
                    self._fetch_customer_data,
                    customer_id,
                    ga_service,
                    gaql.query,
                    gaql.selected_pairs,
                    customer_key,
                )
                for customer_id in self.config.ad_account_id
            ]

            logger.info(
                f"Processing {len(self.config.ad_account_id)} accounts concurrently"
            )

            results = await asyncio.gather(*tasks)

            records: list[dict[str, Any]] = []
            for customer_id, customer_records in zip(self.config.ad_account_id, results):
                records.extend(customer_records)
                logger.success(f"Completed data fetch for customer: {customer_id}")

            if len(records) == 0:
                logical_columns = [logical for logical, _ in gaql.selected_pairs]
                if customer_key not in logical_columns:
                    logical_columns.append(customer_key)
                df = pd.DataFrame(columns=logical_columns)
            else:
                df = pd.DataFrame(records)

            primary_keys = list(dict.fromkeys([*gaql.primary_keys, customer_key]))

            result = ExtractorResult(
                data=df,
                primary_keys=primary_keys,
                report_level=gaql_level,
                field_schemas=field_config,
            )

            await execution_timer.stop(Status.SUCCESS)
            return result

        except Exception as ex:
            await execution_timer.stop(Status.FAILED)
            raise ExtractorException(
                f"Google Ads extraction failed: {ex}",
                source_type=settings.services.google_ads,
                details={"connection_id": self.config.connection_id},
            ) from ex
