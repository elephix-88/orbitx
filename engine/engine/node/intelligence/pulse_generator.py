"""Pulse AI Summary Generator.

Aggregates unified marketing data, sends it to an LLM for interpretation,
and renders the result as Slack Block Kit blocks.

Design principles:
  - ALL math is pre-computed in Python — the LLM only interprets and writes prose
  - Structured JSON output from LLM — not freeform text
  - Graceful fallback: if LLM fails, return None so data delivery continues
"""

import json
from typing import Any

import anthropic
import pandas as pd
from loguru import logger
from pydantic import BaseModel

from engine.configs.config import settings

PULSE_MODEL = "claude-haiku-4-5-20251001"
PULSE_MAX_TOKENS = 2048

SYSTEM_PROMPT = """\
You are Pulse, an AI marketing analyst for OrbitX.
You receive pre-computed marketing performance data and write a concise weekly brief.

Rules:
- Write the brief in Thai language
- Keep metric names in English (ROAS, CPA, CPC, CTR, CPM, spend, conversions)
- Be specific — reference actual numbers, campaign names, and percentage changes
- Keep it actionable — every observation should imply what to do next
- If data is insufficient for a section, omit that section rather than guessing

Respond with a valid JSON object matching this exact schema:
{
  "verdict": "green | yellow | red",
  "verdict_summary": "1-2 sentence Thai summary of overall performance",
  "metrics_table": [{"metric": "...", "value": "...", "note": "..."}],
  "winners": ["campaign names or segments performing well, with numbers"],
  "losers": ["campaign names or segments performing poorly, with numbers"],
  "anomalies": ["any unusual patterns detected in the data"],
  "recommendations": ["actionable Thai recommendations based on the data"]
}

verdict colors:
- green = on track or improving
- yellow = needs attention, mixed signals
- red = underperforming, urgent action needed\
"""


class PulseAggregation(BaseModel):
    """Pre-computed marketing metrics for the LLM to interpret."""

    total_spend: float
    total_impressions: float
    total_clicks: float
    total_conversions: float
    total_conversion_value: float
    roas: float | None
    cpa: float | None
    cpc: float | None
    ctr: float | None
    cpm: float | None
    campaign_breakdown: list[dict[str, Any]]


class PulseResult(BaseModel):
    """Structured output from the LLM."""

    verdict: str
    verdict_summary: str
    metrics_table: list[dict[str, str]]
    winners: list[str]
    losers: list[str]
    anomalies: list[str]
    recommendations: list[str]


def safe_divide(numerator: float, denominator: float) -> float | None:
    """Null-safe division — returns None when denominator is zero or NaN."""
    if denominator == 0 or pd.isna(denominator):
        return None
    result = numerator / denominator
    if pd.isna(result):
        return None
    return result


def aggregate_marketing_data(df: pd.DataFrame) -> PulseAggregation:
    """Aggregate a unified marketing DataFrame into summary metrics.

    Expects columns from the unified schema: spend, impressions, clicks,
    conversions, conversion_value, campaign_name.
    """
    total_spend = (
        float(df["spend"].sum()) if "spend" in df.columns else 0.0
    )
    total_impressions = (
        float(df["impressions"].sum())
        if "impressions" in df.columns
        else 0.0
    )
    total_clicks = (
        float(df["clicks"].sum()) if "clicks" in df.columns else 0.0
    )
    total_conversions = (
        float(df["conversions"].sum())
        if "conversions" in df.columns
        else 0.0
    )
    total_conversion_value = (
        float(df["conversion_value"].sum())
        if "conversion_value" in df.columns
        else 0.0
    )

    roas = safe_divide(total_conversion_value, total_spend)
    cpa = safe_divide(total_spend, total_conversions)
    cpc = safe_divide(total_spend, total_clicks)
    ctr = safe_divide(total_clicks, total_impressions)
    if ctr is not None:
        ctr = ctr * 100
    cpm = safe_divide(total_spend, total_impressions)
    if cpm is not None:
        cpm = cpm * 1000

    campaign_breakdown = build_campaign_breakdown(df)

    return PulseAggregation(
        total_spend=total_spend,
        total_impressions=total_impressions,
        total_clicks=total_clicks,
        total_conversions=total_conversions,
        total_conversion_value=total_conversion_value,
        roas=roas,
        cpa=cpa,
        cpc=cpc,
        ctr=ctr,
        cpm=cpm,
        campaign_breakdown=campaign_breakdown,
    )


