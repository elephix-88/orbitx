"""Tests for SlackDeliverer — Block Kit formatting and delivery."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest

from common.model.delivery import SlackChannelConfig
from engine.exceptions import DelivererException
from engine.node.deliverers.slack_deliverer import MAX_TABLE_ROWS, SlackDeliverer


def make_config() -> SlackChannelConfig:
    return SlackChannelConfig(
        channel_id="C012AB3CD",
        channel_name="marketing-alerts",
        bot_token="xoxb-test-token",
    )


def make_campaign_dataframe(rows: int = 3) -> pd.DataFrame:
    """Realistic marketing DataFrame with standard ad platform columns."""
    return pd.DataFrame(
        {
            "campaign_name": [f"Summer Sale Q{i}" for i in range(1, rows + 1)],
            "spend": [1500.0 + i * 100 for i in range(rows)],
            "impressions": [50000 + i * 1000 for i in range(rows)],
            "clicks": [1200 + i * 50 for i in range(rows)],
            "conversions": [45.0 + i * 2 for i in range(rows)],
            "roas": [3.5 + i * 0.1 for i in range(rows)],
        }
    )


FIXED_TIME = datetime(2025, 3, 25, 9, 0, 0)


# ---------------------------------------------------------------------------
# Unit tests — message formatting (no HTTP calls)
# ---------------------------------------------------------------------------


class TestSlackDelivererBuildTable:
    """Tests for the _build_table private method."""

    def test_empty_dataframe_returns_no_data_message(self):
        """An empty DataFrame must produce the sentinel 'no data' string."""
        deliverer = SlackDeliverer(make_config())
        result = deliverer.build_table(pd.DataFrame())
        assert result == "_No data available._"

    def test_standard_columns_appear_in_table(self):
        """Priority columns (campaign_name, spend, roas) must appear as headers."""
        deliverer = SlackDeliverer(make_config())
        df = make_campaign_dataframe(3)
        table = deliverer.build_table(df)
        assert "campaign_name" in table
        assert "spend" in table
        assert "roas" in table

    def test_table_truncates_at_max_rows(self):
        """DataFrames exceeding MAX_TABLE_ROWS must include a truncation note."""
        deliverer = SlackDeliverer(make_config())
        df = make_campaign_dataframe(MAX_TABLE_ROWS + 10)
        table = deliverer.build_table(df)
        assert "10 more rows" in table

    def test_table_does_not_truncate_when_at_limit(self):
        """Exactly MAX_TABLE_ROWS rows must not produce a truncation note."""
        deliverer = SlackDeliverer(make_config())
        df = make_campaign_dataframe(MAX_TABLE_ROWS)
        table = deliverer.build_table(df)
        assert "more rows" not in table

    def test_nan_spend_renders_as_dash(self):
        """NaN values in spend column must render as '-' not 'nan'."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame(
            {
                "campaign_name": ["Retargeting Aug"],
                "spend": [float("nan")],
                "impressions": [10000],
                "roas": [float("nan")],
            }
        )
        table = deliverer.build_table(df)
        assert "nan" not in table.lower()
        assert "-" in table

    def test_thai_campaign_name_renders_correctly(self):
        """Thai Unicode campaign names must appear verbatim in the table."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame(
            {
                "campaign_name": ["แคมเปญฤดูร้อน", "โปรโมชั่นปีใหม่"],
                "spend": [2500.0, 1800.0],
                "impressions": [75000, 52000],
                "roas": [4.2, 3.8],
            }
        )
        table = deliverer.build_table(df)
        assert "แคมเปญฤดูร้อน" in table
        assert "โปรโมชั่นปีใหม่" in table

    def test_float_values_formatted_with_two_decimal_places(self):
        """Float values must be formatted as 'X,XXX.XX'."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame({"spend": [12345.678], "campaign_name": ["Test"]})
        table = deliverer.build_table(df)
        assert "12,345.68" in table

    def test_columns_not_in_priority_list_still_render(self):
        """When no priority columns are present, first 6 columns must be shown."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame(
            {
                "platform": ["facebook"],
                "account_id": ["act_123"],
                "date": ["2025-03-25"],
                "status": ["active"],
                "budget": [500.0],
                "objective": ["conversions"],
                "extra_col": ["ignore_me"],
            }
        )
        table = deliverer.build_table(df)
        # Should include first 6 columns
        assert "platform" in table
        assert "account_id" in table

    def test_fifty_plus_rows_truncates_to_twenty(self):
        """50-row DataFrame must show MAX_TABLE_ROWS rows and note the remainder."""
        deliverer = SlackDeliverer(make_config())
        df = make_campaign_dataframe(50)
        table = deliverer.build_table(df)
        # 50 - 20 = 30 more rows
        assert "30 more rows" in table


class TestSlackDelivererBuildSummary:
    """Tests for the _build_summary private method."""

    def test_empty_dataframe_returns_empty_string(self):
        """Empty DataFrame must return empty summary string."""
        deliverer = SlackDeliverer(make_config())
        result = deliverer.build_summary(pd.DataFrame())
        assert result == ""

    def test_summary_includes_total_spend(self):
        """Total spend across all rows must appear in the summary."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame({"spend": [1000.0, 2000.0, 500.0]})
        summary = deliverer.build_summary(df)
        assert "3,500.00" in summary

    def test_summary_includes_total_impressions(self):
        """Total impressions must appear in the summary."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame({"impressions": [50000, 75000]})
        summary = deliverer.build_summary(df)
        assert "125,000" in summary

    def test_summary_includes_average_roas(self):
        """Average ROAS across campaigns must appear in the summary."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame({"roas": [3.0, 5.0]})
        summary = deliverer.build_summary(df)
        assert "4.00x" in summary

    def test_all_roas_nan_excludes_roas_from_summary(self):
        """When all roas values are NaN, the summary must not include ROAS."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame({"roas": [float("nan"), float("nan")]})
        summary = deliverer.build_summary(df)
        assert "ROAS" not in summary

    def test_summary_returns_empty_when_no_known_columns(self):
        """DataFrame with no recognized metric columns must return empty summary."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame({"campaign_name": ["A", "B"]})
        summary = deliverer.build_summary(df)
        assert summary == ""

    def test_nan_spend_excluded_from_total(self):
        """NaN spend values must be skipped when computing the total."""
        deliverer = SlackDeliverer(make_config())
        df = pd.DataFrame({"spend": [1000.0, float("nan"), 500.0]})
        summary = deliverer.build_summary(df)
        # pandas sum skips NaN by default → total should be 1500
        assert "1,500.00" in summary


