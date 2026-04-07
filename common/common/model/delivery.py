from enum import StrEnum

from pydantic import BaseModel


class DeliveryChannel(StrEnum):
    SLACK = "slack"
    LINE = "line"


class SlackChannelConfig(BaseModel):
    channel: DeliveryChannel = DeliveryChannel.SLACK
    channel_id: str
    channel_name: str
    bot_token: str


class LineChannelConfig(BaseModel):
    channel: DeliveryChannel = DeliveryChannel.LINE
    access_token: str
    to: str


class DeliveryConfig(BaseModel):
    channels: list[SlackChannelConfig | LineChannelConfig]
    include_ai_summary: bool = False