def build_campaign_breakdown(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Build top-10-by-spend campaign breakdown with per-campaign metrics."""
    if "campaign_name" not in df.columns or "spend" not in df.columns:
        return []

    agg_columns: dict[str, tuple[str, str]] = {"spend": ("spend", "sum")}

    if "impressions" in df.columns:
        agg_columns["impressions"] = ("impressions", "sum")
    if "clicks" in df.columns:
        agg_columns["clicks"] = ("clicks", "sum")
    if "conversions" in df.columns:
        agg_columns["conversions"] = ("conversions", "sum")
    if "conversion_value" in df.columns:
        agg_columns["conversion_value"] = ("conversion_value", "sum")

    campaign_df = df.groupby("campaign_name").agg(**agg_columns).reset_index()
    campaign_df = campaign_df.sort_values("spend", ascending=False).head(10)

    breakdown: list[dict[str, Any]] = []
    for _, row in campaign_df.iterrows():
        entry: dict[str, Any] = {
            "campaign_name": row["campaign_name"],
            "spend": float(row["spend"]),
        }
        if "impressions" in row:
            entry["impressions"] = float(row["impressions"])
        if "clicks" in row:
            entry["clicks"] = float(row["clicks"])
        if "conversions" in row:
            entry["conversions"] = float(row["conversions"])
        if "conversion_value" in row:
            entry["conversion_value"] = float(row["conversion_value"])

        campaign_spend = float(row["spend"])
        campaign_conversions = float(row.get("conversions", 0))
        campaign_conversion_value = float(row.get("conversion_value", 0))
        campaign_clicks = float(row.get("clicks", 0))
        campaign_impressions = float(row.get("impressions", 0))

        entry["roas"] = safe_divide(campaign_conversion_value, campaign_spend)
        entry["cpa"] = safe_divide(campaign_spend, campaign_conversions)
        entry["cpc"] = safe_divide(campaign_spend, campaign_clicks)

        ctr = safe_divide(campaign_clicks, campaign_impressions)
        entry["ctr"] = ctr * 100 if ctr is not None else None

        breakdown.append(entry)

    return breakdown


async def generate_pulse_summary(df: pd.DataFrame) -> PulseResult | None:
    """Generate a Pulse AI summary from a unified marketing DataFrame.

    Returns None if the LLM call fails — this should never block data delivery.
    """
    if df.empty:
        logger.warning("Pulse: empty DataFrame, skipping AI summary")
        return None

    aggregation = aggregate_marketing_data(df)

    user_message = json.dumps(
        aggregation.model_dump(),
        ensure_ascii=False,
        default=str,
    )

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = await client.messages.create(
            model=PULSE_MODEL,
            max_tokens=PULSE_MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text = response.content[0].text
        parsed = json.loads(raw_text)
        result = PulseResult(**parsed)

        logger.success("Pulse AI summary generated successfully")
        return result

    except json.JSONDecodeError as error:
        logger.error(
            f"Pulse: failed to parse LLM JSON response: {error}"
        )
        return None
    except anthropic.APIError as error:
        logger.error(f"Pulse: Anthropic API error: {error}")
        return None
    except Exception as error:
        logger.error(
            f"Pulse: unexpected error generating summary: {error}"
        )
        return None


def build_pulse_blocks(pulse: PulseResult) -> list[dict[str, Any]]:
    """Convert a PulseResult into Slack Block Kit blocks."""
    verdict_emojis = {
        "green": ":large_green_circle:",
        "yellow": ":large_yellow_circle:",
        "red": ":red_circle:",
    }
    verdict_emoji = verdict_emojis.get(
        pulse.verdict, ":white_circle:"
    )

    blocks: list[dict[str, Any]] = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "Pulse -- Weekly Marketing Brief",
            },
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"{verdict_emoji} *Verdict:* {pulse.verdict_summary}",
            },
        },
    ]

    if pulse.metrics_table:
        table_lines = ["```"]
        header = f"{'Metric':<20} {'Value':>15} {'Note'}"
        table_lines.append(header)
        table_lines.append("-" * len(header))
        for row in pulse.metrics_table:
            metric = row.get("metric", "")
            value = row.get("value", "")
            note = row.get("note", "")
            table_lines.append(f"{metric:<20} {value:>15} {note}")
        table_lines.append("```")

        blocks.append(
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": "\n".join(table_lines)},
            }
        )

    if pulse.winners:
        winner_lines = [f"  {item}" for item in pulse.winners]
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*:trophy: Winners*\n" + "\n".join(winner_lines),
                },
            }
        )

    if pulse.losers:
        loser_lines = [f"  {item}" for item in pulse.losers]
        loser_text = "\n".join(loser_lines)
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        "*:chart_with_downwards_trend: Losers*\n"
                        + loser_text
                    ),
                },
            }
        )

    if pulse.anomalies:
        anomaly_lines = [f":warning: {item}" for item in pulse.anomalies]
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Anomalies*\n" + "\n".join(anomaly_lines),
                },
            }
        )

    if pulse.recommendations:
        rec_lines = [f"  {i+1}. {item}" for i, item in enumerate(pulse.recommendations)]
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*:bulb: Recommendations*\n" + "\n".join(rec_lines),
                },
            }
        )

    blocks.append({"type": "divider"})

    return blocks
