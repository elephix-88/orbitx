import time
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Status(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class NodeOutputType(StrEnum):
    """Type of node output for frontend display categorization."""

    EXTRACTOR = "extractor"
    TRANSFORMER = "transformer"
    LOADER = "loader"


class ExecutionBase(BaseModel):
    model_config = ConfigDict(use_enum_values=True)


class DataSummary(ExecutionBase):
    """Summary of data processed by a node."""

    row_count: int = 0
    column_count: int = 0
    columns: list[str] = Field(default_factory=list)
    sample_data: list[dict[str, Any]] | None = None


class ExtractorOutput(ExecutionBase):
    """Output details specific to extractor nodes."""

    source_type: str
    records_extracted: int = 0
    columns_extracted: int = 0
    connection_id: str | None = None
    account_id: str | None = None
    date_range: dict[str, str] | None = None
    fields: list[str] = Field(default_factory=list)
    primary_keys: list[str] = Field(default_factory=list)
    report_level: str | None = None


class TransformerOutput(ExecutionBase):
    """Output details specific to transformer nodes."""

    transform_type: str
    records_input: int = 0
    records_output: int = 0
    records_filtered: int = 0
    records_added: int = 0
    query: str | None = None
    columns_before: int = 0
    columns_after: int = 0


class LoaderOutput(ExecutionBase):
    """Output details specific to loader nodes."""

    destination_type: str
    destination_table: str
    operation: str
    records_inserted: int = 0
    records_updated: int = 0
    records_deleted: int = 0
    records_unchanged: int = 0
    records_total: int = 0
    connection_id: str | None = None
    merge_keys: list[str] | None = None


class NodeOutput(ExecutionBase):
    """Structured output from node execution for frontend display."""

    title: str
    summary: str
    output_type: NodeOutputType
    duration_seconds: float = 0.0
    data_summary: DataSummary | None = None
    extractor_output: ExtractorOutput | None = None
    transformer_output: TransformerOutput | None = None
    loader_output: LoaderOutput | None = None
    error_type: str | None = None
    error_message: str | None = None
    error_details: dict[str, Any] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class NodeStatusEvent(BaseModel):
    workflow_id: str
    node_instance_id: str
    status: Status
    timestamp: float = Field(default_factory=time.time)
    error_message: str | None = None
    metadata: dict[str, Any] | None = None


class ExecutionStep(ExecutionBase):
    """Represents a single node's execution within a workflow run."""

    node_instance_id: str
    node_id: str
    node_type: str
    status: Status
    start_time: float | None = None
    end_time: float | None = None
    error: str | None = None
    error_trace: str | None = None
    message: str | None = None
    output: NodeOutput | None = None
    row_count: int = 0


class ExecutionHistory(BaseModel):
    id: str = Field(alias="_id")
    execution_id: str
    workflow_id: str
    workflow_name: str
    status: Status
    triggered_by: str = "manual"
    start_time: float
    end_time: float | None = None
    duration: float | None = None
    cost_usd: float | None = None
    steps: dict[str, ExecutionStep] = Field(default_factory=dict)
    error: str | None = None
    total_nodes: int = 0
    successful_nodes: int = 0
    failed_nodes: int = 0
    ttl_expires_at: float | None = None
    # Unix timestamp after which this document should be deleted.
    # Set by the Prefect hook at write time.
    # MongoDB TTL index on ttl_expires_at enforces deletion (30-day default).

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
    )
