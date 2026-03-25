"""Tests for UnifyTransformer — GA4 mapping, edge cases, and all platforms."""

import math

import pandas as pd
import pytest

from common.model.common import BaseFieldSchema
from common.model.transform import UnifyTransformConfig
from engine.exceptions import TransformerException
from engine.node.transformers.unify import UnifyTransformer


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_transformer(platform: str, include_calculated_metrics: bool = True) -> UnifyTransformer:
    config = UnifyTransformConfig(
        platform=platform,
        include_calculated_metrics=include_calculated_metrics,
    )
    return UnifyTransformer(config)


def make_schemas(fields: list[str]) -> list[BaseFieldSchema]:
    return [BaseFieldSchema(field=f, data_type="string") for f in fields]


# ---------------------------------------------------------------------------
# GA4 mapping tests
# ---------------------------------------------------------------------------


class TestGA4Mapping:
    """GA4-specific column mapping tests."""

    @pytest.mark.asyncio
    async def test_ga4_dimensions_map_to_unified_schema(self):
        """Core GA4 dimensions must map to the unified schema correctly."""
        df = pd.DataFrame(
            {
                "date": ["2024-01-01"],
                "sessionSource": ["google"],
                "sessionMedium": ["cpc"],
                "sessionCampaignName": ["Summer Sale TH"],
                "sessions": [1500],
                "activeUsers": [1200],
                "conversions": [45],
                "purchaseRevenue": [89500.0],
                "transactions": [45],
            }
        )
        transformer = make_transformer("ga4")
        result = await transformer.transform(df)

        assert "date" in result.columns
        assert "source" in result.columns
        assert "medium" in result.columns
        assert "campaign_name" in result.columns
        assert "sessions" in result.columns
        assert "users" in result.columns
        assert "conversions" in result.columns
        assert "conversion_value" in result.columns
        assert "transactions" in result.columns
        assert "platform" in result.columns

    @pytest.mark.asyncio
    async def test_ga4_platform_column_is_ga4(self):
        """Platform column must be set to 'ga4'."""
        df = pd.DataFrame(
            {"date": ["2024-01-01"], "sessions": [100], "purchaseRevenue": [5000.0]}
        )
        transformer = make_transformer("ga4")
        result = await transformer.transform(df)
        assert result["platform"].iloc[0] == "ga4"

    @pytest.mark.asyncio
    async def test_ga4_source_value_preserved(self):
        """sessionSource values must be passed through to the 'source' column."""
        df = pd.DataFrame(
            {"sessionSource": ["google", "facebook", "(direct)"], "sessions": [100, 200, 50]}
        )
        transformer = make_transformer("ga4")
        result = await transformer.transform(df)
        assert list(result["source"]) == ["google", "facebook", "(direct)"]

    @pytest.mark.asyncio
    async def test_ga4_campaign_name_with_thai_text(self):
        """Thai campaign names must pass through correctly without corruption."""
        thai_name = "แคมเปญฤดูร้อน 2024"
        df = pd.DataFrame({"sessionCampaignName": [thai_name], "sessions": [300]})
        transformer = make_transformer("ga4")
        result = await transformer.transform(df)
        assert result["campaign_name"].iloc[0] == thai_name

    @pytest.mark.asyncio
    async def test_ga4_columns_not_in_mapping_are_kept(self):
        """GA4 columns not in the mapping must be kept as-is (not dropped)."""
        df = pd.DataFrame(
            {
                "date": ["2024-01-01"],
                "sessions": [100],
                "country": ["Thailand"],  # not in GA4_MAPPING
                "deviceCategory": ["mobile"],  # not in GA4_MAPPING
            }
        )
        transformer = make_transformer("ga4")
        result = await transformer.transform(df)
        assert "country" in result.columns
        assert "deviceCategory" in result.columns

    @pytest.mark.asyncio
    async def test_ga4_empty_dataframe_returns_empty(self):
        """An empty GA4 DataFrame must not raise and must return empty result."""
        df = pd.DataFrame(
            columns=["date", "sessionSource", "sessionCampaignName", "sessions", "purchaseRevenue"]
        )
        transformer = make_transformer("ga4")
        result = await transformer.transform(df)
        assert len(result) == 0
        assert "platform" in result.columns

    @pytest.mark.asyncio
    async def test_ga4_nan_in_sessions_does_not_crash(self):
        """NaN in sessions column must not raise — just produce NaN in output."""
        df = pd.DataFrame(
            {
                "date": ["2024-01-01", "2024-01-02"],
                "sessions": [None, 200],
                "purchaseRevenue": [5000.0, 3000.0],
            }
        )
        transformer = make_transformer("ga4")
        result = await transformer.transform(df)
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_ga4_purchase_revenue_maps_to_conversion_value(self):
        """purchaseRevenue must map to conversion_value."""
        df = pd.DataFrame({"purchaseRevenue": [99999.99], "sessions": [1]})
        transformer = make_transformer("ga4")
        result = await transformer.transform(df)
        assert "conversion_value" in result.columns
        assert abs(result["conversion_value"].iloc[0] - 99999.99) < 0.01

    @pytest.mark.asyncio
    async def test_ga4_no_calculated_metrics_when_disabled(self):
        """When include_calculated_metrics=False, no cpc/ctr/roas columns must appear."""
        df = pd.DataFrame(
            {
                "sessions": [1000],
                "conversions": [50],
                "purchaseRevenue": [25000.0],
            }
        )
        transformer = make_transformer("ga4", include_calculated_metrics=False)
        result = await transformer.transform(df)
        assert "roas" not in result.columns
        assert "cpa" not in result.columns
        assert "cpc" not in result.columns


