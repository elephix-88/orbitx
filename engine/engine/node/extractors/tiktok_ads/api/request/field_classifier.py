"""Field classification for TikTok Ads API request planning."""

from pydantic import BaseModel, Field

from common.model.tiktok.fields import TikTokField, TikTokReportLevel


class ClassifiedFields(BaseModel):
    """Classified fields for request planning."""

    basic_dimensions: list[str] = Field(default_factory=list)
    audience_dimensions: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    hierarchy_fields: list[TikTokField] = Field(default_factory=list)
    primary_keys: list[str] = Field(default_factory=list)
    report_level: TikTokReportLevel = TikTokReportLevel.AUCTION_CAMPAIGN

    @property
    def needs_basic_report(self) -> bool:
        return bool(self.basic_dimensions) or bool(self.metrics)

    @property
    def needs_audience_report(self) -> bool:
        return bool(self.audience_dimensions)

    @property
    def needs_hierarchy_api(self) -> bool:
        return bool(self.hierarchy_fields)

    @property
    def all_dimensions(self) -> list[str]:
        return self.basic_dimensions + self.audience_dimensions

    def get_hierarchy_levels(self) -> set[str]:
        return {f.report_level for f in self.hierarchy_fields}


def get_report_level(field_configs: list[TikTokField]) -> TikTokReportLevel:
    """Determine the appropriate report level from field configurations."""
    levels = {f.report_level for f in field_configs if f.report_level}

    if TikTokReportLevel.AUCTION_AD.value in levels:
        return TikTokReportLevel.AUCTION_AD
    if TikTokReportLevel.AUCTION_ADGROUP.value in levels:
        return TikTokReportLevel.AUCTION_ADGROUP
    return TikTokReportLevel.AUCTION_CAMPAIGN


def classify_fields(field_configs: list[TikTokField]) -> ClassifiedFields:
    """Classify fields for request planning."""
    basic_dimensions: list[str] = []
    audience_dimensions: list[str] = []
    metrics: list[str] = []
    hierarchy_fields: list[TikTokField] = []
    primary_keys: list[str] = []

    for field_config in field_configs:
        if field_config.is_primary_key:
            primary_keys.append(field_config.field)

        if field_config.requires_hierarchy_api:
            hierarchy_fields.append(field_config)
        elif field_config.group == "breakdowns":
            audience_dimensions.append(field_config.field)
        elif field_config.group == "dimensions":
            if field_config.field != "advertiser_id":
                basic_dimensions.append(field_config.field)
        else:
            metrics.append(field_config.field)

    report_level = get_report_level(field_configs)

    return ClassifiedFields(
        basic_dimensions=basic_dimensions,
        audience_dimensions=audience_dimensions,
        metrics=metrics,
        hierarchy_fields=hierarchy_fields,
        primary_keys=primary_keys,
        report_level=report_level,
    )
