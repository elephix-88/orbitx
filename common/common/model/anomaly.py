from datetime import datetime

from pydantic import BaseModel, Field


class AnomalyDetectorConfig(BaseModel):
    """Configuration for the Anomaly Detector transform node.

    All column references are dynamic — scanned from upstream node output.
    No hardcoded column names or marketing-specific assumptions.
    """

    metrics: list[str] = Field(default_factory=list)
    group_by: str = ""
    window_days: int = Field(default=7, ge=3, le=30)
    threshold_percent: float = Field(default=30.0, gt=0, le=500)
    max_alerts_per_day: int = Field(default=10, ge=1, le=100)
    # Runtime context injected by the engine, not user-facing
    workflow_id: str = ""
    node_instance_id: int = 0


class AnomalySnapshot(BaseModel):
    """A daily snapshot of metric values for one group, stored in MongoDB."""

    workflow_id: str
    node_instance_id: int
    snapshot_date: str
    group_key: str
    metrics: dict[str, float]
    created_at: datetime = Field(default_factory=datetime.utcnow)
