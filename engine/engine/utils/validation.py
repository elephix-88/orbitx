"""Data validation utilities for the workflow engine."""

import pandas as pd

from engine.exceptions import ValidationException


def validate_dataframe(
    df: pd.DataFrame | None,
    *,
    min_rows: int = 0,
    required_columns: list[str] | None = None,
    node_id: str | None = None,
    node_instance_id: int | None = None,
    allow_empty: bool = False,
) -> pd.DataFrame:
    """Validate a DataFrame before processing."""
    if df is None:
        raise ValidationException(
            "DataFrame is None - no data available for processing",
            validation_type="dataframe_null",
            node_id=node_id,
            node_instance_id=node_instance_id,
        )

    if not isinstance(df, pd.DataFrame):
        raise ValidationException(
            f"Expected pandas DataFrame, got {type(df).__name__}",
            validation_type="dataframe_type",
            expected="pandas.DataFrame",
            actual=type(df).__name__,
            node_id=node_id,
            node_instance_id=node_instance_id,
        )

    if df.empty and not allow_empty:
        raise ValidationException(
            "DataFrame is empty - no rows to process",
            validation_type="dataframe_empty",
            details={"columns": list(df.columns)},
            node_id=node_id,
            node_instance_id=node_instance_id,
        )

    if len(df) < min_rows:
        raise ValidationException(
            f"DataFrame has {len(df)} rows, but minimum {min_rows} required",
            validation_type="dataframe_min_rows",
            expected=min_rows,
            actual=len(df),
            node_id=node_id,
            node_instance_id=node_instance_id,
        )

    if required_columns:
        missing_columns = set(required_columns) - set(df.columns)
        if missing_columns:
            raise ValidationException(
                f"DataFrame is missing required columns: {sorted(missing_columns)}",
                validation_type="dataframe_columns",
                expected=sorted(required_columns),
                actual=sorted(df.columns.tolist()),
                details={"missing_columns": sorted(missing_columns)},
                node_id=node_id,
                node_instance_id=node_instance_id,
            )

    return df


def validate_dataframe_for_load(
    df: pd.DataFrame | None,
    destination_type: str,
    destination_table: str,
    node_id: str | None = None,
    node_instance_id: int | None = None,
    allow_empty: bool = True,
) -> pd.DataFrame:
    """Validate a DataFrame before loading to a destination."""
    try:
        return validate_dataframe(
            df,
            node_id=node_id,
            node_instance_id=node_instance_id,
            allow_empty=allow_empty,
        )
    except ValidationException as e:
        e.details["destination_type"] = destination_type
        e.details["destination_table"] = destination_table
        raise
