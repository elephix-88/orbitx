from pydantic import BaseModel


class ColumnInfo(BaseModel):
    name: str
    data_type: str


class PinNodeRequest(BaseModel):
    data: list[dict]
    columns: list[ColumnInfo]


class PinnedNodeData(BaseModel):
    workflow_id: str
    node_instance_id: int
    user_id: str
    data: list[dict]
    columns: list[ColumnInfo]
    pinned_at: float


class PinnedNodeSummary(BaseModel):
    data: list[dict]
    columns: list[ColumnInfo]
    pinned_at: float


class PinnedDataMap(BaseModel):
    pinned: dict[str, PinnedNodeSummary]
