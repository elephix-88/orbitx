from enum import StrEnum

from common.model.common import BaseFieldSchema


class TikTokReportLevel(StrEnum):
    AUCTION_CAMPAIGN = "AUCTION_CAMPAIGN"
    AUCTION_ADGROUP = "AUCTION_ADGROUP"
    AUCTION_AD = "AUCTION_AD"


class TikTokField(BaseFieldSchema):
    display_name: str | None = None
    group: str
    is_primary_key: bool = False
    active: bool = True
    report_level: str
    report_type: str = "BASIC"
    requires_hierarchy_api: bool = False
