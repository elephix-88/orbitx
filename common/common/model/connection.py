from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ServiceName(Enum):
    BIGQUERY = "BigQuery"
    GOOGLE_SHEET = "GoogleSheet"
    GOOGLE_ADS = "GoogleAds"
    FACEBOOK_ADS = "FacebookAds"
    TIKTOK_ADS = "TikTokAds"


class ConnectionType(Enum):
    SOURCE = "Source"
    TRANSFORM = "Transform"
    DESTINATION = "Destination"


class ConnectionStatus(Enum):
    CONNECTED = "Connected"
    DISCONNECTED = "Disconnected"


class ConnectionKey(BaseModel):
    connection_type: str
    connection_id: str
    service_name: str
    connection_name: str
    user_id: str


class ConnectionItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    user_id: str
    connection_name: str
    service_name: str
    connection_type: str
    created_at: datetime
    status: str | None = None
    params: dict[str, Any]


class ConnectionNamePayload(BaseModel):
    connection_name: str = Field(min_length=1, max_length=100)


class DeleteConnectionResponse(BaseModel):
    success: bool


class OAuthLoginResponse(BaseModel):
    oauth_url: str
    connection_id: str
    message: str
