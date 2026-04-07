import pandas as pd
from loguru import logger

from common.model.error_trigger import ErrorTriggerConfig
from common.model.result import ExtractorResult
from engine.interfaces.node import Extractor


class ErrorTriggerExtractor(Extractor):
    """Source extractor that outputs the error payload as a single-row DataFrame.

    Unlike other extractors, this does not call an external API. The ErrorPayload
    is injected into the config at runtime by the trigger-error endpoint before
    the workflow is submitted to Prefect.
    """

    def __init__(self, config: ErrorTriggerConfig) -> None:
        self.config = config

    async def extract(self) -> ExtractorResult:
        logger.info("Extracting error trigger payload")

        if self.config.error_payload is None:
            raise ValueError(
                "ErrorTriggerExtractor requires an error_payload in config. "
                "This node should only run when triggered by a workflow failure."
            )

        payload_data = self.config.error_payload.model_dump()
        dataframe = pd.DataFrame([payload_data])

        logger.success(
            f"Error trigger payload extracted: "
            f"workflow_id={self.config.error_payload.workflow_id}, "
            f"failed_node={self.config.error_payload.failed_node}"
        )

        return ExtractorResult(
            data=dataframe,
            primary_keys=["execution_id"],
            report_level="error_trigger",
        )
