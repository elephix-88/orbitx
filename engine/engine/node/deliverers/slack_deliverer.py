from datetime import datetime
from typing import Any

import httpx
import pandas as pd
from loguru import logger

from common.model.delivery import SlackChannelConfig
from engine.exceptions import DelivererException

SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage"
MAX_TABLE_ROWS = 20


class SlackDeliverer:
    """Delivers workflow results to a Slack channel using Block Kit formatting."""

    def __init__(self, config: SlackChannelConfig) -> None:
        self.config = config

    async def deliver(
        self,
        data: pd.DataFrame,
        workflow_name: str,
        execution_time: datetime,
        include_ai_summary: bool = False,
    ) -> bool:
        blocks = self.build_blocks(data, workflow_name, execution_time)

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    SLACK_POST_MESSAGE_URL,
                    headers={"Authorization": f"Bearer {self.config.bot_token}"},
                    json={
                        "channel": self.config.channel_id,
                        "blocks": blocks,
                        "text": f"Marketing Report: {workflow_name}",
                    },
                )
                response.raise_for_status()
                body = response.json()

                if not body.get("ok"):
                    raise DelivererException(
                        f"Slack API error: {body.get('error', 'unknown')}",
                        delivery_channel="slack",
                        details={"slack_error": body.get("error")},
                    )

            logger.success(
                f"Delivered report to Slack channel #{self.config.channel_name}"
            )
            return True

        except DelivererException:
            raise
        except Exception as error:
            raise DelivererException(
                f"Failed to deliver to Slack: {error}",
                delivery_channel="slack",
                details={"channel_id": self.config.channel_id},
            ) from error

    def build_blocks(
        self,
        data: pd.DataFrame,
        workflow_name: str,
        execution_time: datetime,
    ) -> list[dict[str, Any]]:
        formatted_time = execution_time.strftime("%Y-%m-%d %H:%M:%S")

        blocks: list[dict[str, Any]] = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"Marketing Report: {workflow_name}",
                },
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Run: {formatted_time}  |  Rows: {len(data)}",
                    }
                ],
            },
            {"type": "divider"},
        ]

        table_text = self.build_table(data)
        blocks.append(
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": table_text},
            }
        )

        summary_text = self.build_summary(data)
        if summary_text:
            blocks.append({"type": "divider"})
            blocks.append(
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": summary_text},
                }
            )

        return blocks

    def build_table(self, data: pd.DataFrame) -> str:
        if data.empty:
            return "_No data available._"

        display_columns = self.select_display_columns(data)
        display_data = data[display_columns].head(MAX_TABLE_ROWS)

        header = "| " + " | ".join(display_columns) + " |"
        separator = "| " + " | ".join("---" for _ in display_columns) + " |"

        rows = []
        for _, row in display_data.iterrows():
            formatted_values = [
                self.format_cell_value(row[col]) for col in display_columns
            ]
            rows.append("| " + " | ".join(formatted_values) + " |")

        table = "\n".join([header, separator, *rows])

        if len(data) > MAX_TABLE_ROWS:
            table += f"\n_...and {len(data) - MAX_TABLE_ROWS} more rows_"

        return table

    def select_display_columns(self, data: pd.DataFrame) -> list[str]:
        priority_columns = [
            "campaign_name",
            "spend",
            "impressions",
            "clicks",
            "conversions",
            "conversion_value",
            "cpc",
            "ctr",
            "roas",
            "cpm",
            "cpa",
        ]

        available = [col for col in priority_columns if col in data.columns]

        if not available:
            return list(data.columns[:6])

        return available[:8]

    def format_cell_value(self, value: Any) -> str:
        if pd.isna(value):
            return "-"
        try:
            return f"{float(value):,.2f}"
        except (ValueError, TypeError):
            return str(value)

    def build_summary(self, data: pd.DataFrame) -> str:
        if data.empty:
            return ""

        parts = ["*Summary:*"]

        if "spend" in data.columns:
            total_spend = data["spend"].sum()
            parts.append(f"Total Spend: {total_spend:,.2f}")

        if "impressions" in data.columns:
            total_impressions = int(data["impressions"].sum())
            parts.append(f"Impressions: {total_impressions:,}")

        if "clicks" in data.columns:
            total_clicks = int(data["clicks"].sum())
            parts.append(f"Clicks: {total_clicks:,}")

        if "conversions" in data.columns:
            total_conversions = data["conversions"].sum()
            parts.append(f"Conversions: {total_conversions:,.2f}")

        if "roas" in data.columns:
            average_roas = data["roas"].mean()
            if not pd.isna(average_roas):
                parts.append(f"Avg ROAS: {average_roas:,.2f}x")

        if len(parts) <= 1:
            return ""

        return "  |  ".join(parts)
