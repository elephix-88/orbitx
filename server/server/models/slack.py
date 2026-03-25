from pydantic import BaseModel


class SlackChannel(BaseModel):
    id: str
    name: str


class SlackChannelsResponse(BaseModel):
    channels: list[SlackChannel]


class SlackAuthorizeResponse(BaseModel):
    oauth_url: str
