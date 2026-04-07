import asyncio

from google.cloud import bigquery
from loguru import logger

from common.model.google.bigquery import BigQuerySourceConfig
from common.model.result import ExtractorResult
from engine.configs.config import settings
from engine.exceptions import ExtractorException
from engine.interfaces.node import Extractor
from engine.services.google.auth import build_connection_credentials


class BigQueryExtractor(Extractor):
    """Extractor for BigQuery data source."""

    def __init__(self, config: BigQuerySourceConfig):
        self.config = config

    async def extract(self) -> ExtractorResult:
        """Execute SQL query and return results as DataFrame."""
        try:
            logger.info(
                f"Extracting data from BigQuery - Project: {self.config.project_id}"
            )
            logger.info(f"Query: {self.config.query[:100]}...")

            credentials = await build_connection_credentials(self.config.connection_id)
            client = bigquery.Client(
                credentials=credentials, project=self.config.project_id
            )

            query_job = await asyncio.to_thread(
                client.query, self.config.query, location=self.config.location
            )
            df = await asyncio.to_thread(query_job.to_dataframe)

            logger.success(
                f"Extracted {len(df)} rows from BigQuery "
                f"- Project: {self.config.project_id}"
            )

            return ExtractorResult(
                data=df,
                primary_keys=self.config.primary_keys,
                report_level="query",
                field_schemas=None,
            )

        except Exception as ex:
            raise ExtractorException(
                f"Failed to extract data from BigQuery: {ex}",
                source_type=settings.services.bigquery_source,
                details={
                    "project_id": self.config.project_id,
                    "query_preview": (
                        self.config.query[:200] if self.config.query else ""
                    ),
                },
            ) from ex
