"""Tests for Pulse AI Summary Generator — aggregation, Block Kit, and edge cases."""

import math

import pandas as pd
import pytest

from engine.node.intelligence.pulse_generator import (
    PulseAggregation,
    PulseResult,
    aggregate_marketing_data,
    build_pulse_blocks,
    safe_divide,
)


# ---------------------------------------------------------------------------
# safe_divide
# ---------------------------------------------------------------------------


class TestSafeDivide:
    def test_normal_division(self):
        assert safe_divide(100.0, 4.0) == 25.0

    def test_zero_denominator_returns_none(self):
        assert safe_divide(100.0, 0) is None

    def test_zero_denominator_float(self):
        assert safe_divide(50.0, 0.0) is None

    def test_nan_denominator_returns_none(self):
        assert safe_divide(100.0, float("nan")) is None

    def test_zero_numerator_is_valid(self):
        result = safe_divide(0.0, 100.0)
        assert result == 0.0

    def test_large_values(self):
        result = safe_divide(1_590_000.0, 50_000.0)
        assert abs(result - 31.8) < 0.001

    def test_result_nan_returns_none(self):
        """If the result itself is NaN (e.g., 0/0 in some configs), return None."""
        result = safe_divide(float("nan"), 1.0)
        # nan / 1 = nan, should return None
        assert result is None


# ---------------------------------------------------------------------------
# aggregate_marketing_data — normal case
# ---------------------------------------------------------------------------


class TestAggregateMarketingData:
    def _make_standard_df(self) -> pd.DataFrame:
        """Realistic Thai agency data: 3 campaigns across platforms."""
        return pd.DataFrame(
            {
                "campaign_name": [
                    "Q1 Promo FB",
                    "Q1 Promo Google",
                    "ฤดูร้อน TikTok",
                    "Q1 Promo FB",  # second row same campaign
                ],
                "platform": ["facebook_ads", "google_ads", "tiktok_ads", "facebook_ads"],
                "spend": [5000.0, 8000.0, 3000.0, 2000.0],
                "impressions": [200000.0, 150000.0, 300000.0, 100000.0],
                "clicks": [4000.0, 6000.0, 9000.0, 2000.0],
                "conversions": [80.0, 120.0, 50.0, 40.0],
                "conversion_value": [40000.0, 96000.0, 25000.0, 20000.0],
            }
        )

    def test_total_spend_is_correct(self):
        df = self._make_standard_df()
        result = aggregate_marketing_data(df)
        assert abs(result.total_spend - 18000.0) < 0.01

    def test_total_impressions_is_correct(self):
        df = self._make_standard_df()
        result = aggregate_marketing_data(df)
        assert abs(result.total_impressions - 750000.0) < 0.01

    def test_roas_is_correct(self):
        df = self._make_standard_df()
        result = aggregate_marketing_data(df)
        # total_conversion_value = 181000, total_spend = 18000
        expected_roas = 181000.0 / 18000.0
        assert result.roas is not None
        assert abs(result.roas - expected_roas) < 0.01

    def test_ctr_is_percentage(self):
        """CTR must be expressed as percentage."""
        df = self._make_standard_df()
        result = aggregate_marketing_data(df)
        # total_clicks = 21000, total_impressions = 750000
        expected_ctr = (21000.0 / 750000.0) * 100
        assert result.ctr is not None
        assert abs(result.ctr - expected_ctr) < 0.001

    def test_cpm_is_per_thousand(self):
        """CPM must be spend per 1,000 impressions."""
        df = self._make_standard_df()
        result = aggregate_marketing_data(df)
        expected_cpm = (18000.0 / 750000.0) * 1000
        assert result.cpm is not None
        assert abs(result.cpm - expected_cpm) < 0.001

    def test_campaign_breakdown_returns_top_by_spend(self):
        df = self._make_standard_df()
        result = aggregate_marketing_data(df)
        assert len(result.campaign_breakdown) > 0
        # Campaign with highest combined spend should be first
        first = result.campaign_breakdown[0]
        assert "campaign_name" in first
        assert "spend" in first

    def test_campaign_breakdown_capped_at_10(self):
        """Breakdown must return at most 10 campaigns."""
        campaigns = [f"Campaign {i}" for i in range(15)]
        df = pd.DataFrame(
            {
                "campaign_name": campaigns,
                "spend": [float(i * 100) for i in range(15)],
                "impressions": [float(i * 1000) for i in range(15)],
                "clicks": [float(i * 50) for i in range(15)],
                "conversions": [float(i) for i in range(15)],
                "conversion_value": [float(i * 500) for i in range(15)],
            }
        )
        result = aggregate_marketing_data(df)
        assert len(result.campaign_breakdown) <= 10

    def test_result_is_pulse_aggregation_model(self):
        df = self._make_standard_df()
        result = aggregate_marketing_data(df)
        assert isinstance(result, PulseAggregation)


