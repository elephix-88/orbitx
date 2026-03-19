from dataclasses import dataclass

from engine.node.extractors.google_ads.field_manager import (
    ATTRIBUTED_RESOURCES,
    SPECIALIZED_VIEWS,
)
from engine.utils.datetime import get_time_range
from common.model.common import DateTimeConfig
from common.model.google.ads import GoogleAdsBase
from common.model.google.ads import GoogleAdsFields as FieldConfig

SelectedPair = tuple[str, str]


@dataclass(frozen=True)
class GaqlBuildResult:
    query: str
    selected_pairs: list[SelectedPair]
    primary_keys: list[str]


def build_gaql(
    base: str,
    field_configs: list[FieldConfig],
    time_config: DateTimeConfig,
) -> GaqlBuildResult:
    """Build a GAQL query string from field configurations and time filters."""
    active_fields = [fc for fc in field_configs if fc.active]

    selected_pairs = [
        (fc.output_name or fc.field, fc.source.select) for fc in active_fields
    ]

    has_metrics = any(path.startswith("metrics.") for _, path in selected_pairs)
    needs_date = has_metrics or (time_config is not None)

    if needs_date and not any(path == "segments.date" for _, path in selected_pairs):
        selected_pairs.append(("segments.date", "segments.date"))

    primary_keys = [
        fc.output_name or fc.field for fc in active_fields if fc.is_primary_key
    ]
    if needs_date and "segments.date" not in primary_keys:
        primary_keys.append("segments.date")

    _validate_fields_for_base(active_fields, base)

    select_clause = ",\n    ".join(path for _, path in selected_pairs)
    where_clause = _build_where_clause(time_config, needs_date)
    order_clause = _build_order_clause(active_fields, needs_date)

    query = f"SELECT\n    {select_clause}\nFROM {base}{where_clause}{order_clause}"

    return GaqlBuildResult(
        query=query, selected_pairs=selected_pairs, primary_keys=primary_keys
    )


def _validate_fields_for_base(active_fields: list[FieldConfig], base: str) -> None:
    """Validate that all selected fields are compatible with the query base."""
    base_enum = GoogleAdsBase(base)
    is_specialized_view = base_enum in SPECIALIZED_VIEWS

    non_attributed_prefixes = ("campaign_budget.",)

    for field_config in active_fields:
        field_base = field_config.source.base
        select_path = field_config.source.select

        if is_specialized_view and select_path.startswith(non_attributed_prefixes):
            raise ValueError(
                f"Field '{field_config.field}' (select: {select_path}) is not compatible "
            )

        if field_base == GoogleAdsBase.ANY:
            continue

        if field_base == base_enum:
            continue

        if is_specialized_view and field_base in ATTRIBUTED_RESOURCES:
            continue

        allowed_bases = field_config.source.allowed_bases or []
        if base_enum not in allowed_bases:
            raise ValueError(
                f"Field '{field_config.field}' is not compatible with base '{base}'. "
                f"Field requires base '{field_base.value}' or one of {[b.value for b in allowed_bases]}"
            )


def _build_where_clause(time_config: DateTimeConfig, needs_date: bool) -> str:
    """Build the WHERE clause for date filtering."""
    if not needs_date or not time_config:
        return ""

    start_dt, end_dt = get_time_range(time_config)
    start_str = start_dt.strftime("%Y-%m-%d")
    end_str = end_dt.strftime("%Y-%m-%d")
    return f"\nWHERE segments.date BETWEEN '{start_str}' AND '{end_str}'"


def _build_order_clause(active_fields: list[FieldConfig], needs_date: bool) -> str:
    """Build the ORDER BY clause using primary key fields."""
    order_fields = [fc.source.select for fc in active_fields if fc.is_primary_key]

    if needs_date and "segments.date" not in order_fields:
        order_fields.append("segments.date")

    if not order_fields:
        return ""

    return f"\nORDER BY {', '.join(order_fields)}"