class TestSlackDelivererBuildBlocks:
    """Tests for the _build_blocks private method (Block Kit structure)."""

    def test_blocks_contain_header_block(self):
        """The first block must be type 'header' containing the workflow name."""
        deliverer = SlackDeliverer(make_config())
        blocks = deliverer.build_blocks(
            make_campaign_dataframe(), "Weekly FB Report", FIXED_TIME
        )
        assert blocks[0]["type"] == "header"
        assert "Weekly FB Report" in blocks[0]["text"]["text"]

    def test_blocks_contain_context_with_row_count(self):
        """The context block must show the execution time and row count."""
        deliverer = SlackDeliverer(make_config())
        df = make_campaign_dataframe(5)
        blocks = deliverer.build_blocks(df, "Report", FIXED_TIME)
        context_block = next(b for b in blocks if b["type"] == "context")
        text = context_block["elements"][0]["text"]
        assert "Rows: 5" in text
        assert "2025-03-25" in text

    def test_blocks_contain_divider(self):
        """At least one divider block must be present."""
        deliverer = SlackDeliverer(make_config())
        blocks = deliverer.build_blocks(
            make_campaign_dataframe(), "Report", FIXED_TIME
        )
        assert any(b["type"] == "divider" for b in blocks)

    def test_blocks_contain_section_with_table(self):
        """A section block with mrkdwn must contain the table markdown."""
        deliverer = SlackDeliverer(make_config())
        blocks = deliverer.build_blocks(
            make_campaign_dataframe(), "Report", FIXED_TIME
        )
        section_blocks = [b for b in blocks if b["type"] == "section"]
        assert len(section_blocks) >= 1
        assert section_blocks[0]["text"]["type"] == "mrkdwn"

    def test_empty_dataframe_blocks_do_not_include_summary(self):
        """Empty DataFrame must not add a summary section block."""
        deliverer = SlackDeliverer(make_config())
        blocks = deliverer.build_blocks(pd.DataFrame(), "Report", FIXED_TIME)
        section_texts = [
            b["text"]["text"]
            for b in blocks
            if b["type"] == "section"
        ]
        assert not any("Summary:" in t for t in section_texts)