# ---------------------------------------------------------------------------
# aggregate_marketing_data — edge cases
# ---------------------------------------------------------------------------


class TestAggregateMarketingDataEdgeCases:
    def test_empty_dataframe_returns_all_zeros(self):
        """Empty DataFrame must return zero totals and None for ratio metrics."""
        df = pd.DataFrame(
            columns=["campaign_name", "spend", "impressions", "clicks", "conversions", "conversion_value"]
        )
        result = aggregate_marketing_data(df)
        assert result.total_spend == 0.0
        assert result.total_impressions == 0.0
        assert result.total_clicks == 0.0
        assert result.total_conversions == 0.0
        assert result.total_conversion_value == 0.0
        assert result.roas is None
        assert result.cpa is None
        assert result.cpc is None
        assert result.ctr is None
        assert result.cpm is None

    def test_all_zero_metrics_does_not_crash(self):
        """A DataFrame where all spends and metrics are zero must not raise."""
        df = pd.DataFrame(
            {
                "campaign_name": ["Zero Campaign"],
                "spend": [0.0],
                "impressions": [0.0],
                "clicks": [0.0],
                "conversions": [0.0],
                "conversion_value": [0.0],
            }
        )
        result = aggregate_marketing_data(df)
        assert result.total_spend == 0.0
        assert result.roas is None
        assert result.cpc is None

    def test_nan_values_in_spend_are_handled(self):
        """NaN values in spend must not cause crashes or incorrect totals."""
        df = pd.DataFrame(
            {
                "campaign_name": ["Camp A", "Camp B"],
                "spend": [float("nan"), 5000.0],
                "impressions": [100000.0, 200000.0],
                "clicks": [1000.0, 2000.0],
                "conversions": [10.0, 20.0],
                "conversion_value": [5000.0, 10000.0],
            }
        )
        # Should not raise — NaN in sum() produces NaN or is treated as 0 by pandas
        result = aggregate_marketing_data(df)
        assert isinstance(result, PulseAggregation)

    def test_missing_optional_columns_produce_zero_totals(self):
        """If clicks/conversions/conversion_value columns are absent, they default to 0."""
        df = pd.DataFrame(
            {
                "campaign_name": ["Campaign Only Spend"],
                "spend": [2500.0],
                "impressions": [50000.0],
            }
        )
        result = aggregate_marketing_data(df)
        assert result.total_clicks == 0.0
        assert result.total_conversions == 0.0
        assert result.total_conversion_value == 0.0
        # CPA requires conversions: should be None
        assert result.cpa is None

    def test_thai_campaign_names_in_breakdown(self):
        """Thai campaign names must appear correctly in breakdown."""
        df = pd.DataFrame(
            {
                "campaign_name": ["แคมเปญฤดูร้อน 2024", "Q3 Promotion"],
                "spend": [15000.0, 8000.0],
                "impressions": [300000.0, 150000.0],
                "clicks": [6000.0, 3000.0],
                "conversions": [120.0, 60.0],
                "conversion_value": [60000.0, 30000.0],
            }
        )
        result = aggregate_marketing_data(df)
        campaign_names = [entry["campaign_name"] for entry in result.campaign_breakdown]
        assert "แคมเปญฤดูร้อน 2024" in campaign_names

    def test_single_row_dataframe(self):
        """Single-row DataFrame must work correctly."""
        df = pd.DataFrame(
            {
                "campaign_name": ["Single Campaign"],
                "spend": [10000.0],
                "impressions": [500000.0],
                "clicks": [15000.0],
                "conversions": [300.0],
                "conversion_value": [150000.0],
            }
        )
        result = aggregate_marketing_data(df)
        assert result.total_spend == 10000.0
        assert result.roas is not None
        assert abs(result.roas - 15.0) < 0.001  # 150000/10000

    def test_missing_campaign_name_column_returns_empty_breakdown(self):
        """If campaign_name is absent, breakdown must be empty list (not crash)."""
        df = pd.DataFrame(
            {
                "spend": [5000.0, 3000.0],
                "impressions": [100000.0, 50000.0],
            }
        )
        result = aggregate_marketing_data(df)
        assert result.campaign_breakdown == []

    def test_per_campaign_roas_computed_correctly(self):
        """Per-campaign ROAS in breakdown must be accurate."""
        df = pd.DataFrame(
            {
                "campaign_name": ["High ROAS Campaign"],
                "spend": [5000.0],
                "impressions": [100000.0],
                "clicks": [2000.0],
                "conversions": [50.0],
                "conversion_value": [25000.0],
            }
        )
        result = aggregate_marketing_data(df)
        assert len(result.campaign_breakdown) == 1
        campaign = result.campaign_breakdown[0]
        assert campaign.get("roas") is not None
        assert abs(campaign["roas"] - 5.0) < 0.001  # 25000/5000


