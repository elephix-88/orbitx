import json
from datetime import date
from urllib.parse import quote

from loguru import logger

from common.model.common import DateTimeConfig
from common.model.facebook.common import TimeRange
from common.model.facebook.request import (
    BatchPlan,
    BatchPlannerConfig,
    InsightsUrlParams,
)
from engine.node.extractors.facebook_ads.api.request.field_mapper import (
    build_processing_fields,
)
from engine.node.extractors.facebook_ads.utils import generate_batch_tag
from engine.utils.datetime import chunk_date_range, get_time_range


class FacebookBatchPlanner:
    def __init__(self, field_config: list[dict]):
        self.field_mapper = field_config

    def _build_insights_url(self, params: InsightsUrlParams) -> str:
        fields = ",".join(sorted(params.fields))
        tr_json = json.dumps(params.time_range.model_dump(), separators=(",", ":"))
        tr = quote(tr_json)

        url = (
            f"{params.account}/insights"
            f"?fields={fields}"
            f"&time_range={tr}"
            f"&level={params.level}"
            f"&time_increment={params.time_increment}"
        )
        if params.breakdowns:
            url += f"&breakdowns={','.join(sorted(params.breakdowns))}"
        return url

    def _split_timeframe_by_chunk(
        self, start_date: date, end_date: date, days_per_chunk: int = 7
    ) -> list[TimeRange]:
        """Split the overall time_range into chunks."""
        chunks = chunk_date_range(start_date, end_date, max_days=days_per_chunk)
        periods = [
            TimeRange(
                since=chunk_start.strftime("%Y-%m-%d"),
                until=chunk_end.strftime("%Y-%m-%d"),
            )
            for chunk_start, chunk_end in chunks
        ]
        logger.info(
            f"Split timeframe into {len(periods)} period(s), "
            f"{days_per_chunk} day(s) per chunk"
        )
        return periods

    def _create_account_batch_plans(
        self,
        account: str,
        periods: list[TimeRange],
        all_fields: list[str],
        level: str,
        time_increment: int,
        selected_action_types: set,
        selected_action_values_types: set,
        selected_conversions: set,
        selected_breakdowns: set,
    ) -> list[BatchPlan]:
        """Create batch plans for a single account across all periods."""
        batch_plans = []

        for i, period in enumerate(periods, 1):
            params = InsightsUrlParams(
                account=account,
                fields=all_fields,
                time_range=period,
                level=level,
                time_increment=time_increment,
                actions=selected_action_types,
                action_values=selected_action_values_types,
                conversions=selected_conversions,
                breakdowns=selected_breakdowns,
            )
            url = self._build_insights_url(params)
            tag = generate_batch_tag("insights", i, account)
            batch_plan = BatchPlan(method="POST", relative_url=url, tag=tag)
            batch_plans.append(batch_plan)

        logger.success(f"Created {len(batch_plans)} batch plans for account: {account}")
        return batch_plans

    def build_request_plan(
        self,
        config: BatchPlannerConfig,
        field_config: list[dict],
        datetime_config: DateTimeConfig,
        ad_account_id: list[str],
        time_increment: int,
        days_per_chunk: int = 7,
        max_workers: int = 4,
    ) -> tuple[list[BatchPlan], list[str]]:
        """Return a list of BatchPlans and post_process_fields."""
        (
            all_fields,
            selected_action_types,
            selected_action_values_types,
            selected_conversions,
            selected_breakdowns,
            post_process_fields,
        ) = build_processing_fields(
            field_config=field_config,
        )

        start_date, end_date = get_time_range(datetime_config)
        periods = self._split_timeframe_by_chunk(start_date, end_date, days_per_chunk)

        logger.info(f"Account ID: {ad_account_id}")
        logger.info(f"This workflow start at {start_date} and end at {end_date}")
        logger.info(f"This workflow will be split into {len(periods)} periods")
        logger.info(
            f"Processing {len(ad_account_id)} accounts with {max_workers} workers"
        )

        all_batch_plans: list[BatchPlan] = []
        for account in ad_account_id:
            account_batch_plans = self._create_account_batch_plans(
                account,
                periods,
                list(all_fields),
                config.level,
                time_increment,
                selected_action_types,
                selected_action_values_types,
                selected_conversions,
                selected_breakdowns,
            )
            all_batch_plans.extend(account_batch_plans)

        logger.success(
            f"Generated {len(all_batch_plans)} total batch plans"
        )

        return all_batch_plans, post_process_fields
