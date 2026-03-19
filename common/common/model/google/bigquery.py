from pydantic import BaseModel, Field

from common.model.common import (
    BaseConnectedConfig,
    BaseConnectedDestinationConfig,
)


class BigQueryProject(BaseModel):
    project_id: str
    project_name: str | None = None
    project_number: str | None = None


class BigQueryDataset(BaseModel):
    dataset_id: str
    friendly_name: str | None = None
    description: str | None = None
    location: str
    creation_time: str | None = None
    last_modified_time: str | None = None


class BigQueryTableField(BaseModel):
    name: str
    type: str
    mode: str
    description: str | None = None


class BigQueryTable(BaseModel):
    table_id: str
    friendly_name: str | None = None
    description: str | None = None
    type: str
    creation_time: str | None = None
    last_modified_time: str | None = None
    num_rows: int | None = None
    num_bytes: int | None = None
    schema_fields: list[BigQueryTableField] | None = None


class BigQuerySourceConfig(BaseConnectedConfig):
    """Configuration for BigQuery as a data source."""

    project_id: str
    query: str
    location: str = "US"
    primary_keys: list[str] = Field(default_factory=list)


class BigQueryDestinationConfig(BaseConnectedDestinationConfig):
    project_id: str
    dataset: str
    destination_table: str
    location: str = "US"
    batch_size: int | None = None
    num_partitions: int | None = None
    pass_through: bool = False