# ---------------------------------------------------------------------------
# build_pulse_blocks — Block Kit structure validation
# ---------------------------------------------------------------------------


class TestBuildPulseBlocks:
    def _make_pulse_result(self, verdict: str = "green") -> PulseResult:
        return PulseResult(
            verdict=verdict,
            verdict_summary="ผลงานโดยรวมดีเยี่ยม ROAS 3.5x สูงกว่าเป้าหมาย",
            metrics_table=[
                {"metric": "ROAS", "value": "3.5x", "note": "above target"},
                {"metric": "CPA", "value": "฿333", "note": "within budget"},
                {"metric": "CTR", "value": "2.1%", "note": "normal"},
            ],
            winners=["Q1 Promo FB — ROAS 5.2x, spend ฿5,000"],
            losers=["Retargeting TikTok — CPA ฿800, above ฿500 target"],
            anomalies=["Google Ads CTR dropped 40% on 15 Jan vs previous week"],
            recommendations=["เพิ่ม budget ใน Q1 Promo FB อีก 20%", "หยุด Retargeting TikTok ชั่วคราว"],
        )

    def test_blocks_is_a_list(self):
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        assert isinstance(blocks, list)

    def test_blocks_not_empty(self):
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        assert len(blocks) > 0

    def test_first_block_is_header(self):
        """The first block must be type 'header'."""
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        assert blocks[0]["type"] == "header"

    def test_header_text_contains_pulse(self):
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        header_text = blocks[0]["text"]["text"]
        assert "Pulse" in header_text or "pulse" in header_text.lower()

    def test_last_block_is_divider(self):
        """The last block must be type 'divider'."""
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        assert blocks[-1]["type"] == "divider"

    def test_verdict_block_contains_verdict_summary(self):
        """A section block must contain the verdict summary text."""
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert "ผลงานโดยรวมดีเยี่ยม" in combined

    def test_green_verdict_uses_green_circle_emoji(self):
        pulse = self._make_pulse_result(verdict="green")
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert ":large_green_circle:" in combined

    def test_red_verdict_uses_red_circle_emoji(self):
        pulse = self._make_pulse_result(verdict="red")
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert ":red_circle:" in combined

    def test_yellow_verdict_uses_yellow_circle_emoji(self):
        pulse = self._make_pulse_result(verdict="yellow")
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert ":large_yellow_circle:" in combined

    def test_unknown_verdict_uses_fallback_emoji(self):
        pulse = self._make_pulse_result(verdict="unknown_status")
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert ":white_circle:" in combined

    def test_metrics_table_appears_as_preformatted_block(self):
        """Metrics table must appear in a code block (triple backtick)."""
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert "```" in combined

    def test_winners_section_present(self):
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert "Winners" in combined or "trophy" in combined

    def test_losers_section_present(self):
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert "Losers" in combined or "downwards_trend" in combined

    def test_recommendations_section_present(self):
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert "Recommendations" in combined or "bulb" in combined

    def test_anomalies_section_present(self):
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert "Anomalies" in combined or "warning" in combined

    def test_all_blocks_have_type_field(self):
        """Every block must have a 'type' field — required by Slack Block Kit spec."""
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        for i, block in enumerate(blocks):
            assert "type" in block, f"Block at index {i} is missing 'type'"

    def test_section_blocks_have_text_field(self):
        """Every section block must have a 'text' field."""
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        for block in blocks:
            if block["type"] == "section":
                assert "text" in block

    def test_text_fields_have_type_and_text(self):
        """Every text field must have 'type' and 'text' sub-fields."""
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        for block in blocks:
            if block.get("type") in ("section", "header"):
                text_obj = block.get("text", {})
                assert "type" in text_obj
                assert "text" in text_obj

    def test_empty_sections_are_omitted(self):
        """Blocks for empty winners/losers/anomalies must not be added."""
        pulse = PulseResult(
            verdict="green",
            verdict_summary="All good",
            metrics_table=[],
            winners=[],
            losers=[],
            anomalies=[],
            recommendations=[],
        )
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        # No winners block if winners list is empty
        assert "trophy" not in combined
        assert "downwards_trend" not in combined

    def test_recommendations_are_numbered(self):
        """Recommendations must be numbered (1., 2., etc.)."""
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert "1." in combined
        assert "2." in combined

    def test_thai_text_in_blocks_is_preserved(self):
        """Thai text in verdict_summary must appear correctly in blocks."""
        pulse = self._make_pulse_result()
        blocks = build_pulse_blocks(pulse)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section" and "text" in b
        ]
        combined = " ".join(section_texts)
        assert "ผลงานโดยรวมดีเยี่ยม" in combined


