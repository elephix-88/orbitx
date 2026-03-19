from pydantic import BaseModel


class BaseConnectionParams(BaseModel):
    """Base model for OAuth connection parameters."""

    access_token: str
    token_type: str | None = None
    expires_in: int | None = None


class GoogleConnectionParams(BaseConnectionParams):
    """OAuth connection parameters for Google services."""

    refresh_token: str
    scope: str


class FacebookConnectionParams(BaseConnectionParams):
    """OAuth connection parameters for Facebook services."""

    pass


class TikTokConnectionParams(BaseConnectionParams):
    """OAuth connection parameters for TikTok services."""

    advertiser_ids: list[str]
    refresh_token: str | None = None