# ---------------------------------------------------------------------------
# Integration tests — deliver() method with mocked HTTP
# ---------------------------------------------------------------------------


class TestSlackDelivererDeliver:
    """Tests for the deliver() method — mocked HTTP."""

    @pytest.mark.asyncio
    async def test_successful_delivery_returns_true(self):
        """A 200 OK response with ok=true must return True."""
        deliverer = SlackDeliverer(make_config())

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"ok": True}

        with patch(
            "engine.node.deliverers.slack_deliverer.httpx.AsyncClient"
        ) as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            result = await deliverer.deliver(
                make_campaign_dataframe(), "Weekly Report", FIXED_TIME
            )

        assert result is True

    @pytest.mark.asyncio
    async def test_slack_api_error_response_raises_deliverer_exception(self):
        """Slack API returning ok=false must raise DelivererException."""
        deliverer = SlackDeliverer(make_config())

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"ok": False, "error": "channel_not_found"}

        with patch(
            "engine.node.deliverers.slack_deliverer.httpx.AsyncClient"
        ) as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            with pytest.raises(DelivererException) as exc_info:
                await deliverer.deliver(
                    make_campaign_dataframe(), "Weekly Report", FIXED_TIME
                )

        assert "channel_not_found" in str(exc_info.value)
        assert exc_info.value.delivery_channel == "slack"

    @pytest.mark.asyncio
    async def test_http_error_raises_deliverer_exception(self):
        """A network error (e.g., timeout) must be wrapped in DelivererException."""
        deliverer = SlackDeliverer(make_config())

        with patch(
            "engine.node.deliverers.slack_deliverer.httpx.AsyncClient"
        ) as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.side_effect = Exception("Connection timeout")
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            with pytest.raises(DelivererException) as exc_info:
                await deliverer.deliver(
                    make_campaign_dataframe(), "Weekly Report", FIXED_TIME
                )

        assert exc_info.value.delivery_channel == "slack"

    @pytest.mark.asyncio
    async def test_correct_authorization_header_sent(self):
        """The Bearer token must be sent in the Authorization header."""
        config = make_config()
        deliverer = SlackDeliverer(config)

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"ok": True}

        with patch(
            "engine.node.deliverers.slack_deliverer.httpx.AsyncClient"
        ) as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            await deliverer.deliver(
                make_campaign_dataframe(), "Test Report", FIXED_TIME
            )

            call_kwargs = mock_async_client.post.call_args
            auth_header = call_kwargs.kwargs["headers"]["Authorization"]
            assert auth_header == f"Bearer {config.bot_token}"

    @pytest.mark.asyncio
    async def test_correct_channel_id_sent_in_payload(self):
        """The channel_id from config must appear in the POST payload."""
        config = make_config()
        deliverer = SlackDeliverer(config)

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"ok": True}

        with patch(
            "engine.node.deliverers.slack_deliverer.httpx.AsyncClient"
        ) as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            await deliverer.deliver(
                make_campaign_dataframe(), "Test Report", FIXED_TIME
            )

            call_kwargs = mock_async_client.post.call_args
            assert call_kwargs.kwargs["json"]["channel"] == config.channel_id

    @pytest.mark.asyncio
    async def test_empty_dataframe_still_sends_message(self):
        """Empty DataFrame must not skip the HTTP call — it should still deliver."""
        deliverer = SlackDeliverer(make_config())

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {"ok": True}

        with patch(
            "engine.node.deliverers.slack_deliverer.httpx.AsyncClient"
        ) as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            result = await deliverer.deliver(pd.DataFrame(), "Empty Report", FIXED_TIME)

        assert result is True
        mock_async_client.post.assert_called_once()
