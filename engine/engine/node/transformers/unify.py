from typing import Any

import duckdb
import pandas as pd
from loguru import logger

from engine.exceptions import TransformerException
from engine.interfaces.node import Transformer
from common.model.transform import UnifyTransformConfig

FACEBOOK_ADS_MAPPING: dict[str, str] = {
    "date_start": "date",
    "spend": "spend",
    "impressions": "impressions",
    "inline_link_clicks": "clicks",
    "actions_purchase": "conversions",
    "actions_offsite_conversion_purchase": "conversions",
    "action_values_purchase": "conversion_value",
    "action_values_offsite_conversion_purchase": "conversion_value",
    "campaign_name": "campaign_name",
    "campaign_id": "campaign_id",
    "adset_name": "adgroup_name",
    "adset_id": "adgroup_id",
    "ad_name": "ad_name",
    "ad_id": "ad_id",
    "account_name": "account_name",
    "account_id": "account_id",
    "reach": "reach",
    "frequency": "frequency",
}

GOOGLE_ADS_MAPPING: dict[str, str] = {
    "segments_date": "date",
    "metrics_cost_micros": "spend",
    "metrics_impressions": "impressions",
    "metrics_clicks": "clicks",
    "metrics_conversions": "conversions",
    "metrics_conversions_value": "conversion_value",
    "campaign_name": "campaign_name",
    "campaign_id": "campaign_id",
    "ad_group_name": "adgroup_name",
    "ad_group_id": "adgroup_id",
    "ad_group_ad_name": "ad_name",
    "ad_group_ad_id": "ad_id",
    "customer_descriptive_name": "account_name",
    "customer_id": "account_id",
}

TIKTOK_ADS_MAPPING: dict[str, str] = {
    "stat_time_day": "date",
    "spend": "spend",
    "impressions": "impressions",
    "clicks": "clicks",
    "conversions": "conversions",
    "total_complete_payment": "conversions",
    "total_purchase_value": "conversion_value",
    "campaign_name": "campaign_name",
    "campaign_id": "campaign_id",
    "adgroup_name": "adgroup_name",
    "adgroup_id": "adgroup_id",
    "ad_name": "ad_name",
    "ad_id": "ad_id",
    "advertiser_name": "account_name",
    "advertiser_id": "account_id",
    "reach": "reach",
    "frequency": "frequency",
}

LINE_ADS_MAPPING: dict[str, str] = {
    "date": "date",
    "cost": "spend",
    "impressions": "impressions",
    "clicks": "clicks",
    "conversions": "conversions",
    "conversion_value": "conversion_value",
    "campaign_name": "campaign_name",
    "campaign_id": "campaign_id",
    "adgroup_name": "adgroup_name",
    "adgroup_id": "adgroup_id",
    "ad_name": "ad_name",
    "ad_id": "ad_id",
    "advertiser_name": "account_name",
    "account_id": "account_id",
    "reach": "reach",
}

GA4_MAPPING: dict[str, str] = {
    "date": "date",
    "sessionSource": "source",
    "sessionMedium": "medium",
    "sessionCampaignName": "campaign_name",
    "sessions": "sessions",
    "activeUsers": "users",
    "conversions": "conversions",
    "purchaseRevenue": "conversion_value",
    "transactions": "transactions",
}

PLATFORM_MAPPINGS: dict[str, dict[str, str]] = {
    "facebook_ads": FACEBOOK_ADS_MAPPING,
    "google_ads": GOOGLE_ADS_MAPPING,
    "tiktok_ads": TIKTOK_ADS_MAPPING,
    "line_ads": LINE_ADS_MAPPING,
    "ga4": GA4_MAPPING,
}


