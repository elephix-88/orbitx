from datetime import datetime
from typing import Any

import httpx
import pandas as pd
from loguru import logger

from common.model.delivery import LineChannelConfig
from engine.exceptions import DelivererException
from engine.node.intelligence.pulse_generator import PulseResult, generate_pulse_summary

LINE_MESSAGING_API_URL = "https://api.line.me/v2/bot/message/push"
MAX_TOP_CAMPAIGNS = 5
MAX_LINE_MESSAGE_CHARS = 4000

VERDICT_EMOJI = {
    "green": "🟢",
    "yellow": "🟡",
    "red": "🔴",
}


class LineDeliverer:
    """Delivers workflow results via LINE Messaging API with rich message formatting."""

    def __init__(self, config: LineChannelConfig) -> None:
        self.config = config

    async def deliver(
        self,
        data: pd.DataFrame,
        workflow_name: str,
        execution_time: datetime,
        include_ai_summary: bool = False,
    ) -> bool:
        message_text = self.build_message(data, workflow_name, execution_time)

        if include_ai_summary:
            pulse_result = await generate_pulse_summary(data)
            if pulse_result:
                pulse_text = self.build_pulse_text(pulse_result)
                message_text = pulse_text + "\n\n" + message_text

        message_text = message_text[:MAX_LINE_MESSAGE_CHARS]

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    LINE_MESSAGING_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.config.access_token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "to": self.config.to,
                        "messages": [
                            {
                                "type": "text",
                                "text": message_text,
                            }
                        ],
                    },
                )
                response.raise_for_status()

            logger.success("Delivered report via LINE Messaging API")
            return True

        except DelivererException:
            raise
        except Exception as error:
            raise DelivererException(
                f"Failed to deliver via LINE Messaging API: {error}",
                delivery_channel="line",
            ) from error

    def build_pulse_text(self, pulse: PulseResult) -> str:
        """Format a PulseResult as plain text for LINE (no Block Kit)."""
        verdict_emoji = VERDICT_EMOJI.get(pulse.verdict, "⚪")
        lines = [
            "[Pulse AI] สรุปประสิทธิภาพ",
            f"{verdict_emoji} {pulse.verdict_summary}",
        ]

        if pulse.metrics_table:
            lines.append("")
            lines.append("ตัวชี้วัด:")
            metric_parts = []
            for row in pulse.metrics_table:
                metric = row.get("metric", "")
                value = row.get("value", "")
                if metric and value:
                    metric_parts.append(f"{metric}: {value}")
            if metric_parts:
                lines.append(" | ".join(metric_parts))

        if pulse.winners:
            lines.append("")
            top_winner = pulse.winners[0]
            lines.append(f"Top: {top_winner}")

        if pulse.losers:
            top_loser = pulse.losers[0]
            lines.append(f"Watch: {top_loser}")

        if pulse.recommendations:
            lines.append("")
            lines.append("แนะนำ:")
            for index, recommendation in enumerate(pulse.recommendations[:3], start=1):
                lines.append(f"{index}. {recommendation}")

        return "\n".join(lines)

    def build_message(
        self,
        data: pd.DataFrame,
        workflow_name: str,
        execution_time: datetime,
    ) -> str:
        formatted_time = execution_time.strftime("%Y-%m-%d %H:%M:%S")

        lines = [
            f"\n[OrbitX] Marketing Report: {workflow_name}",
            f"Run: {formatted_time}",
            f"Rows: {len(data)}",
            "",
        ]

        if data.empty:
            lines.append("No data available.")
            return "\n".join(lines)

        top_campaigns = self.build_top_campaigns(data)
        if top_campaigns:
            lines.append("Top campaigns by spend:")
            lines.extend(top_campaigns)
            lines.append("")

        summary = self.build_summary(data)
        if summary:
            lines.append(summary)

        return "\n".join(lines)

    def build_top_campaigns(self, data: pd.DataFrame) -> list[str]:
        if "campaign_name" not in data.columns or "spend" not in data.columns:
            return []

        aggregated = (
            data.groupby("campaign_name", as_index=False)
            .agg(self.build_aggregation_dict(data))
        )

        sorted_campaigns = aggregated.sort_values("spend", ascending=False).head(
            MAX_TOP_CAMPAIGNS
        )

        lines = []
        for rank, (_, row) in enumerate(sorted_campaigns.iterrows(), start=1):
            campaign_name = row["campaign_name"]
            spend = row["spend"]
            parts = [f"{rank}. {campaign_name}"]
            parts.append(f"{spend:,.2f} spend")

            if "roas" in row and not pd.isna(row["roas"]):
                parts.append(f"{row['roas']:.1f}x ROAS")

            lines.append(" — ".join(parts))

        return lines

    def build_aggregation_dict(self, data: pd.DataFrame) -> dict[str, Any]:
        aggregations: dict[str, Any] = {"spend": "sum"}

        if "roas" in data.columns:
            aggregations["roas"] = "mean"

        return aggregations

    def build_summary(self, data: pd.DataFrame) -> str:
        parts = []

        if "spend" in data.columns:
            total_spend = data["spend"].sum()
            parts.append(f"{total_spend:,.2f} spend")

        if "impressions" in data.columns:
            total_impressions = int(data["impressions"].sum())
            parts.append(f"{total_impressions:,} impressions")

        if "clicks" in data.columns:
            total_clicks = int(data["clicks"].sum())
            parts.append(f"{total_clicks:,} clicks")

        if not parts:
            return ""

        return "Total: " + " | ".join(parts)
