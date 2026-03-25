import re
from enum import Enum
from typing import Any, Literal, Union

from pydantic import BaseModel, Field, field_validator

from common.model.delivery import DeliveryConfig
from common.model.facebook.config import FacebookAdsConfig
from common.model.google.bigquery import BigQueryDestinationConfig
from common.model.google.config import GoogleAdsConfig
from common.model.google.ga4 import GA4Config
from common.model.google.sheets import GoogleSheetsDestinationConfig
from common.model.line_ads.config import LineAdsConfig
from common.model.mysql.config import MySQLDestinationConfig
from common.model.s3.config import S3SourceConfig
from common.model.tiktok.config import TikTokAdsConfig
from common.model.transform import (
    JoinTransformConfig,
    RenameTransformConfig,
    SQLTransformConfig,
    UnifyTransformConfig,
)


class ScheduleConfig(BaseModel):
    cron_expression: str
    timezone: str = "Asia/Bangkok"
    enabled: bool = True

    @field_validator("cron_expression")
    @classmethod
    def validate_cron_expression(cls, value: str) -> str:
        if not re.match(r"^\S+ \S+ \S+ \S+ \S+$", value):
            raise ValueError(
                f"Invalid cron expression '{value}': must have exactly 5 space-separated fields"
            )
        return value


class NodeType(Enum):
    source = "source"
    transforms = "transform"
    destinations = "destinations"


class BaseNode(BaseModel):
    node_instance_id: int
    node_type: str
    display_name: str | None = None


class FacebookAdsNode(BaseNode):
    node_id: Literal["facebook_ads"]
    parameters: FacebookAdsConfig


class GoogleAdsNode(BaseNode):
    node_id: Literal["google_ads"]
    parameters: GoogleAdsConfig


class TikTokAdsNode(BaseNode):
    node_id: Literal["tiktok_ads"]
    parameters: TikTokAdsConfig


class LineAdsNode(BaseNode):
    node_id: Literal["line_ads"]
    parameters: LineAdsConfig


class GA4Node(BaseNode):
    node_id: Literal["ga4"]
    parameters: GA4Config


class SQLTransformNode(BaseNode):
    node_id: Literal["sql"]
    parameters: SQLTransformConfig


class RenameTransformNode(BaseNode):
    node_id: Literal["rename"]
    parameters: RenameTransformConfig


class JoinTransformNode(BaseNode):
    node_id: Literal["join"]
    parameters: JoinTransformConfig


class UnifyTransformNode(BaseNode):
    node_id: Literal["unify"]
    parameters: UnifyTransformConfig


class MySQLDestinationNode(BaseNode):
    node_id: Literal["mysql"]
    parameters: MySQLDestinationConfig


class BigQueryDestinationNode(BaseNode):
    node_id: Literal["bigquery"]
    parameters: BigQueryDestinationConfig


class GoogleSheetsDestinationNode(BaseNode):
    node_id: Literal["google_sheet"]
    parameters: GoogleSheetsDestinationConfig


class S3SourceNode(BaseNode):
    node_id: Literal["s3"]
    parameters: S3SourceConfig


class GenericNode(BaseNode):
    node_id: str
    parameters: dict[str, Any]


Node = Union[
    FacebookAdsNode,
    GoogleAdsNode,
    TikTokAdsNode,
    LineAdsNode,
    GA4Node,
    S3SourceNode,
    SQLTransformNode,
    RenameTransformNode,
    JoinTransformNode,
    UnifyTransformNode,
    MySQLDestinationNode,
    BigQueryDestinationNode,
    GoogleSheetsDestinationNode,
    GenericNode,
]


class Connection(BaseModel):
    from_node: int
    to_node: int


class WorkflowStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"


class WorkflowData(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    user_id: str
    job_name: str = Field(min_length=1, max_length=100)
    status: WorkflowStatus
    created_at: str
    updated_at: str
    schedule_expression: str = Field(min_length=1, max_length=100)
    nodes: list[Node]
    connections: list[Connection]
    schedule: ScheduleConfig | None = None
    delivery: DeliveryConfig | None = None


class WorkflowSummary(BaseModel):
    id: str | None = Field(alias="_id")
    user_id: str
    job_name: str
    schedule_expression: str
    status: WorkflowStatus
    created_at: str
    updated_at: str


class JobIdRequest(BaseModel):
    id: str | None = Field(alias="_id")
