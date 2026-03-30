from typing import Any

import pandas as pd

OUTPUT_ROWS_LIMIT = 1000


class NodeResult:
    """Data passed between Dagster ops in a workflow pipeline.

    Wraps a DataFrame with metadata propagated from extractors through
    transformers to loaders (primary_keys, field_schemas, report_level).

    Not a Pydantic model because Dagster serializes op outputs with pickle,
    and DataFrame + arbitrary field_schemas don't need validation here.
    """

    def __init__(
        self,
        data: pd.DataFrame,
        primary_keys: list[str] | None = None,
        report_level: str | None = None,
        field_schemas: list[Any] | None = None,
        output_rows: list[dict] | None = None,
        error_trace: str | None = None,
    ) -> None:
        self.data = data
        self.primary_keys = primary_keys or []
        self.report_level = report_level or ""
        self.field_schemas = field_schemas
        self.output_rows = output_rows
        self.error_trace = error_trace


def capture_output_rows(dataframe: pd.DataFrame) -> list[dict]:
    """Convert a DataFrame to a list of dicts, capped at OUTPUT_ROWS_LIMIT.

    Replaces NaN/NaT with None for JSON serialization to MongoDB.
    """
    limited = dataframe.head(OUTPUT_ROWS_LIMIT)
    limited = limited.where(limited.notna(), None)
    return limited.to_dict(orient="records")
