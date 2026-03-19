import duckdb
import pandas as pd
from loguru import logger

from engine.exceptions import TransformerException
from engine.interfaces.node import Transformer
from common.model.transform import SQLTransformConfig


class SQLTransformer(Transformer):
    def __init__(self, config: SQLTransformConfig):
        self.config = config

    async def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.config.sql_query:
            logger.info("No SQL query provided, skipping transformation.")
            return df

        logger.info(f"Running SQL Transformation: {self.config.sql_query}")

        try:
            duckdb.register("temp_table", df)
            return duckdb.query(self.config.sql_query).to_df()
        except duckdb.Error as ex:
            raise TransformerException(
                f"SQL transformation failed: {ex}",
                transform_type="sql",
                details={"sql_query": self.config.sql_query},
            ) from ex
