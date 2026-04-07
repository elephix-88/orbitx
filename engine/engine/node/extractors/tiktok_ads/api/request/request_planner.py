"""Request planning for TikTok Ads API."""

from dataclasses import dataclass, field

from common.model.tiktok.fields import TikTokField, TikTokReportLevel
from engine.configs.config import settings
from engine.node.extractors.tiktok_ads.api.request.field_classifier import (
    ClassifiedFields,
    classify_fields,
)


@dataclass
class ReportRequest:
    """A single report API request configuration."""

    report_type: str
    data_level: str
    dimensions: list[str]
    metrics: list[str]

    def __str__(self) -> str:
        return (
            f"ReportRequest({self.report_type}, {self.data_level}, "
            f"dims={len(self.dimensions)}, metrics={len(self.metrics)})"
        )


@dataclass
class HierarchyRequest:
    """A hierarchy API request configuration."""

    endpoint: str
    fields: list[str]

    def __str__(self) -> str:
        return f"HierarchyRequest({self.endpoint}, fields={self.fields})"


@dataclass
class RequestPlan:
    """Complete request plan for TikTok data extraction."""

    basic_request: ReportRequest | None = None
    audience_request: ReportRequest | None = None
    hierarchy_requests: list[HierarchyRequest] = field(default_factory=list)
    primary_keys: list[str] = field(default_factory=list)
    report_level: TikTokReportLevel = TikTokReportLevel.AUCTION_CAMPAIGN
    classified_fields: ClassifiedFields | None = None

    @property
    def total_requests(self) -> int:
        count = 0
        if self.basic_request:
            count += 1
        if self.audience_request:
            count += 1
        count += len(self.hierarchy_requests)
        return count

    def get_merge_keys(self) -> list[str]:
        merge_keys = ["advertiser_id"]

        if "stat_time_day" in self.primary_keys:
            merge_keys.append("stat_time_day")

        if self.report_level == TikTokReportLevel.AUCTION_AD:
            merge_keys.append("ad_id")
        elif self.report_level == TikTokReportLevel.AUCTION_ADGROUP:
            merge_keys.append("adgroup_id")
        else:
            merge_keys.append("campaign_id")

        return list(dict.fromkeys(merge_keys))


class TikTokRequestPlanner:
    """Plans API requests based on field selection."""

    def __init__(self, field_configs: list[TikTokField]):
        self.field_configs = field_configs
        self.max_dimensions = settings.max_dimensions

    def plan(self) -> RequestPlan:
        """Create a request plan based on field configurations."""
        classified = classify_fields(self.field_configs)

        effective_level = classified.report_level
        if classified.needs_audience_report:
            effective_level = TikTokReportLevel.AUCTION_CAMPAIGN

        plan = RequestPlan(
            primary_keys=classified.primary_keys,
            report_level=effective_level,
            classified_fields=classified,
        )

        if classified.needs_audience_report:
            plan.audience_request = self._plan_audience_request(classified)
        elif classified.needs_basic_report:
            plan.basic_request = self._plan_basic_request(classified)

        if classified.needs_hierarchy_api:
            plan.hierarchy_requests = self._plan_hierarchy_requests(classified)

        return plan

    def _plan_basic_request(self, classified: ClassifiedFields) -> ReportRequest:
        dimensions = self._get_level_dimensions(classified.report_level)

        has_stat_time = "stat_time_day" in classified.basic_dimensions
        if has_stat_time and "stat_time_day" not in dimensions:
            dimensions.insert(0, "stat_time_day")

        dimensions = dimensions[: self.max_dimensions]

        return ReportRequest(
            report_type="BASIC",
            data_level=classified.report_level.value,
            dimensions=dimensions,
            metrics=classified.metrics,
        )

    def _plan_audience_request(self, classified: ClassifiedFields) -> ReportRequest:
        dimensions = ["stat_time_day", "campaign_id"]
        available_slots = self.max_dimensions - len(dimensions)
        breakdowns = classified.audience_dimensions[:available_slots]
        dimensions.extend(breakdowns)

        return ReportRequest(
            report_type="AUDIENCE",
            data_level="AUCTION_CAMPAIGN",
            dimensions=dimensions,
            metrics=classified.metrics,
        )

    def _plan_hierarchy_requests(
        self, classified: ClassifiedFields
    ) -> list[HierarchyRequest]:
        requests: list[HierarchyRequest] = []

        by_level: dict[str, list[str]] = {}
        for hierarchy_field in classified.hierarchy_fields:
            level = hierarchy_field.report_level
            if level not in by_level:
                by_level[level] = []
            by_level[level].append(hierarchy_field.field)

        level_to_endpoint = {
            "AUCTION_AD": "ad",
            "AUCTION_ADGROUP": "adgroup",
            "AUCTION_CAMPAIGN": "campaign",
        }

        for level, fields in by_level.items():
            endpoint = level_to_endpoint.get(level, "campaign")
            requests.append(HierarchyRequest(endpoint=endpoint, fields=fields))

        return requests

    def _get_level_dimensions(self, level: TikTokReportLevel) -> list[str]:
        if level == TikTokReportLevel.AUCTION_AD:
            return ["ad_id"]
        elif level == TikTokReportLevel.AUCTION_ADGROUP:
            return ["adgroup_id"]
        else:
            return ["campaign_id"]