class UnifyTransformer(Transformer):
    """Transformer that maps platform-specific ad columns to a unified marketing schema."""

    def __init__(self, config: UnifyTransformConfig) -> None:
        self.config = config

    def update_field_schemas(self, schemas: list[Any] | None) -> list[Any] | None:
        """Update field schemas to reflect unified column names."""
        if not schemas:
            return None

        mapping = PLATFORM_MAPPINGS.get(self.config.platform)
        if not mapping:
            return schemas

        seen_unified_names: set[str] = set()
        remapped_schemas = []
        for schema in schemas:
            if schema.field in mapping:
                unified_name = mapping[schema.field]
                if unified_name in seen_unified_names:
                    continue
                seen_unified_names.add(unified_name)
                schema = schema.model_copy(update={"field": unified_name})
            remapped_schemas.append(schema)

        if remapped_schemas:
            template = remapped_schemas[0]
            platform_schema = template.model_copy(
                update={"field": "platform", "data_type": "string"}
            )
            remapped_schemas.append(platform_schema)

            if self.config.include_calculated_metrics:
                for metric_name in ("cpm", "cpc", "ctr", "cpa", "roas"):
                    metric_schema = template.model_copy(
                        update={"field": metric_name, "data_type": "float"}
                    )
                    remapped_schemas.append(metric_schema)

        return remapped_schemas

    def build_rename_select(self, columns: pd.Index) -> tuple[list[str], set[str]]:
        """Build SELECT parts that rename platform columns to unified names.

        Returns the select parts list and the set of unified column names produced.
        """
        mapping = PLATFORM_MAPPINGS.get(self.config.platform, {})
        is_google = self.config.platform == "google_ads"

        select_parts: list[str] = []
        unified_columns: set[str] = set()

        for column in columns:
            if column not in mapping:
                select_parts.append(f'"{column}"')
                continue

            unified_name = mapping[column]

            if unified_name in unified_columns:
                continue
            unified_columns.add(unified_name)

            if is_google and column == "metrics_cost_micros":
                select_parts.append(
                    f'CAST("{column}" AS DOUBLE) / 1000000 AS "{unified_name}"'
                )
            else:
                select_parts.append(f'"{column}" AS "{unified_name}"')

        return select_parts, unified_columns

    async def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Map platform-specific columns to unified schema, add platform column, and compute metrics."""
        if self.config.platform not in PLATFORM_MAPPINGS:
            raise TransformerException(
                f"Unsupported platform: {self.config.platform}",
                transform_type="unify",
                details={"platform": self.config.platform},
            )

        try:
            select_parts, unified_columns = self.build_rename_select(df.columns)

            select_parts.append(f"'{self.config.platform}' AS platform")

            rename_sql = f"SELECT {', '.join(select_parts)} FROM df"
            renamed_df = duckdb.sql(rename_sql).df()

            if self.config.include_calculated_metrics:
                renamed_df = self.compute_calculated_metrics(renamed_df, unified_columns)

            mapped_count = sum(
                1 for col in df.columns if col in PLATFORM_MAPPINGS[self.config.platform]
            )
            logger.info(
                f"Unified {mapped_count} columns from {self.config.platform} to marketing schema"
            )
            return renamed_df

        except TransformerException:
            raise
        except Exception as ex:
            raise TransformerException(
                f"Unify transform failed: {ex}",
                transform_type="unify",
                details={"platform": self.config.platform},
            ) from ex

    def compute_calculated_metrics(
        self, df: pd.DataFrame, unified_columns: set[str]
    ) -> pd.DataFrame:
        """Compute CPM, CPC, CTR, CPA, ROAS using DuckDB with null-safe division."""
        required_for_metrics = {"spend", "impressions", "clicks", "conversions", "conversion_value"}
        available = required_for_metrics & set(df.columns)

        metric_expressions: list[str] = []

        if "spend" in available and "impressions" in available:
            metric_expressions.append(
                'CAST(spend AS DOUBLE) / NULLIF(CAST(impressions AS DOUBLE), 0) * 1000 AS "cpm"'
            )

        if "spend" in available and "clicks" in available:
            metric_expressions.append(
                'CAST(spend AS DOUBLE) / NULLIF(CAST(clicks AS DOUBLE), 0) AS "cpc"'
            )

        if "clicks" in available and "impressions" in available:
            metric_expressions.append(
                'CAST(clicks AS DOUBLE) / NULLIF(CAST(impressions AS DOUBLE), 0) * 100 AS "ctr"'
            )

        if "spend" in available and "conversions" in available:
            metric_expressions.append(
                'CAST(spend AS DOUBLE) / NULLIF(CAST(conversions AS DOUBLE), 0) AS "cpa"'
            )

        if "conversion_value" in available and "spend" in available:
            metric_expressions.append(
                'CAST(conversion_value AS DOUBLE) / NULLIF(CAST(spend AS DOUBLE), 0) AS "roas"'
            )

        if not metric_expressions:
            return df

        existing_columns = ", ".join(f'"{col}"' for col in df.columns)
        metrics_sql = f"SELECT {existing_columns}, {', '.join(metric_expressions)} FROM df"
        return duckdb.sql(metrics_sql).df()