# ---------------------------------------------------------------------------
# GA4Config model validation
# ---------------------------------------------------------------------------


class TestGA4ConfigModel:
    def test_valid_config_creates_model(self):
        from common.model.common import DateTimeConfig
        from common.model.google.ga4 import GA4Config

        config = GA4Config(
            connection_id="conn-123",
            property_id="properties/987654321",
            dimensions=["date", "sessionSource"],
            metrics=["sessions", "purchaseRevenue"],
            time_config=DateTimeConfig(time_preset="last_7_days"),
        )
        assert config.property_id == "properties/987654321"
        assert "date" in config.dimensions
        assert "sessions" in config.metrics

    def test_bare_property_id_is_accepted(self):
        """GA4Config must accept bare numeric property ID (normalization happens in extractor)."""
        from common.model.common import DateTimeConfig
        from common.model.google.ga4 import GA4Config

        config = GA4Config(
            connection_id="conn-123",
            property_id="123456789",
            dimensions=["date"],
            metrics=["sessions"],
            time_config=DateTimeConfig(time_preset="last_30_days"),
        )
        assert config.property_id == "123456789"

    def test_empty_dimensions_is_valid(self):
        """GA4Config allows empty dimensions list (e.g., global totals report)."""
        from common.model.common import DateTimeConfig
        from common.model.google.ga4 import GA4Config

        config = GA4Config(
            connection_id="conn-123",
            property_id="123",
            dimensions=[],
            metrics=["sessions"],
            time_config=DateTimeConfig(time_preset="last_7_days"),
        )
        assert config.dimensions == []

    def test_missing_property_id_raises(self):
        """property_id is required — missing it must raise a ValidationError."""
        from pydantic import ValidationError
        from common.model.common import DateTimeConfig
        from common.model.google.ga4 import GA4Config

        with pytest.raises(ValidationError):
            GA4Config(
                connection_id="conn-123",
                dimensions=["date"],
                metrics=["sessions"],
                time_config=DateTimeConfig(time_preset="last_7_days"),
            )

    def test_missing_connection_id_raises(self):
        """connection_id is required — missing it must raise a ValidationError."""
        from pydantic import ValidationError
        from common.model.common import DateTimeConfig
        from common.model.google.ga4 import GA4Config

        with pytest.raises(ValidationError):
            GA4Config(
                property_id="123",
                dimensions=["date"],
                metrics=["sessions"],
                time_config=DateTimeConfig(time_preset="last_7_days"),
            )
