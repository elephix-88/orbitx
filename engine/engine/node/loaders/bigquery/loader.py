import asyncio

import pandas as pd
from google.cloud import bigquery
from loguru import logger

from common.model.common import InsertMode
from common.model.google.bigquery import BigQueryDestinationConfig
from engine.configs.config import settings
from engine.exceptions import LoaderException
from engine.interfaces.node import Loader
from engine.node.loaders.bigquery.operations import load_data
from engine.services.google.auth import build_connection_credentials

INSERT_MODE_MAP = {
    InsertMode.APPEND: bigquery.WriteDisposition.WRITE_APPEND,
    InsertMode.TRUNCATE: bigquery.WriteDisposition.WRITE_TRUNCATE,
    InsertMode.UPSERT: "MERGE",
}


class BigQueryLoader(Loader):
    def __init__(self, config: BigQueryDestinationConfig):
        self.config = config

    @property
    def destination_table(self) -> str:
        return (
            f"{self.config.project_id}"
            f".{self.config.dataset}"
            f".{self.config.destination_table}"
        )

    async def load(self, data: pd.DataFrame) -> None:
        try:
            logger.info(
                f"Loading {len(data)} rows to "
                f"{self.destination_table} "
                f"({self.config.insert_mode.value})"
            )

            credentials = await build_connection_credentials(self.config.connection_id)
            client = bigquery.Client(
                credentials=credentials, project=self.config.project_id
            )

            await asyncio.to_thread(
                load_data,
                client=client,
                destination_table=self.destination_table,
                data=data,
                field_schemas=self.field_schemas or [],
                write_disposition=INSERT_MODE_MAP[self.config.insert_mode],
                merge_keys=self.merge_keys,
            )

            logger.success(f"Loaded {len(data)} rows to {self.destination_table}")

        except Exception as ex:
            raise LoaderException(
                f"Failed to load data to BigQuery: {ex}",
                destination_type=settings.services.bigquery,
                destination_table=self.destination_table,
                details={"insert_mode": self.config.insert_mode.value},
            ) from ex