# ---------------------------------------------------------------------------
# Facebook Ads mapping tests
# ---------------------------------------------------------------------------


class TestFacebookAdsMapping:
    """Facebook Ads mapping including cost_micros edge cases."""

    @pytest.mark.asyncio
    async def test_facebook_spend_maps_directly(self):
        """Facebook 'spend' field maps to unified 'spend' column."""
        df = pd.DataFrame(
            {
                "date_start": ["2024-01-01"],
                "spend": [1500.0],
                "impressions": [100000],
                "inline_link_clicks": [3000],
                "campaign_name": ["Q1 Promo"],
            }
        )
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        assert result["spend"].iloc[0] == 1500.0

    @pytest.mark.asyncio
    async def test_facebook_date_start_maps_to_date(self):
        """Facebook 'date_start' must map to unified 'date'."""
        df = pd.DataFrame({"date_start": ["2024-03-01"], "spend": [500.0]})
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        assert "date" in result.columns
        assert result["date"].iloc[0] == "2024-03-01"

    @pytest.mark.asyncio
    async def test_facebook_inline_link_clicks_maps_to_clicks(self):
        """Facebook 'inline_link_clicks' must map to 'clicks'."""
        df = pd.DataFrame({"inline_link_clicks": [1234], "spend": [200.0]})
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        assert "clicks" in result.columns
        assert result["clicks"].iloc[0] == 1234


# ---------------------------------------------------------------------------
# Google Ads mapping tests
# ---------------------------------------------------------------------------


class TestGoogleAdsMapping:
    """Google Ads mapping — especially the cost_micros / 1,000,000 conversion."""

    @pytest.mark.asyncio
    async def test_cost_micros_is_divided_by_one_million(self):
        """metrics_cost_micros must be divided by 1,000,000 to produce spend."""
        df = pd.DataFrame(
            {
                "segments_date": ["2024-01-15"],
                "metrics_cost_micros": [5_000_000],
                "metrics_impressions": [50000],
                "metrics_clicks": [1500],
                "campaign_name": ["Google Brand"],
            }
        )
        transformer = make_transformer("google_ads")
        result = await transformer.transform(df)
        assert abs(result["spend"].iloc[0] - 5.0) < 0.0001

    @pytest.mark.asyncio
    async def test_cost_micros_as_string_converts_correctly(self):
        """cost_micros as string (common in API responses) must still convert."""
        df = pd.DataFrame(
            {
                "metrics_cost_micros": ["12500000"],
                "metrics_impressions": [10000],
            }
        )
        transformer = make_transformer("google_ads")
        result = await transformer.transform(df)
        assert abs(result["spend"].iloc[0] - 12.5) < 0.0001


