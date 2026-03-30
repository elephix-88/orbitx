import duckdb
import pandas as pd
from loguru import logger

from common.model.transform import SQLTransformConfig
from engine.exceptions import TransformerException
from engine.interfaces.node import Transformer


class SQLTransformer(Transformer):
    def __init__(self, config: SQLTransformConfig):
        self.config = config

    async def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.config.sql_query:
            logger.info("No SQL query provided, skipping transformation.")
            return df

        logger.info(f"Running SQL Transformation: {self.config.sql_query}")

        try:
            conn = duckdb.connect()
            conn.register("temp_table", df)
            result = conn.execute(self.config.sql_query).df()
            conn.close()
            return result
        except duckdb.Error as ex:
            raise TransformerException(
                f"SQL transformation failed: {ex}",
                transform_type="sql",
                details={"sql_query": self.config.sql_query},
            ) from ex
