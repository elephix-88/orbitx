from enum import Enum
from typing import Protocol, runtime_checkable

from pydantic import BaseModel


@runtime_checkable
class BaseFieldSchema(Protocol):
    """Protocol for field schemas with type information.

    Any class with `field` and `data_type` attributes satisfies this protocol.
    Used by loaders to determine column types.

    Supported data_type values: "integer", "float", "string", "boolean", "date"
    """

    field: str
    data_type: str


class DateTimeConfig(BaseModel):
    time_preset: str | None = None
    time_window_days: int | None = None
    time_range: dict | None = None
    time_increment: int = 1


class ConnectionParamsConfig(BaseModel):
    refresh_token: str
    access_token: str


class ConnectionConfig(BaseModel):
    connection_name: str
    connection_type: str
    params: ConnectionParamsConfig


class BaseConnectedConfig(BaseModel):
    connection_id: str


class BaseAdsConfig(BaseConnectedConfig):
    ad_account_id: list[str]
    fields: list[str]
    time_config: DateTimeConfig


class InsertMode(str, Enum):
    """Insert mode for data loaders."""

    APPEND = "append"
    TRUNCATE = "truncate"
    UPSERT = "upsert"


class BaseDestinationConfig(BaseModel):
    insert_mode: InsertMode = InsertMode.APPEND


class BaseConnectedDestinationConfig(BaseConnectedConfig, BaseDestinationConfig):
    """Base config for destinations that require a connection."""

    pass