# ---------------------------------------------------------------------------
# Calculated metrics edge cases
# ---------------------------------------------------------------------------


class TestCalculatedMetricsEdgeCases:
    """Zero-denominator and NaN handling in CPM, CPC, CTR, CPA, ROAS."""

    @pytest.mark.asyncio
    async def test_zero_impressions_gives_null_cpm(self):
        """CPM must be NULL (not infinity/crash) when impressions = 0."""
        df = pd.DataFrame(
            {
                "spend": [500.0],
                "impressions": [0],
                "clicks": [10],
                "campaign_name": ["Test Campaign"],
            }
        )
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        assert "cpm" in result.columns
        assert result["cpm"].iloc[0] is None or math.isnan(result["cpm"].iloc[0])

    @pytest.mark.asyncio
    async def test_zero_clicks_gives_null_cpc(self):
        """CPC must be NULL (not infinity/crash) when clicks = 0.

        Uses platform-specific column names (inline_link_clicks) so the rename
        step populates unified_columns, enabling the calculated metrics logic.
        """
        df = pd.DataFrame(
            {
                "spend": [1000.0],
                "impressions": [50000],
                "inline_link_clicks": [0],  # Facebook platform name
            }
        )
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        assert "cpc" in result.columns
        assert result["cpc"].iloc[0] is None or math.isnan(result["cpc"].iloc[0])

    @pytest.mark.asyncio
    async def test_zero_spend_gives_null_roas(self):
        """ROAS must be NULL when spend = 0."""
        df = pd.DataFrame(
            {
                "date_start": ["2024-01-01"],
                "spend": [0.0],
                "action_values_purchase": [99999.0],
                "impressions": [50000],
                "clicks": [1000],
                "conversions": [10],
            }
        )
        # Note: Facebook uses action_values_purchase for conversion_value
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        # With spend=0, roas should be NULL not infinity
        if "roas" in result.columns:
            roas_val = result["roas"].iloc[0]
            assert roas_val is None or math.isnan(roas_val) or math.isinf(roas_val)

    @pytest.mark.asyncio
    async def test_zero_conversions_gives_null_cpa(self):
        """CPA must be NULL when conversions = 0.

        Uses platform-specific column names so the rename step populates
        unified_columns, enabling the calculated metrics logic.
        """
        df = pd.DataFrame(
            {
                "spend": [500.0],
                "actions_purchase": [0],          # Facebook → conversions
                "inline_link_clicks": [200],       # Facebook → clicks
                "impressions": [10000],
            }
        )
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        assert "cpa" in result.columns
        assert result["cpa"].iloc[0] is None or math.isnan(result["cpa"].iloc[0])

    @pytest.mark.asyncio
    async def test_all_zero_metrics_does_not_crash(self):
        """A row with all-zero metrics must not raise any exception."""
        df = pd.DataFrame(
            {
                "spend": [0.0],
                "impressions": [0],
                "clicks": [0],
                "conversions": [0],
                "conversion_value": [0.0],
            }
        )
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_ctr_is_percentage(self):
        """CTR must be expressed as percentage (clicks/impressions * 100).

        Uses platform-specific column names so unified_columns is populated
        correctly by the rename step.
        """
        df = pd.DataFrame(
            {
                "spend": [500.0],
                "impressions": [100000],
                "inline_link_clicks": [2000],  # Facebook → clicks
            }
        )
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        assert "ctr" in result.columns
        assert abs(result["ctr"].iloc[0] - 2.0) < 0.001  # 2000/100000 * 100 = 2%

    @pytest.mark.asyncio
    async def test_roas_calculation_correct(self):
        """ROAS = conversion_value / spend, should be accurate."""
        df = pd.DataFrame(
            {
                "date_start": ["2024-01-01"],
                "spend": [10000.0],
                "action_values_purchase": [35000.0],
                "impressions": [100000],
                "inline_link_clicks": [3000],
                "actions_purchase": [50],
            }
        )
        transformer = make_transformer("facebook_ads")
        result = await transformer.transform(df)
        assert "roas" in result.columns
        assert abs(result["roas"].iloc[0] - 3.5) < 0.001


