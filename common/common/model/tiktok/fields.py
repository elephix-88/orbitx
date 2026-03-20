from enum import Enum

from pydantic import BaseModel


class TikTokReportLevel(str, Enum):
    AUCTION_CAMPAIGN = "AUCTION_CAMPAIGN"
    AUCTION_ADGROUP = "AUCTION_ADGROUP"
    AUCTION_AD = "AUCTION_AD"


class TikTokField(BaseModel):
    field: str
    display_name: str | None = None
    group: str
    data_type: str
    is_primary_key: bool = False
    active: bool = True
    report_level: str
    report_type: str = "BASIC"
    requires_hierarchy_api: bool = False
