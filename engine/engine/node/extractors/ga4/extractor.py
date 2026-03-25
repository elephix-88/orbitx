"""GA4 (Google Analytics 4) Extractor using the GA4 Data API."""

import asyncio
from datetime import date
from typing import Any

import pandas as pd
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
    RunReportResponse,
)
from loguru import logger

from common.model.common import BaseFieldSchema
from common.model.google.ga4 import GA4Config
from common.model.result import ExtractorResult
from common.model.token import GoogleToken
from engine.configs.config import settings
from engine.interfaces.node import Extractor
from engine.services.connection import get_connection_token
from engine.services.google.auth import build_credentials
from engine.utils.datetime import get_time_range
from engine.utils.extraction import extraction_lifecycle

ROWS_PER_PAGE = 100_000
GA4_DATE_FORMAT = "%Y%m%d"

GA4_METRIC_TYPE_HINTS: dict[str, str] = {
    "sessions": "integer",
    "activeUsers": "integer",
    "newUsers": "integer",
    "totalUsers": "integer",
    "screenPageViews": "integer",
    "transactions": "integer",
    "conversions": "integer",
    "eventCount": "integer",
    "purchaseRevenue": "float",
    "totalRevenue": "float",
    "averageSessionDuration": "float",
    "bounceRate": "float",
    "engagementRate": "float",
    "sessionsPerUser": "float",
    "screenPageViewsPerSession": "float",
    "ecommercePurchases": "integer",
}


class GA4Extractor(Extractor):
    """Extractor for GA4 Data API (runReport endpoint).

    Uses offset-based pagination with a max of 250,000 rows per request.
    All metric values are returned as strings by the API and must be
    cast based on the metricHeader type (INTEGER or FLOAT).
    """

    def __init__(self, config: GA4Config) -> None:
        self.config = config

    def normalize_property_id(self, property_id: str) -> str:
        """Ensure property ID has the 'properties/' prefix."""
        if property_id.startswith("properties/"):
            return property_id
        return f"properties/{property_id}"

    def build_request(
        self,
        property_id: str,
        start_date: date,
        end_date: date,
        offset: int,
    ) -> RunReportRequest:
        """Build a RunReportRequest for the GA4 Data API."""
        return RunReportRequest(
            property=property_id,
            dimensions=[Dimension(name=d) for d in self.config.dimensions],
            metrics=[Metric(name=m) for m in self.config.metrics],
            date_ranges=[
                DateRange(
                    start_date=start_date.strftime("%Y-%m-%d"),
                    end_date=end_date.strftime("%Y-%m-%d"),
                )
            ],
            offset=offset,
            limit=ROWS_PER_PAGE,
        )

    def cast_metric_value(self, raw_value: str, metric_type: str) -> int | float | str:
        """Cast a metric string value to the correct Python type.

        The GA4 API returns all metric values as strings. The type is
        indicated by metricHeader.type: TYPE_INTEGER, TYPE_FLOAT, TYPE_CURRENCY, etc.
        """
        if metric_type == "TYPE_INTEGER":
            return int(raw_value)
        float_types = (
            "TYPE_FLOAT",
            "TYPE_CURRENCY",
            "TYPE_SECONDS",
            "TYPE_MILLISECONDS",
        )
        if metric_type in float_types:
            return float(raw_value)
        return raw_value

    def parse_date_value(self, raw_value: str) -> str:
        """Parse GA4 date format YYYYMMDD to YYYY-MM-DD."""
        if len(raw_value) == 8 and raw_value.isdigit():
            return f"{raw_value[:4]}-{raw_value[4:6]}-{raw_value[6:8]}"
        return raw_value

    def parse_response(self, response: RunReportResponse) -> list[dict[str, Any]]:
        """Parse a RunReportResponse into a list of flat dicts."""
        dimension_names = [header.name for header in response.dimension_headers]
        metric_names = [header.name for header in response.metric_headers]
        metric_types = [header.type_.name for header in response.metric_headers]

        records: list[dict[str, Any]] = []

        for row in response.rows:
            record: dict[str, Any] = {}

            for index, dimension_value in enumerate(row.dimension_values):
                name = dimension_names[index]
                value = dimension_value.value
                if name == "date":
                    value = self.parse_date_value(value)
                record[name] = value

            for index, metric_value in enumerate(row.metric_values):
                name = metric_names[index]
                record[name] = self.cast_metric_value(
                    metric_value.value,
                    metric_types[index],
                )

            records.append(record)

        return records

    def fetch_all_pages(
        self,
        client: BetaAnalyticsDataClient,
        property_id: str,
        start_date: date,
        end_date: date,
    ) -> list[dict[str, Any]]:
        """Fetch all pages of a GA4 report (sync, wrapped with asyncio.to_thread)."""
        all_records: list[dict[str, Any]] = []
        offset = 0

        while True:
            request = self.build_request(property_id, start_date, end_date, offset)
            response = client.run_report(request)

            page_records = self.parse_response(response)
            all_records.extend(page_records)

            total_rows = response.row_count
            offset += len(page_records)

            logger.debug(
                f"GA4 fetched {offset}/{total_rows} rows for {property_id}"
            )

            if offset >= total_rows or len(page_records) == 0:
                break

        return all_records

    def build_field_schemas(self) -> list[BaseFieldSchema]:
        """Build field schemas from the configured dimensions and metrics."""
        schemas: list[BaseFieldSchema] = []

        for dimension in self.config.dimensions:
            schemas.append(BaseFieldSchema(field=dimension, data_type="string"))

        for metric in self.config.metrics:
            data_type = GA4_METRIC_TYPE_HINTS.get(metric, "float")
            schemas.append(BaseFieldSchema(field=metric, data_type=data_type))

        return schemas

    async def extract(self) -> ExtractorResult:
        """Extract data from GA4 Data API."""
        async with extraction_lifecycle(
            "GA4 Extraction",
            settings.services.ga4,
            self.config.connection_id,
        ):
            token = await get_connection_token(
                self.config.connection_id,
                settings.services.ga4,
                GoogleToken,
            )

            credentials = build_credentials(
                refresh_token=token.refresh_token,
                access_token=token.access_token,
                scopes=token.scopes,
            )

            client = BetaAnalyticsDataClient(credentials=credentials)
            property_id = self.normalize_property_id(self.config.property_id)

            start_date, end_date = get_time_range(self.config.time_config)

            logger.info(
                f"GA4 extraction: property={property_id}, "
                f"dimensions={self.config.dimensions}, "
                f"metrics={self.config.metrics}, "
                f"range={start_date} to {end_date}"
            )

            records = await asyncio.to_thread(
                self.fetch_all_pages,
                client,
                property_id,
                start_date,
                end_date,
            )

            if records:
                df = pd.DataFrame(records)
            else:
                columns = self.config.dimensions + self.config.metrics
                df = pd.DataFrame(columns=columns)

            primary_keys = list(self.config.dimensions)
            field_schemas = self.build_field_schemas()

            logger.success(f"GA4 extraction complete: {len(df)} rows")

            return ExtractorResult(
                data=df,
                primary_keys=primary_keys,
                report_level="property",
                field_schemas=field_schemas,
            )
