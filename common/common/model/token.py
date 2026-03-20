from pydantic import BaseModel


class BaseToken(BaseModel):
    access_token: str


class FacebookToken(BaseToken):
    scopes: list[str] | None = None


class GoogleToken(BaseToken):
    refresh_token: str
    scopes: list[str] | None = None


class TikTokToken(BaseToken):
    advertiser_ids: list[str] | None = None


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
