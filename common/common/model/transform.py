from enum import Enum

from pydantic import BaseModel, Field, model_validator


class TransformType(Enum):
    SQL = "sql"
    RENAME = "rename"
    JOIN = "join"
    COLUMN_EDITOR = "column_editor"
    UNIFY = "unify"


class DataType(str, Enum):
    """Supported data types for column conversion."""

    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"


class ColumnConversion(BaseModel):
    column: str
    rename: str | None = None
    cast: DataType | None = None
    drop: bool | None = None


class NewColumn(BaseModel):
    name: str
    value: str
    data_type: DataType = DataType.STRING


class ColumnEditorConfig(BaseModel):
    conversions: list[ColumnConversion] = Field(default_factory=list)
    new_columns: list[NewColumn] = Field(default_factory=list)


class JoinType(str, Enum):
    INNER = "inner"
    LEFT = "left"
    RIGHT = "right"
    OUTER = "outer"


class SQLTransformConfig(BaseModel):
    table_name: str
    sql_query: str


class RenameTransformConfig(BaseModel):
    column_mapping: dict[str, str]


class JoinKeyPair(BaseModel):
    left: str
    right: str


class JoinSource(BaseModel):
    node_id: int
    key: str | None = None
    keys: list[JoinKeyPair] | None = None
    join_type: JoinType = JoinType.INNER

    @model_validator(mode="after")
    def validate_keys(self) -> "JoinSource":
        if not self.key and not self.keys:
            raise ValueError("Either 'key' or 'keys' must be provided")
        return self

    def get_left_keys(self, base_keys: list[str]) -> list[str]:
        if self.keys:
            return [key_pair.left for key_pair in self.keys]
        return base_keys

    def get_right_keys(self) -> list[str]:
        if self.keys:
            return [key_pair.right for key_pair in self.keys]
        return [self.key] if self.key else []


class JoinTransformConfig(BaseModel):
    base_node_id: int
    base_key: str | None = None
    base_keys: list[str] | None = None
    sources: list[JoinSource]
    suffixes: tuple[str, str] = ("_x", "_y")

    @model_validator(mode="after")
    def validate_base_keys(self) -> "JoinTransformConfig":
        if not self.base_key and not self.base_keys:
            raise ValueError("Either 'base_key' or 'base_keys' must be provided")
        return self

    def get_base_keys(self) -> list[str]:
        if self.base_keys:
            return self.base_keys
        return [self.base_key] if self.base_key else []


class UnifyTransformConfig(BaseModel):
    platform: str
    include_calculated_metrics: bool = True
