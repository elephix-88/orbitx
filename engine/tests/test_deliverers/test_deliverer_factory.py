"""Tests for the deliverer factory — correct class returned per channel type."""

import pytest

from common.model.delivery import (
    DeliveryChannel,
    LineChannelConfig,
    SlackChannelConfig,
)
from engine.node.deliverers.factory import create_deliverer
from engine.node.deliverers.line_deliverer import LineDeliverer
from engine.node.deliverers.slack_deliverer import SlackDeliverer


class TestCreateDeliverer:
    """Tests for create_deliverer factory function."""

    def test_slack_config_returns_slack_deliverer(self):
        """SlackChannelConfig must produce a SlackDeliverer instance."""
        config = SlackChannelConfig(
            channel_id="C012AB3CD",
            channel_name="marketing-alerts",
            bot_token="xoxb-token",
        )
        deliverer = create_deliverer(config)
        assert isinstance(deliverer, SlackDeliverer)

    def test_line_config_returns_line_deliverer(self):
        """LineChannelConfig must produce a LineDeliverer instance."""
        config = LineChannelConfig(
            access_token="line-token",
            to="U1234567890",
        )
        deliverer = create_deliverer(config)
        assert isinstance(deliverer, LineDeliverer)

    def test_slack_deliverer_carries_config(self):
        """The returned SlackDeliverer must hold the original config."""
        config = SlackChannelConfig(
            channel_id="C999",
            channel_name="reports",
            bot_token="xoxb-prod-token",
        )
        deliverer = create_deliverer(config)
        assert deliverer.config is config  # type: ignore[union-attr]

    def test_line_deliverer_carries_config(self):
        """The returned LineDeliverer must hold the original config."""
        config = LineChannelConfig(
            access_token="line-prod-token",
            to="Uabc",
        )
        deliverer = create_deliverer(config)
        assert deliverer.config is config  # type: ignore[union-attr]

    def test_unsupported_channel_raises_value_error(self):
        """A config with an unrecognised channel type must raise ValueError.

        We simulate this by creating a valid config and patching its channel
        attribute to an unsupported value — exercising the factory's guard clause.
        """
        config = SlackChannelConfig(
            channel_id="C012",
            channel_name="test",
            bot_token="token",
        )
        # Patch the channel attribute to something the factory doesn't know
        object.__setattr__(config, "channel", "whatsapp")  # type: ignore[arg-type]

        with pytest.raises(ValueError, match="Unsupported delivery channel"):
            create_deliverer(config)  # type: ignore[arg-type]

    def test_factory_returns_new_instance_per_call(self):
        """Each call to create_deliverer must return a distinct object."""
        config = SlackChannelConfig(
            channel_id="C012",
            channel_name="alerts",
            bot_token="xoxb-token",
        )
        deliverer_a = create_deliverer(config)
        deliverer_b = create_deliverer(config)
        assert deliverer_a is not deliverer_b
