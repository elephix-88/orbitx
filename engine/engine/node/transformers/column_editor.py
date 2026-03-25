from typing import Any

import duckdb
import pandas as pd
from loguru import logger

from engine.exceptions import TransformerException
from engine.interfaces.node import Transformer
from common.model.transform import ColumnEditorConfig, DataType

TYPE_MAP: dict[str, str] = {
    DataType.STRING.value: "VARCHAR",
    DataType.INTEGER.value: "BIGINT",
    DataType.FLOAT.value: "DOUBLE",
    DataType.BOOLEAN.value: "BOOLEAN",
    DataType.DATE.value: "DATE",
    DataType.DATETIME.value: "TIMESTAMP",
}


class ColumnEditorTransformer(Transformer):
    """Transformer for column renaming and type casting using DuckDB."""

    def __init__(self, config: ColumnEditorConfig) -> None:
        self.config = config

    def update_field_schemas(self, schemas: list[Any] | None) -> list[Any] | None:
        """Update field schemas to reflect renamed columns, cast types, dropped columns, and new columns."""
        if not schemas:
            return None

        if not self.config.conversions and not self.config.new_columns:
            return schemas

        conv_map = {c.column: c for c in self.config.conversions}

        updated = []
        for schema in schemas:
            field = schema.field
            if field and field in conv_map:
                conv = conv_map[field]

                if conv.drop:
                    continue

                updates: dict[str, Any] = {}

                if conv.rename:
                    updates["field"] = conv.rename

                if conv.cast:
                    updates["data_type"] = conv.cast.value

                if updates:
                    schema = schema.model_copy(update=updates)

            updated.append(schema)

        if self.config.new_columns and updated:
            template = updated[0]
            for new_col in self.config.new_columns:
                if template:
                    new_schema = template.model_copy(
                        update={
                            "field": new_col.name,
                            "data_type": new_col.data_type.value,
                        }
                    )
                    updated.append(new_schema)

        return updated

    def _build_select(self, columns: pd.Index) -> str:
        """Build SELECT clause with renames, casts, dropped columns, and new columns."""
        conv_map = {c.column: c for c in self.config.conversions}

        parts = []
        for col in columns:
            conv = conv_map.get(col)
            if conv:
                if conv.drop:
                    continue
                expr = f'"{col}"'
                if conv.cast:
                    duckdb_type = TYPE_MAP[conv.cast.value]
                    expr = f"TRY_CAST({expr} AS {duckdb_type})"
                name = conv.rename or col
                parts.append(f'{expr} AS "{name}"')
            else:
                parts.append(f'"{col}"')

        for new_col in self.config.new_columns:
            duckdb_type = TYPE_MAP[new_col.data_type.value]
            escaped_value = new_col.value.replace("'", "''")
            expr = f"CAST('{escaped_value}' AS {duckdb_type}) AS \"{new_col.name}\""
            parts.append(expr)

        return ", ".join(parts)

    async def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply column renames, type casts, drop columns, and add new columns using DuckDB."""
        if not self.config.conversions and not self.config.new_columns:
            return df

        try:
            if self.config.conversions:
                conv_cols = {c.column for c in self.config.conversions}
                missing = conv_cols - set(df.columns)
                if missing:
                    raise ValueError(f"Columns not in DataFrame: {list(missing)}")

            conv_map = {c.column: c for c in self.config.conversions}

            final_names = []
            for col in df.columns:
                conv = conv_map.get(col)
                if conv and conv.drop:
                    continue
                final_names.append(conv.rename if conv and conv.rename else col)

            for new_col in self.config.new_columns:
                final_names.append(new_col.name)

            dupes = [n for n in final_names if final_names.count(n) > 1]
            if dupes:
                raise ValueError(f"Duplicate column names: {list(set(dupes))}")

            sql = f"SELECT {self._build_select(df.columns)} FROM df"
            result = duckdb.sql(sql).df()

            log_parts = []
            if self.config.conversions:
                dropped_count = sum(1 for c in self.config.conversions if c.drop)
                if dropped_count > 0:
                    log_parts.append(
                        f"processed {len(self.config.conversions)} columns, "
                        f"dropped {dropped_count}"
                    )
                else:
                    log_parts.append(
                        f"processed {len(self.config.conversions)} columns"
                    )
            if self.config.new_columns:
                log_parts.append(f"added {len(self.config.new_columns)} new columns")

            logger.info(f"Column Editor: {', '.join(log_parts)}")
            return result

        except Exception as ex:
            raise TransformerException(
                f"Column Editor failed: {ex}",
                transform_type="column_editor",
                details={
                    "conversions": [c.model_dump() for c in self.config.conversions],
                    "new_columns": [nc.model_dump() for nc in self.config.new_columns],
                },
            ) from ex
