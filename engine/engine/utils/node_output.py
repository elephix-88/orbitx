"""Utilities for building structured NodeOutput messages."""

from typing import Any

import pandas as pd

from common.model.execution import (
    DataSummary,
    ExtractorOutput,
    LoaderOutput,
    NodeOutput,
    NodeOutputType,
    TransformerOutput,
)


def create_data_summary(
    df: pd.DataFrame | None,
    include_sample: bool = True,
    sample_rows: int = 5,
) -> DataSummary | None:
    """Create a DataSummary from a pandas DataFrame."""
    if df is None:
        return None

    sample_data = None
    if include_sample and len(df) > 0:
        sample_df = df.head(sample_rows)
        sample_data = []
        for _, row in sample_df.iterrows():
            row_dict: dict[str, Any] = {}
            for col, val in row.items():
                if pd.isna(val):
                    row_dict[str(col)] = None
                elif hasattr(val, "isoformat"):
                    row_dict[str(col)] = val.isoformat()
                else:
                    row_dict[str(col)] = (
                        val if isinstance(val, (int, float, bool, str)) else str(val)
                    )
            sample_data.append(row_dict)

    return DataSummary(
        row_count=len(df),
        column_count=len(df.columns),
        columns=list(df.columns),
        sample_data=sample_data,
    )


def _build_node_output(
    title: str,
    summary: str,
    output_type: NodeOutputType,
    duration_seconds: float,
    data_summary: DataSummary | None,
    type_output: ExtractorOutput | TransformerOutput | LoaderOutput,
    error: Exception | None = None,
    metadata: dict[str, Any] | None = None,
) -> NodeOutput:
    """Internal helper to build NodeOutput with common fields."""
    kwargs: dict[str, Any] = {
        "title": title,
        "summary": summary,
        "output_type": output_type,
        "duration_seconds": duration_seconds,
        "data_summary": data_summary,
        "metadata": metadata or {},
    }

    if output_type == NodeOutputType.EXTRACTOR:
        kwargs["extractor_output"] = type_output
    elif output_type == NodeOutputType.TRANSFORMER:
        kwargs["transformer_output"] = type_output
    else:
        kwargs["loader_output"] = type_output

    if error:
        kwargs["error_type"] = type(error).__name__
        kwargs["error_message"] = str(error)

    return NodeOutput(**kwargs)


def build_extractor_output(
    source_type: str,
    df: pd.DataFrame | None,
    duration_seconds: float,
    connection_id: str | None = None,
    account_id: str | None = None,
    date_range: dict[str, str] | None = None,
    primary_keys: list[str] | None = None,
    report_level: str | None = None,
    error: Exception | None = None,
    metadata: dict[str, Any] | None = None,
) -> NodeOutput:
    """Build a NodeOutput for an extractor node."""
    records = len(df) if df is not None else 0
    columns = len(df.columns) if df is not None else 0
    fields = list(df.columns) if df is not None else []

    if error:
        title = f"Failed to extract from {source_type}"
        summary = f"Extraction failed: {error}"
    else:
        title = f"Extracted {records:,} records"
        summary = (
            f"Pulled {records:,} records with {columns} columns from {source_type}"
        )
        if report_level:
            summary += f" at {report_level} level"
        if date_range:
            summary += f". Date range: {date_range.get('start', '?')} to {date_range.get('end', '?')}"

    return _build_node_output(
        title=title,
        summary=summary,
        output_type=NodeOutputType.EXTRACTOR,
        duration_seconds=duration_seconds,
        data_summary=create_data_summary(df, include_sample=False),
        type_output=ExtractorOutput(
            source_type=source_type,
            records_extracted=records,
            columns_extracted=columns,
            connection_id=connection_id,
            account_id=account_id,
            date_range=date_range,
            fields=fields,
            primary_keys=primary_keys or [],
            report_level=report_level,
        ),
        error=error,
        metadata=metadata,
    )


