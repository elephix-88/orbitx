"""Tests for LineDeliverer — text message formatting and delivery."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest

from common.model.delivery import LineChannelConfig
from engine.exceptions import DelivererException
from engine.node.deliverers.line_deliverer import MAX_TOP_CAMPAIGNS, LineDeliverer


def make_config() -> LineChannelConfig:
    return LineChannelConfig(
        access_token="line-channel-access-token-abc123",
        to="U1234567890abcdef",
    )


def make_campaign_dataframe(rows: int = 4) -> pd.DataFrame:
    """Realistic multi-campaign DataFrame matching ad platform output."""
    return pd.DataFrame(
        {
            "campaign_name": [f"Retargeting Wave {i}" for i in range(1, rows + 1)],
            "spend": [3000.0 - i * 200 for i in range(rows)],
            "impressions": [100000 + i * 5000 for i in range(rows)],
            "clicks": [2500 + i * 100 for i in range(rows)],
            "roas": [4.0 - i * 0.2 for i in range(rows)],
        }
    )


FIXED_TIME = datetime(2025, 3, 25, 9, 0, 0)


# ---------------------------------------------------------------------------
# Unit tests — _build_message and helper methods
# ---------------------------------------------------------------------------


class TestLineDelivererBuildMessage:
    """Tests for the _build_message private method."""

    def test_message_contains_workflow_name(self):
        """Workflow name must appear in the message."""
        deliverer = LineDeliverer(make_config())
        message = deliverer.build_message(
            make_campaign_dataframe(), "Weekly TikTok Report", FIXED_TIME
        )
        assert "Weekly TikTok Report" in message

    def test_message_contains_execution_time(self):
        """Formatted execution time must appear in the message."""
        deliverer = LineDeliverer(make_config())
        message = deliverer.build_message(
            make_campaign_dataframe(), "Report", FIXED_TIME
        )
        assert "2025-03-25 09:00:00" in message

    def test_message_contains_row_count(self):
        """Row count must appear in the header section."""
        deliverer = LineDeliverer(make_config())
        df = make_campaign_dataframe(7)
        message = deliverer.build_message(df, "Report", FIXED_TIME)
        assert "Rows: 7" in message

    def test_empty_dataframe_message_shows_no_data(self):
        """Empty DataFrame must produce 'No data available.' in the message."""
        deliverer = LineDeliverer(make_config())
        message = deliverer.build_message(pd.DataFrame(), "Report", FIXED_TIME)
        assert "No data available." in message

    def test_message_contains_orbitx_branding(self):
        """Message must include the [OrbitX] brand prefix."""
        deliverer = LineDeliverer(make_config())
        message = deliverer.build_message(
            make_campaign_dataframe(), "Report", FIXED_TIME
        )
        assert "[OrbitX]" in message


class TestLineDelivererBuildTopCampaigns:
    """Tests for the _build_top_campaigns private method."""

    def test_top_campaigns_sorted_by_spend_descending(self):
        """Campaigns must be ranked by highest spend first."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame(
            {
                "campaign_name": ["Low Budget", "High Budget", "Mid Budget"],
                "spend": [500.0, 5000.0, 2000.0],
                "roas": [2.0, 4.5, 3.1],
            }
        )
        lines = deliverer.build_top_campaigns(df)
        # First entry must be "High Budget"
        assert "High Budget" in lines[0]
        assert lines[0].startswith("1.")

    def test_top_campaigns_capped_at_max(self):
        """Must return at most MAX_TOP_CAMPAIGNS entries."""
        deliverer = LineDeliverer(make_config())
        df = make_campaign_dataframe(MAX_TOP_CAMPAIGNS + 5)
        lines = deliverer.build_top_campaigns(df)
        assert len(lines) <= MAX_TOP_CAMPAIGNS

    def test_top_campaigns_returns_empty_when_campaign_name_missing(self):
        """Missing campaign_name column must return empty list without error."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame({"spend": [1000.0, 2000.0]})
        lines = deliverer.build_top_campaigns(df)
        assert lines == []

    def test_top_campaigns_returns_empty_when_spend_missing(self):
        """Missing spend column must return empty list without error."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame({"campaign_name": ["A", "B"]})
        lines = deliverer.build_top_campaigns(df)
        assert lines == []

    def test_campaign_line_includes_spend_value(self):
        """Each campaign line must include the formatted spend value."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame(
            {
                "campaign_name": ["Black Friday Sale"],
                "spend": [12345.67],
            }
        )
        lines = deliverer.build_top_campaigns(df)
        assert "12,345.67" in lines[0]

    def test_campaign_line_includes_roas_when_present(self):
        """Each campaign line must include ROAS when the column exists."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame(
            {
                "campaign_name": ["Summer Sale"],
                "spend": [3000.0],
                "roas": [4.2],
            }
        )
        lines = deliverer.build_top_campaigns(df)
        assert "4.2x ROAS" in lines[0]

    def test_nan_roas_excluded_from_campaign_line(self):
        """NaN roas value must not produce a 'Xx ROAS' fragment in the line."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame(
            {
                "campaign_name": ["No Data Campaign"],
                "spend": [1000.0],
                "roas": [float("nan")],
            }
        )
        lines = deliverer.build_top_campaigns(df)
        # The "Xx ROAS" fragment must not appear — campaign name does not contain "ROAS"
        assert "x ROAS" not in lines[0]
        assert "nan" not in lines[0].lower()

    def test_thai_campaign_names_in_ranking(self):
        """Thai Unicode campaign names must render correctly in ranked list."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame(
            {
                "campaign_name": ["แคมเปญฤดูร้อน", "โปรโมชั่นปีใหม่"],
                "spend": [5000.0, 3000.0],
                "roas": [3.8, 4.2],
            }
        )
        lines = deliverer.build_top_campaigns(df)
        assert "แคมเปญฤดูร้อน" in lines[0]
        assert "โปรโมชั่นปีใหม่" in lines[1]

    def test_campaigns_aggregated_before_ranking(self):
        """Multiple rows with the same campaign_name must be summed before ranking."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame(
            {
                "campaign_name": ["Promo A", "Promo A", "Promo B"],
                "spend": [1000.0, 2000.0, 4000.0],
            }
        )
        lines = deliverer.build_top_campaigns(df)
        # Promo A total = 3000, Promo B = 4000 → Promo B ranks first
        assert "Promo B" in lines[0]
        assert "4,000.00" in lines[0]


class TestLineDelivererBuildSummary:
    """Tests for the _build_summary private method."""

    def test_summary_includes_total_spend(self):
        """Total spend must appear in summary."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame({"spend": [2000.0, 3000.0]})
        summary = deliverer.build_summary(df)
        assert "5,000.00 spend" in summary

    def test_summary_includes_total_impressions(self):
        """Total impressions must appear in summary."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame({"impressions": [100000, 200000]})
        summary = deliverer.build_summary(df)
        assert "300,000 impressions" in summary

    def test_summary_includes_total_clicks(self):
        """Total clicks must appear in summary."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame({"clicks": [1000, 2000]})
        summary = deliverer.build_summary(df)
        assert "3,000 clicks" in summary

    def test_summary_returns_empty_when_no_metric_columns(self):
        """No recognized columns → empty string (not an error)."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame({"campaign_name": ["A"]})
        summary = deliverer.build_summary(df)
        assert summary == ""

    def test_summary_prefixed_with_total_label(self):
        """Summary line must start with 'Total:'."""
        deliverer = LineDeliverer(make_config())
        df = pd.DataFrame({"spend": [1000.0]})
        summary = deliverer.build_summary(df)
        assert summary.startswith("Total:")


# ---------------------------------------------------------------------------
# Integration tests — deliver() method with mocked HTTP
# ---------------------------------------------------------------------------


class TestLineDelivererDeliver:
    """Tests for the deliver() method — mocked HTTP."""

    @pytest.mark.asyncio
    async def test_successful_delivery_returns_true(self):
        """200 response must return True."""
        deliverer = LineDeliverer(make_config())

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        with patch("engine.node.deliverers.line_deliverer.httpx.AsyncClient") as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            result = await deliverer.deliver(
                make_campaign_dataframe(), "Weekly LINE Report", FIXED_TIME
            )

        assert result is True

    @pytest.mark.asyncio
    async def test_http_error_raises_deliverer_exception(self):
        """Network errors must be wrapped in DelivererException."""
        deliverer = LineDeliverer(make_config())

        with patch("engine.node.deliverers.line_deliverer.httpx.AsyncClient") as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.side_effect = Exception("API unreachable")
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            with pytest.raises(DelivererException) as exc_info:
                await deliverer.deliver(
                    make_campaign_dataframe(), "Report", FIXED_TIME
                )

        assert exc_info.value.delivery_channel == "line"

    @pytest.mark.asyncio
    async def test_correct_authorization_header_sent(self):
        """Bearer token must be sent in the Authorization header."""
        config = make_config()
        deliverer = LineDeliverer(config)

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        with patch("engine.node.deliverers.line_deliverer.httpx.AsyncClient") as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            await deliverer.deliver(
                make_campaign_dataframe(), "Report", FIXED_TIME
            )

            call_kwargs = mock_async_client.post.call_args
            assert call_kwargs.kwargs["headers"]["Authorization"] == f"Bearer {config.access_token}"

    @pytest.mark.asyncio
    async def test_correct_recipient_sent_in_payload(self):
        """The 'to' field from config must appear in the POST payload."""
        config = make_config()
        deliverer = LineDeliverer(config)

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        with patch("engine.node.deliverers.line_deliverer.httpx.AsyncClient") as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            await deliverer.deliver(
                make_campaign_dataframe(), "Report", FIXED_TIME
            )

            call_kwargs = mock_async_client.post.call_args
            assert call_kwargs.kwargs["json"]["to"] == config.to

    @pytest.mark.asyncio
    async def test_message_type_is_text(self):
        """LINE API payload must contain a message with type='text'."""
        deliverer = LineDeliverer(make_config())

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        with patch("engine.node.deliverers.line_deliverer.httpx.AsyncClient") as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            await deliverer.deliver(
                make_campaign_dataframe(), "Report", FIXED_TIME
            )

            call_kwargs = mock_async_client.post.call_args
            messages = call_kwargs.kwargs["json"]["messages"]
            assert messages[0]["type"] == "text"

    @pytest.mark.asyncio
    async def test_empty_dataframe_still_delivers(self):
        """Empty DataFrame must still send a message (not silently skip)."""
        deliverer = LineDeliverer(make_config())

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        with patch("engine.node.deliverers.line_deliverer.httpx.AsyncClient") as mock_client_class:
            mock_async_client = AsyncMock()
            mock_async_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_async_client

            result = await deliverer.deliver(pd.DataFrame(), "Empty Report", FIXED_TIME)

        assert result is True
        mock_async_client.post.assert_called_once()
