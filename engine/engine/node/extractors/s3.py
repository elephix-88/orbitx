import asyncio

import pandas as pd
from loguru import logger

from engine.configs.config import settings
from engine.exceptions import ExtractorException
from engine.interfaces.node import Extractor
from common.model.result import ExtractorResult
from common.model.s3.config import S3SourceConfig


class S3Extractor(Extractor):
    def __init__(self, config: S3SourceConfig):
        self.config = config

    async def extract(self) -> ExtractorResult:
        logger.info(f"Extracting data from S3 - Bucket: {self.config.file_path}")
        try:
            data = await asyncio.to_thread(pd.read_csv, self.config.file_path)
            logger.info(
                f"Data extracted successfully from S3 - {self.config.file_path}"
            )
            return ExtractorResult(
                data=data,
                primary_keys=[],
                report_level="file",
            )

        except Exception as ex:
            raise ExtractorException(
                f"Failed to extract data from S3: {ex}",
                source_type=settings.services.s3,
                details={"file_path": self.config.file_path},
            ) from ex
