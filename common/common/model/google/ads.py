from enum import Enum

from pydantic import BaseModel


class GoogleAdsBase(str, Enum):
    CUSTOMER = "customer"
    CAMPAIGN = "campaign"
    AD_GROUP = "ad_group"
    AD_GROUP_AD = "ad_group_ad"
    KEYWORD_VIEW = "keyword_view"
    SEARCH_TERM_VIEW = "search_term_view"
    AGE_RANGE_VIEW = "age_range_view"
    GENDER_VIEW = "gender_view"
    GROUP_PLACEMENT_VIEW = "group_placement_view"
    ANY = "*"


class FieldSource(BaseModel):
    base: GoogleAdsBase
    select: str
    allowed_bases: list[GoogleAdsBase] | None = None


class GoogleAdsField(BaseModel):
    field: str
    output_name: str | None = None
    display_name: str | None = None
    group: str = "general"
    data_type: str
    is_primary_key: bool
    is_breakdown: bool = False
    active: bool = True
    source: FieldSource


class GoogleAdsAccount(BaseModel):
    resource_name: str
    id: str
    descriptive_name: str