def build_transformer_output(
    transform_type: str,
    input_df: pd.DataFrame | None,
    output_df: pd.DataFrame | None,
    duration_seconds: float,
    query: str | None = None,
    error: Exception | None = None,
    metadata: dict[str, Any] | None = None,
) -> NodeOutput:
    """Build a NodeOutput for a transformer node."""
    records_in = len(input_df) if input_df is not None else 0
    records_out = len(output_df) if output_df is not None else 0
    cols_before = len(input_df.columns) if input_df is not None else 0
    cols_after = len(output_df.columns) if output_df is not None else 0

    diff = records_out - records_in
    filtered = abs(diff) if diff < 0 else 0
    added = diff if diff > 0 else 0

    if error:
        title = f"Failed {transform_type} transformation"
        summary = f"Transformation failed: {error}"
    else:
        title = f"Processed {records_in:,} -> {records_out:,} records"
        if filtered > 0:
            summary = f"Filtered out {filtered:,} records ({records_in:,} in, {records_out:,} out)"
        elif added > 0:
            summary = (
                f"Added {added:,} records ({records_in:,} in, {records_out:,} out)"
            )
        else:
            summary = f"Processed {records_in:,} records (no change in count)"

    return _build_node_output(
        title=title,
        summary=summary,
        output_type=NodeOutputType.TRANSFORMER,
        duration_seconds=duration_seconds,
        data_summary=create_data_summary(output_df, include_sample=False),
        type_output=TransformerOutput(
            transform_type=transform_type,
            records_input=records_in,
            records_output=records_out,
            records_filtered=filtered,
            records_added=added,
            query=query,
            columns_before=cols_before,
            columns_after=cols_after,
        ),
        error=error,
        metadata=metadata,
    )


def build_loader_output(
    destination_type: str,
    destination_table: str,
    df: pd.DataFrame | None,
    duration_seconds: float,
    operation: str = "INSERT",
    connection_id: str | None = None,
    merge_keys: list[str] | None = None,
    records_inserted: int = 0,
    records_updated: int = 0,
    records_deleted: int = 0,
    error: Exception | None = None,
    metadata: dict[str, Any] | None = None,
) -> NodeOutput:
    """Build a NodeOutput for a loader node."""
    total = len(df) if df is not None else 0

    if records_inserted == 0 and records_updated == 0 and records_deleted == 0:
        if operation in ("INSERT", "APPEND", "TRUNCATE_INSERT", "UPSERT"):
            records_inserted = total

    if error:
        title = f"Failed to load to {destination_type}"
        summary = f"Load failed: {error}"
    elif operation == "UPSERT" and records_updated > 0:
        title = f"Upserted {total:,} records"
        summary = f"Inserted {records_inserted:,}, updated {records_updated:,} records in {destination_table}"
    elif operation == "TRUNCATE_INSERT":
        title = f"Replaced with {records_inserted:,} records"
        summary = (
            f"Deleted {records_deleted:,}, inserted {records_inserted:,} in {destination_table}"
            if records_deleted > 0
            else f"Truncated and inserted {records_inserted:,} records in {destination_table}"
        )
    elif operation == "DELETE":
        title = f"Deleted {records_deleted:,} records"
        summary = f"Removed {records_deleted:,} records from {destination_table}"
    else:
        title = f"Inserted {records_inserted:,} records"
        summary = f"Appended {records_inserted:,} records to {destination_table}"

    return _build_node_output(
        title=title,
        summary=summary,
        output_type=NodeOutputType.LOADER,
        duration_seconds=duration_seconds,
        data_summary=create_data_summary(df, include_sample=False),
        type_output=LoaderOutput(
            destination_type=destination_type,
            destination_table=destination_table,
            operation=operation,
            records_inserted=records_inserted,
            records_updated=records_updated,
            records_deleted=records_deleted,
            records_unchanged=0,
            records_total=total,
            connection_id=connection_id,
            merge_keys=merge_keys,
        ),
        error=error,
        metadata=metadata,
    )


def build_error_output(
    output_type: NodeOutputType,
    node_type_name: str,
    error: Exception,
    duration_seconds: float = 0.0,
    metadata: dict[str, Any] | None = None,
) -> NodeOutput:
    """Build a NodeOutput for a failed node execution."""
    error_details: dict[str, Any] | None = None
    if hasattr(error, "details"):
        error_details = error.details
    if hasattr(error, "node_id"):
        error_details = error_details or {}
        error_details["node_id"] = error.node_id
    if hasattr(error, "node_instance_id"):
        error_details = error_details or {}
        error_details["node_instance_id"] = error.node_instance_id

    return NodeOutput(
        title=f"{node_type_name} failed",
        summary=str(error),
        output_type=output_type,
        duration_seconds=duration_seconds,
        error_type=type(error).__name__,
        error_message=str(error),
        error_details=error_details,
        metadata=metadata or {},
    )
