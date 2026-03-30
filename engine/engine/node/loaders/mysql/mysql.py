from typing import Any

import pandas as pd
from loguru import logger
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    MetaData,
    String,
    Table,
    insert,
)
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from common.model.mysql.config import MySQLDestinationConfig
from engine.configs.config import settings
from engine.exceptions import LoaderException
from engine.interfaces.node import Loader


class MySQLLoader(Loader):
    def __init__(self, config: MySQLDestinationConfig):
        self.config = config
        self.metadata = MetaData()

    def _create_connection(self) -> AsyncEngine:
        url = URL.create(
            "mysql+asyncmy",
            username=self.config.username,
            password=self.config.password,
            host=self.config.connection_url,
            database=self.config.database_name,
        )
        return create_async_engine(url)

    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        return df.replace({pd.NA: None, pd.NaT: None, float("nan"): None})

    def _create_table_schema(self, df: pd.DataFrame) -> Table:
        columns = []
        col_type: Any
        for col_name, dtype in df.dtypes.items():
            if pd.api.types.is_integer_dtype(dtype):
                col_type = Integer()
            elif pd.api.types.is_float_dtype(dtype):
                col_type = Float()
            elif pd.api.types.is_bool_dtype(dtype):
                col_type = Boolean()
            elif pd.api.types.is_datetime64_any_dtype(dtype):
                col_type = DateTime()
            else:
                col_type = String(255)

            columns.append(Column(col_name, col_type))

        return Table(
            self.config.destination_table, self.metadata, *columns, extend_existing=True
        )

    async def _create_table(self, table: Table) -> None:
        async with self.engine.begin() as conn:
            await conn.run_sync(
                self.metadata.create_all,
                tables=[table],
                checkfirst=True,
            )
        logger.info(f"Table '{self.config.destination_table}' created or verified.")

    async def _insert_data(self, table: Table, df: pd.DataFrame) -> None:
        """Insert data into the table."""
        records = df.to_dict(orient="records")
        async with self.engine.begin() as conn:
            await conn.execute(insert(table), records)
            logger.info(
                f"Inserted {len(records)} rows into '{table.name}' using SQLAlchemy."
            )

    async def load(self, data: pd.DataFrame) -> None:
        logger.info(
            f"Preparing to load data to MySQL Table: {self.config.destination_table}"
        )
        self.engine = self._create_connection()
        try:
            cleaned_data = self._clean_data(data)
            table = self._create_table_schema(cleaned_data)
            await self._create_table(table)
            await self._insert_data(table, cleaned_data)
            logger.success(
                f"Data successfully loaded to MySQL Table: "
                f"{self.config.database_name}:"
                f"{self.config.destination_table}"
            )
        except Exception as ex:
            raise LoaderException(
                f"Failed to load data to MySQL: {ex}",
                destination_type=settings.services.mysql,
                destination_table=self.config.destination_table,
                details={
                    "database_name": self.config.database_name,
                    "connection_url": self.config.connection_url,
                },
            ) from ex
        finally:
            await self.engine.dispose()
