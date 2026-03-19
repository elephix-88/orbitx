from typing import Any

import duckdb
import pandas as pd
from loguru import logger

from engine.exceptions import TransformerException
from engine.interfaces.node import Transformer
from common.model.transform import RenameTransformConfig


class RenameTransformer(Transformer):
    """Transformer that renames DataFrame columns using DuckDB."""

    def __init__(self, config: RenameTransformConfig) -> None:
        self.config = config

    def update_field_schemas(self, schemas: list[Any] | None) -> list[Any] | None:
        """Update field schemas to reflect renamed columns."""
        if not schemas or not self.config.column_mapping:
            return schemas

        updated = []
        for schema in schemas:
            field = getattr(schema, "field", None)
            if field and field in self.config.column_mapping:
                new_field = self.config.column_mapping[field]
                if hasattr(schema, "model_copy"):
                    schema = schema.model_copy(update={"field": new_field})
            updated.append(schema)
        return updated

    async def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Rename columns using DuckDB (type-preserving)."""
        if not self.config.column_mapping:
            return df

        try:
            mapping = self.config.column_mapping

            missing = [c for c in mapping if c not in df.columns]
            if missing:
                raise ValueError(f"Columns not in DataFrame: {missing}")

            new_names = list(mapping.values())
            unchanged = [c for c in df.columns if c not in mapping]
            dupes = [n for n in new_names if new_names.count(n) > 1 or n in unchanged]
            if dupes:
                raise ValueError(f"Duplicate column names: {list(set(dupes))}")

            select_parts = [
                f'"{col}" AS "{mapping[col]}"' if col in mapping else f'"{col}"'
                for col in df.columns
            ]
            result = duckdb.sql(f"SELECT {', '.join(select_parts)} FROM df").df()

            logger.info(f"Renamed {len(mapping)} columns")
            return result

        except Exception as ex:
            raise TransformerException(
                f"Rename failed: {ex}",
                transform_type="rename",
                details={"column_mapping": self.config.column_mapping},
            ) from ex
