"""Data merging for TikTok Ads API responses."""

from typing import Any

import pandas as pd
from loguru import logger


class TikTokDataMerger:
    """Merges data from multiple TikTok API responses."""

    def __init__(self, advertiser_id: str):
        self.advertiser_id = advertiser_id

    def flatten_report_data(self, raw_data: list[dict[str, Any]]) -> pd.DataFrame:
        """Flatten TikTok report API response."""
        if not raw_data:
            return pd.DataFrame()

        flattened_rows = []
        for record in raw_data:
            row: dict[str, Any] = {}
            dimensions = record.get("dimensions", {})
            row.update(dimensions)
            metrics = record.get("metrics", {})
            row.update(metrics)
            row["advertiser_id"] = self.advertiser_id
            flattened_rows.append(row)

        return pd.DataFrame(flattened_rows)

    def merge_reports(
        self,
        basic_data: pd.DataFrame | None,
        audience_data: pd.DataFrame | None,
        merge_keys: list[str],
    ) -> pd.DataFrame:
        """Merge BASIC and AUDIENCE report data."""
        if basic_data is None or basic_data.empty:
            if audience_data is None or audience_data.empty:
                return pd.DataFrame()
            return audience_data

        if audience_data is None or audience_data.empty:
            return basic_data

        logger.info(
            f"Both BASIC ({len(basic_data)} rows) and AUDIENCE ({len(audience_data)} rows) "
            f"data exist. Using AUDIENCE data (contains breakdown dimensions)."
        )
        return audience_data

    def join_hierarchy_data(
        self,
        report_data: pd.DataFrame,
        hierarchy_data: dict[str, pd.DataFrame],
    ) -> pd.DataFrame:
        """Join hierarchy data (names, metadata) to report data."""
        if report_data.empty:
            return report_data

        result = report_data.copy()

        join_config = [
            ("campaign", "campaign_id"),
            ("adgroup", "adgroup_id"),
            ("ad", "ad_id"),
        ]

        for endpoint, key_col in join_config:
            if endpoint not in hierarchy_data:
                continue

            hierarchy_df = hierarchy_data[endpoint]
            if hierarchy_df.empty:
                continue

            if key_col not in result.columns:
                continue

            if key_col not in hierarchy_df.columns:
                logger.warning(
                    f"Key column {key_col} not found in {endpoint} hierarchy data"
                )
                continue

            logger.info(f"Joining {endpoint} hierarchy data on {key_col}")

            new_cols = [c for c in hierarchy_df.columns if c not in result.columns]
            if not new_cols:
                continue

            join_df = hierarchy_df[[key_col] + new_cols].drop_duplicates(
                subset=[key_col]
            )

            result = pd.merge(
                result,
                join_df,
                on=key_col,
                how="left",
            )

        return result

    def merge_all(
        self,
        basic_data: list[dict[str, Any]] | None,
        audience_data: list[dict[str, Any]] | None,
        hierarchy_data: dict[str, list[dict[str, Any]]] | None,
        merge_keys: list[str],
    ) -> pd.DataFrame:
        """Merge all API responses into a single DataFrame."""
        basic_df = self.flatten_report_data(basic_data or [])
        audience_df = self.flatten_report_data(audience_data or [])

        logger.info(
            f"Flattened data: basic={len(basic_df)} rows, audience={len(audience_df)} rows"
        )

        merged = self.merge_reports(basic_df, audience_df, merge_keys)
        logger.info(f"Merged report data: {len(merged)} rows")

        hierarchy_dfs: dict[str, pd.DataFrame] = {}
        if hierarchy_data:
            for endpoint, data in hierarchy_data.items():
                if data:
                    hierarchy_dfs[endpoint] = pd.DataFrame(data)
                    logger.info(f"Hierarchy {endpoint}: {len(data)} records")

        if hierarchy_dfs:
            merged = self.join_hierarchy_data(merged, hierarchy_dfs)
            logger.info(
                f"After hierarchy join: {len(merged)} rows, {len(merged.columns)} columns"
            )

        return merged
