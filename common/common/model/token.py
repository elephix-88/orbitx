from pydantic import BaseModel


class FacebookToken(BaseModel):
    access_token: str
    scopes: list[str] | None = None


class GoogleToken(BaseModel):
    access_token: str
    refresh_token: str
    scopes: list[str] | None = None


class TikTokToken(BaseModel):
    access_token: str
    advertiser_ids: list[str] | None = None


class GoogleConnectionParams(BaseModel):
    access_token: str
    token_type: str | None = None
    expires_in: int | None = None
    refresh_token: str
    scope: str


class FacebookConnectionParams(BaseModel):
    access_token: str
    token_type: str | None = None
    expires_in: int | None = None


class TikTokConnectionParams(BaseModel):
    access_token: str
    token_type: str | None = None
    expires_in: int | None = None
    advertiser_ids: list[str]
    refresh_token: str | None = None
