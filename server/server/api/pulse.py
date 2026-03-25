from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from pydantic import BaseModel

from common.database import get_mongodb
from common.model.user import UserInDB
from server.configs.config import settings
from server.services.auth.dependencies import get_current_user
from engine.node.intelligence.pulse_generator import (
    aggregate_marketing_data,
    generate_pulse_summary,
)

router = APIRouter(prefix="/api/workflows", tags=["pulse"])


class PulseMetricRow(BaseModel):
    metric: str
    current: str
    previous: str
    change_percent: str


class PulsePreviewResponse(BaseModel):
    workflow_id: str
    execution_id: str
    verdict: str
    metrics_table: list[PulseMetricRow]
    winners: list[str]
    losers: list[str]
    anomalies: list[str]
    recommendations: list[str]


@router.post("/{id}/pulse/preview", response_model=PulsePreviewResponse)
async def pulse_preview_endpoint(
    id: str,
    current_user: UserInDB = Depends(get_current_user),
) -> PulsePreviewResponse:
    """Generate a Pulse AI summary preview from the latest execution data."""
    workflow_collection = get_mongodb().get_collection(settings.workflow_collection)
    workflow_document = await workflow_collection.find_one(
        {"_id": id, "user_id": current_user.id}
    )
    if not workflow_document:
        raise HTTPException(status_code=404, detail="Workflow not found")

    execution_collection = get_mongodb().get_collection(
        settings.execution_history_collection
    )
    latest_execution = await execution_collection.find_one(
        {"workflow_id": id, "status": "SUCCESS"},
        sort=[("start_time", -1)],
    )

    if not latest_execution:
        raise HTTPException(
            status_code=404,
            detail="No successful execution found. Run the workflow first.",
        )

    execution_id = str(latest_execution.get("_id", ""))

    node_outputs: list[dict[str, Any]] = latest_execution.get("node_outputs", [])
    sample_data = extract_sample_data(node_outputs)

    if sample_data.empty:
        raise HTTPException(
            status_code=422,
            detail="No data available in the latest execution to generate Pulse.",
        )

    pulse_result = await generate_pulse_summary(sample_data)

    if not pulse_result:
        aggregation = aggregate_marketing_data(sample_data)
        return PulsePreviewResponse(
            workflow_id=id,
            execution_id=execution_id,
            verdict="Pulse AI is unavailable. Check ANTHROPIC_API_KEY configuration.",
            metrics_table=[
                PulseMetricRow(
                    metric="Total Spend",
                    current=f"{aggregation.totals.get('spend', 0):,.2f}",
                    previous="N/A",
                    change_percent="N/A",
                )
            ],
            winners=[],
            losers=[],
            anomalies=["AI summary generation failed. Data table will still be delivered."],
            recommendations=["Configure ANTHROPIC_API_KEY in .env to enable Pulse AI."],
        )

    logger.info("Pulse preview generated for workflow=%s execution=%s", id, execution_id)

    return PulsePreviewResponse(
        workflow_id=id,
        execution_id=execution_id,
        verdict=pulse_result.verdict,
        metrics_table=[
            PulseMetricRow(**row) for row in pulse_result.metrics_table
        ],
        winners=pulse_result.winners,
        losers=pulse_result.losers,
        anomalies=pulse_result.anomalies,
        recommendations=pulse_result.recommendations,
    )


def extract_sample_data(node_outputs: list[dict[str, Any]]) -> pd.DataFrame:
    """Extract sample data from execution node outputs for Pulse generation."""
    for output in reversed(node_outputs):
        sample_rows = output.get("sample_data", [])
        if sample_rows:
            return pd.DataFrame(sample_rows)
    return pd.DataFrame()
