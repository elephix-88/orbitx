
from pydantic import BaseModel


class ExecutionSummary(BaseModel):
    """Lightweight view of a single execution for the history list."""

    execution_id: str
    status: str
    start_time: float
    end_time: float | None = None
    duration: float | None = None
    triggered_by: str = "manual"
    failed_node: str | None = None
    # node_id of the first failed step, or None when execution succeeded


class RetryResponse(BaseModel):
    execution_id: str
    # Dagster run ID of the newly-launched execution