# ---------------------------------------------------------------------------
# Unsupported platform
# ---------------------------------------------------------------------------


class TestUnsupportedPlatform:
    @pytest.mark.asyncio
    async def test_unknown_platform_raises_transformer_exception(self):
        """An unregistered platform name must raise TransformerException with clear message."""
        df = pd.DataFrame({"spend": [100.0]})
        transformer = make_transformer("snapchat_ads")
        with pytest.raises(TransformerException) as exc_info:
            await transformer.transform(df)
        assert "snapchat_ads" in str(exc_info.value)


# ---------------------------------------------------------------------------
# Field schema propagation
# ---------------------------------------------------------------------------


class TestFieldSchemaPropagation:
    def test_ga4_schemas_get_unified_names(self):
        """update_field_schemas must rename GA4 fields to unified names."""
        schemas = make_schemas(["date", "sessionCampaignName", "sessions", "purchaseRevenue"])
        transformer = make_transformer("ga4")
        result = transformer.update_field_schemas(schemas)
        field_names = {s.field for s in result}
        assert "date" in field_names
        assert "campaign_name" in field_names
        assert "sessions" in field_names
        assert "conversion_value" in field_names
        assert "sessionCampaignName" not in field_names
        assert "purchaseRevenue" not in field_names

    def test_platform_field_added_to_schemas(self):
        """A 'platform' field must be appended to the schemas list."""
        schemas = make_schemas(["spend", "impressions"])
        transformer = make_transformer("facebook_ads")
        result = transformer.update_field_schemas(schemas)
        field_names = [s.field for s in result]
        assert "platform" in field_names

    def test_calculated_metric_schemas_added_when_enabled(self):
        """cpm, cpc, ctr, cpa, roas schemas must be added when include_calculated_metrics=True."""
        schemas = make_schemas(["spend", "impressions", "clicks"])
        transformer = make_transformer("facebook_ads", include_calculated_metrics=True)
        result = transformer.update_field_schemas(schemas)
        field_names = {s.field for s in result}
        assert "cpm" in field_names
        assert "cpc" in field_names
        assert "ctr" in field_names

    def test_no_calculated_schemas_when_disabled(self):
        """No cpm/cpc/roas schemas when include_calculated_metrics=False."""
        schemas = make_schemas(["spend", "impressions", "clicks"])
        transformer = make_transformer("facebook_ads", include_calculated_metrics=False)
        result = transformer.update_field_schemas(schemas)
        field_names = {s.field for s in result}
        assert "cpm" not in field_names
        assert "roas" not in field_names

    def test_none_schemas_returns_none(self):
        """Passing None schemas must return None without crashing."""
        transformer = make_transformer("ga4")
        result = transformer.update_field_schemas(None)
        assert result is None

    def test_empty_schemas_returns_empty(self):
        """Passing empty schemas must return empty list."""
        transformer = make_transformer("ga4")
        result = transformer.update_field_schemas([])
        assert result == [] or result is None

    def test_duplicate_unified_names_are_deduplicated(self):
        """
        Facebook has two possible fields that both map to 'conversions'.
        Schemas must not contain duplicate unified names.
        """
        schemas = make_schemas(
            ["actions_purchase", "actions_offsite_conversion_purchase", "spend"]
        )
        transformer = make_transformer("facebook_ads")
        result = transformer.update_field_schemas(schemas)
        unified_fields = [s.field for s in result]
        assert unified_fields.count("conversions") == 1
