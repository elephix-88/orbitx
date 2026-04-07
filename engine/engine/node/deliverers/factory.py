from common.model.delivery import (
    DeliveryChannel,
    SlackChannelConfig,
)
from engine.node.deliverers.base import Deliverer
from engine.node.deliverers.slack_deliverer import SlackDeliverer


def create_deliverer(
    channel_config: SlackChannelConfig,
) -> Deliverer:
    """Create a deliverer instance from a channel config.

    Args:
        channel_config: The channel-specific configuration (Slack).

    Returns:
        A Deliverer instance ready to deliver results.

    Raises:
        ValueError: If the channel type is not supported.
    """
    deliverers = {
        DeliveryChannel.SLACK: SlackDeliverer,
    }

    deliverer_class = deliverers.get(channel_config.channel)
    if not deliverer_class:
        raise ValueError(f"Unsupported delivery channel: {channel_config.channel}")

    return deliverer_class(channel_config)
