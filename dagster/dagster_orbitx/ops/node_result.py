from typing import Any

import pandas as pd


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
    ) -> None:
        self.data = data
        self.primary_keys = primary_keys or []
        self.report_level = report_level or ""
        self.field_schemas = field_schemas
