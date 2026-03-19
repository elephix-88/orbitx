from typing import Any, cast

from engine.configs.config import settings
from engine.exceptions import ExtractorException
from engine.interfaces.node import Extractor
from engine.node.extractors.facebook_ads.api.async_manager import (
    process_facebook_batch_result,
)
from engine.node.extractors.facebook_ads.api.request.batch_handler import (
    send_batch_request,
)
from engine.node.extractors.facebook_ads.api.request.batch_planner import (
    FacebookBatchPlanner,
)
from engine.node.extractors.facebook_ads.api.request.field_mapper import (
    get_primary_key_and_level,
)
from engine.node.extractors.facebook_ads.api.response.merge import merge_data
from engine.services.connection import get_connection_token
from engine.utils.logger import ExecutionTimer
from common.database.mongodb import get_mongodb
from common.model.execution import Status
from common.model.facebook.config import FacebookAdsConfig
from common.model.facebook.fields import FacebookField as FieldConfig
from common.model.facebook.request import BatchPlannerConfig
from common.model.result import ExtractorResult
from common.model.token import FacebookToken


class FacebookAdsExtractor(Extractor):
    def __init__(self, params: FacebookAdsConfig):
        self.params = params

    async def extract(self) -> ExtractorResult:
        """Extract data from Facebook Ads API."""
        execution_timer = ExecutionTimer("Facebook Ads Extraction")
        await execution_timer.start()

        try:
            token = await get_connection_token(
                self.params.connection_id,
                settings.services.facebook_ads,
                FacebookToken,
            )
            access_token = token.access_token

            mongodb = get_mongodb()
            field_config = await mongodb.find_many(
                settings.facebook_fields, "field", self.params.fields, FieldConfig
            )

            batch_planner = FacebookBatchPlanner(field_config=field_config)
            primary_keys, level = get_primary_key_and_level(field_config)

            batch_plans, post_process_fields = batch_planner.build_request_plan(
                config=BatchPlannerConfig(
                    primary_key=primary_keys,
                    level=level,
                    max_batch_size=settings.batch_size,
                ),
                field_config=field_config,
                datetime_config=self.params.time_config,
                ad_account_id=self.params.ad_account_id,
                time_increment=self.params.time_config.time_increment,
                max_workers=settings.max_workers,
            )

            batch_responses = await send_batch_request(
                batch_plans,
                access_token,
                settings.batch_size,
                settings.max_workers,
            )

            batch_result = await process_facebook_batch_result(batch_responses, access_token)

            batch_result_dict = cast(Any, batch_result)

            df, _ = merge_data(
                batch_result=batch_result_dict,
                selected_fields=field_config,
                post_process_fields=list(post_process_fields),
                access_token=access_token,
            )
            await execution_timer.stop(Status.SUCCESS)

            return ExtractorResult(
                data=df,
                primary_keys=primary_keys,
                report_level=level,
                field_schemas=field_config,
            )

        except Exception as ex:
            await execution_timer.stop(Status.FAILED)
            raise ExtractorException(
                f"Facebook Ads extraction failed: {ex}",
                source_type=settings.services.facebook_ads,
                details={"connection_id": self.params.connection_id},
            ) from ex
