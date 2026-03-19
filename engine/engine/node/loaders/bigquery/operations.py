"""BigQuery data loading operations."""

import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum

import pandas as pd
from google.cloud import bigquery
from loguru import logger

from engine.node.loaders.bigquery.merge import build_merge_statement
from common.model.common import BaseFieldSchema


class BQType(str, Enum):
    """BigQuery data types."""

    STRING = "STRING"
    DATE = "DATE"
    DATETIME = "DATETIME"
    BIGNUMERIC = "BIGNUMERIC"
    BOOLEAN = "BOOLEAN"


DATA_TYPE_MAP = {
    "integer": BQType.BIGNUMERIC,
    "float": BQType.BIGNUMERIC,
    "string": BQType.STRING,
    "boolean": BQType.BOOLEAN,
    "date": BQType.DATE,
    "datetime": BQType.DATETIME,
}


def _to_datetime(s: pd.Series) -> pd.Series:
    if not pd.api.types.is_datetime64_any_dtype(s.dtype):
        s = pd.to_datetime(s, errors="coerce")
    return s


def _convert(series: pd.Series, bq_type: BQType) -> pd.Series:
    """Convert series to BigQuery-compatible format."""
    converters = {
        BQType.DATE: lambda s: _to_datetime(s).dt.date,
        BQType.DATETIME: _to_datetime,
        BQType.BIGNUMERIC: lambda s: pd.to_numeric(s, errors="coerce").apply(
            lambda v: None if pd.isna(v) else Decimal(str(v))
        ),
        BQType.BOOLEAN: lambda s: s.astype("boolean"),
        BQType.STRING: lambda s: s.astype("string"),
    }
    return converters[bq_type](series)


def _prepare_dataframe(
    df: pd.DataFrame,
    field_schemas: list[BaseFieldSchema],
) -> tuple[pd.DataFrame, list[bigquery.SchemaField]]:
    """Prepare DataFrame for BigQuery loading."""
    df = df.copy()
    type_map = {
        s.field: DATA_TYPE_MAP.get(s.data_type.lower(), BQType.STRING)
        for s in field_schemas
    }

    schema = []
    for col in df.columns:
        bq_type = type_map.get(col, BQType.STRING)
        df[col] = _convert(df[col], bq_type)
        schema.append(bigquery.SchemaField(col, bq_type.value))

    return df, schema


def _execute_job(
    client: bigquery.Client,
    data: pd.DataFrame,
    table: str,
    schema: list[bigquery.SchemaField],
    write_disposition: str,
) -> None:
    """Execute BigQuery load job."""
    job_config = bigquery.LoadJobConfig(
        write_disposition=write_disposition, schema=schema
    )
    client.load_table_from_dataframe(data, table, job_config=job_config).result()


def load_data(
    client: bigquery.Client,
    destination_table: str,
    data: pd.DataFrame,
    field_schemas: list[BaseFieldSchema],
    write_disposition: str,
    merge_keys: list[str] | None = None,
) -> None:
    """Load data to BigQuery."""
    prepared_data, schema = _prepare_dataframe(data, field_schemas)

    if write_disposition == "MERGE":
        temp_table = f"{destination_table}_temp_{uuid.uuid4()}"
        table_ref = bigquery.Table(temp_table, schema=schema)
        table_ref.expires = datetime.now() + timedelta(minutes=30)
        client.create_table(table_ref)
        logger.info(f"Created temporary table: {temp_table}")

        try:
            _execute_job(
                client,
                prepared_data,
                temp_table,
                schema,
                bigquery.WriteDisposition.WRITE_TRUNCATE,
            )
            merge_sql = build_merge_statement(
                target_table=destination_table,
                source_table=temp_table,
                merge_keys=merge_keys or [],
                columns=list(data.columns),
            )
            client.query(merge_sql).result()
        finally:
            client.delete_table(temp_table, not_found_ok=True)
    else:
        _execute_job(
            client, prepared_data, destination_table, schema, write_disposition
        )
