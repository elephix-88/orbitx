"""Tests for delivery Pydantic models."""

import pytest
from pydantic import ValidationError

from common.model.delivery import (
    DeliveryChannel,
    DeliveryConfig,
    LineChannelConfig,
    SlackChannelConfig,
)


class TestSlackChannelConfig:
    """Tests for SlackChannelConfig validation."""

    def test_valid_slack_config(self):
        """Happy path: all required fields provided."""
        config = SlackChannelConfig(
            channel_id="C012AB3CD",
            channel_name="marketing-alerts",
            bot_token="xoxb-test-token-12345",
        )
        assert config.channel_id == "C012AB3CD"
        assert config.channel_name == "marketing-alerts"
        assert config.bot_token == "xoxb-test-token-12345"
        assert config.channel == DeliveryChannel.SLACK

    def test_channel_defaults_to_slack(self):
        """channel field must default to DeliveryChannel.SLACK."""
        config = SlackChannelConfig(
            channel_id="C012AB3CD",
            channel_name="reports",
            bot_token="xoxb-token",
        )
        assert config.channel == DeliveryChannel.SLACK

    def test_missing_channel_id_raises(self):
        """channel_id is required — omitting it should raise ValidationError."""
        with pytest.raises(ValidationError):
            SlackChannelConfig(
                channel_name="reports",
                bot_token="xoxb-token",
            )  # type: ignore[call-arg]

    def test_missing_channel_name_raises(self):
        """channel_name is required."""
        with pytest.raises(ValidationError):
            SlackChannelConfig(
                channel_id="C012AB3CD",
                bot_token="xoxb-token",
            )  # type: ignore[call-arg]

    def test_missing_bot_token_raises(self):
        """bot_token is required."""
        with pytest.raises(ValidationError):
            SlackChannelConfig(
                channel_id="C012AB3CD",
                channel_name="reports",
            )  # type: ignore[call-arg]

    def test_thai_channel_name(self):
        """Thai Unicode characters in channel_name must not cause issues."""
        config = SlackChannelConfig(
            channel_id="C099XYZ",
            channel_name="รายงาน-การตลาด",
            bot_token="xoxb-token",
        )
        assert config.channel_name == "รายงาน-การตลาด"


class TestLineChannelConfig:
    """Tests for LineChannelConfig validation."""

    def test_valid_line_config(self):
        """Happy path: all required fields provided."""
        config = LineChannelConfig(
            access_token="line-channel-access-token-abc123",
            to="U1234567890abcdef",
        )
        assert config.access_token == "line-channel-access-token-abc123"
        assert config.to == "U1234567890abcdef"
        assert config.channel == DeliveryChannel.LINE

    def test_channel_defaults_to_line(self):
        """channel field must default to DeliveryChannel.LINE."""
        config = LineChannelConfig(
            access_token="token",
            to="Uabc123",
        )
        assert config.channel == DeliveryChannel.LINE

    def test_missing_access_token_raises(self):
        """access_token is required."""
        with pytest.raises(ValidationError):
            LineChannelConfig(to="Uabc123")  # type: ignore[call-arg]

    def test_missing_to_raises(self):
        """to (recipient ID) is required."""
        with pytest.raises(ValidationError):
            LineChannelConfig(access_token="token")  # type: ignore[call-arg]

    def test_thai_group_id(self):
        """GROUP IDs for LINE groups (Thai agencies often share a group) must work."""
        config = LineChannelConfig(
            access_token="token-abc",
            to="C1234567890abcdef",  # Group ID starts with C
        )
        assert config.to == "C1234567890abcdef"


class TestDeliveryConfig:
    """Tests for DeliveryConfig validation."""

    def test_valid_config_with_slack(self):
        """DeliveryConfig with a single Slack channel."""
        config = DeliveryConfig(
            channels=[
                SlackChannelConfig(
                    channel_id="C012AB3CD",
                    channel_name="marketing-alerts",
                    bot_token="xoxb-token",
                )
            ]
        )
        assert len(config.channels) == 1
        assert isinstance(config.channels[0], SlackChannelConfig)
        assert config.include_ai_summary is False

    def test_valid_config_with_line(self):
        """DeliveryConfig with a single LINE channel."""
        config = DeliveryConfig(
            channels=[
                LineChannelConfig(
                    access_token="line-token",
                    to="U1234567890",
                )
            ]
        )
        assert len(config.channels) == 1
        assert isinstance(config.channels[0], LineChannelConfig)

    def test_valid_config_with_both_channels(self):
        """DeliveryConfig with both Slack and LINE channels."""
        config = DeliveryConfig(
            channels=[
                SlackChannelConfig(
                    channel_id="C012AB3CD",
                    channel_name="marketing-alerts",
                    bot_token="xoxb-token",
                ),
                LineChannelConfig(
                    access_token="line-token",
                    to="U1234567890",
                ),
            ]
        )
        assert len(config.channels) == 2

    def test_empty_channels_list_is_valid(self):
        """An empty channels list should be valid (delivery not yet configured)."""
        config = DeliveryConfig(channels=[])
        assert config.channels == []

    def test_include_ai_summary_defaults_false(self):
        """include_ai_summary must default to False."""
        config = DeliveryConfig(channels=[])
        assert config.include_ai_summary is False

    def test_include_ai_summary_can_be_enabled(self):
        """include_ai_summary can be set to True."""
        config = DeliveryConfig(channels=[], include_ai_summary=True)
        assert config.include_ai_summary is True

    def test_missing_channels_field_raises(self):
        """channels field is required."""
        with pytest.raises(ValidationError):
            DeliveryConfig()  # type: ignore[call-arg]

    def test_model_serializes_correctly(self):
        """model_dump() must produce the shape the engine expects."""
        config = DeliveryConfig(
            channels=[
                SlackChannelConfig(
                    channel_id="C012",
                    channel_name="alerts",
                    bot_token="xoxb-t",
                )
            ],
            include_ai_summary=True,
        )
        data = config.model_dump()
        assert "channels" in data
        assert data["include_ai_summary"] is True
        assert data["channels"][0]["channel_id"] == "C012"
