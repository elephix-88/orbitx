import re
from enum import Enum, StrEnum
from typing import Any, ClassVar, Literal

from pydantic import BaseModel, Field, field_validator

from common.model.conditional import IfNodeConfig, SwitchNodeConfig
from common.model.delivery import DeliveryConfig
from common.model.error_trigger import ErrorTriggerConfig
from common.model.facebook.config import FacebookAdsConfig
from common.model.google.bigquery import BigQueryDestinationConfig
from common.model.google.config import GoogleAdsConfig
from common.model.google.sheets import GoogleSheetsDestinationConfig
from common.model.mysql.config import MySQLDestinationConfig
from common.model.s3.config import S3SourceConfig
from common.model.tiktok.config import TikTokAdsConfig
from common.model.transform import (
    ColumnEditorConfig,
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
                f"Invalid cron expression '{value}': "
                "must have exactly 5 space-separated fields"
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

    minimum_inputs: ClassVar[int] = 0
    maximum_inputs: ClassVar[int | None] = None
    allows_multiple_inputs_per_port: ClassVar[bool] = False
    can_have_conditional_outputs: ClassVar[bool] = False
    allowed_target_categories: ClassVar[set[str]] = {"transform", "destinations"}


class FacebookAdsNode(BaseNode):
    maximum_inputs: ClassVar[int] = 0

    node_id: Literal["facebook_ads"]
    parameters: FacebookAdsConfig


class GoogleAdsNode(BaseNode):
    maximum_inputs: ClassVar[int] = 0

    node_id: Literal["google_ads"]
    parameters: GoogleAdsConfig


class TikTokAdsNode(BaseNode):
    maximum_inputs: ClassVar[int] = 0

    node_id: Literal["tiktok_ads"]
    parameters: TikTokAdsConfig


class SQLTransformNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1

    node_id: Literal["sql"]
    parameters: SQLTransformConfig


class RenameTransformNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1

    node_id: Literal["rename"]
    parameters: RenameTransformConfig


class JoinTransformNode(BaseNode):
    minimum_inputs: ClassVar[int] = 2
    maximum_inputs: ClassVar[int | None] = None
    allows_multiple_inputs_per_port: ClassVar[bool] = True

    node_id: Literal["join"]
    parameters: JoinTransformConfig


class UnifyTransformNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1

    node_id: Literal["unify"]
    parameters: UnifyTransformConfig


class IfNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    can_have_conditional_outputs: ClassVar[bool] = True

    node_id: Literal["if"]
    parameters: IfNodeConfig


class SwitchNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    can_have_conditional_outputs: ClassVar[bool] = True

    node_id: Literal["switch"]
    parameters: SwitchNodeConfig


class MySQLDestinationNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    allowed_target_categories: ClassVar[set[str]] = set()

    node_id: Literal["mysql"]
    parameters: MySQLDestinationConfig


class BigQueryDestinationNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    allowed_target_categories: ClassVar[set[str]] = set()

    node_id: Literal["bigquery"]
    parameters: BigQueryDestinationConfig


class GoogleSheetsDestinationNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    allowed_target_categories: ClassVar[set[str]] = set()

    node_id: Literal["google_sheet"]
    parameters: GoogleSheetsDestinationConfig


class S3SourceNode(BaseNode):
    maximum_inputs: ClassVar[int] = 0

    node_id: Literal["s3"]
    parameters: S3SourceConfig


class ErrorTriggerNode(BaseNode):
    maximum_inputs: ClassVar[int] = 0

    node_id: Literal["error_trigger"]
    parameters: ErrorTriggerConfig


class ColumnEditorNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1

    node_id: Literal["column_editor"]
    parameters: ColumnEditorConfig


class GenericNode(BaseNode):
    node_id: str
    parameters: dict[str, Any]


Node = (
    FacebookAdsNode
    | GoogleAdsNode
    | TikTokAdsNode
    | S3SourceNode
    | ErrorTriggerNode
    | SQLTransformNode
    | RenameTransformNode
    | JoinTransformNode
    | UnifyTransformNode
    | ColumnEditorNode
    | IfNode
    | SwitchNode
    | MySQLDestinationNode
    | BigQueryDestinationNode
    | GoogleSheetsDestinationNode
    | GenericNode
)


class Connection(BaseModel):
    from_node: int
    to_node: int
    from_port: str | None = None
    # Output port on the source node. "true"/"false" for IfNode;
    # a case_id or "default" for SwitchNode; None for standard nodes.
    to_port: str | None = None
    # Input port on the target node. Reserved for future use; None today.


class WorkflowStatus(StrEnum):
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
    error_workflow_id: str | None = None


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
