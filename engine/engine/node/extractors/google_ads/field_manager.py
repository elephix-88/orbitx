from common.model.google.ads import GoogleAdsBase
from common.model.google.ads import GoogleAdsFields as FieldConfig

BASE_DEPTH = {
    GoogleAdsBase.CUSTOMER: 0,
    GoogleAdsBase.CAMPAIGN: 1,
    GoogleAdsBase.AD_GROUP: 2,
    GoogleAdsBase.AD_GROUP_AD: 3,
}

SPECIALIZED_VIEWS = {
    GoogleAdsBase.KEYWORD_VIEW,
    GoogleAdsBase.SEARCH_TERM_VIEW,
    GoogleAdsBase.AGE_RANGE_VIEW,
    GoogleAdsBase.GENDER_VIEW,
    GoogleAdsBase.GROUP_PLACEMENT_VIEW,
}

ATTRIBUTED_RESOURCES: set[GoogleAdsBase] = {
    GoogleAdsBase.CUSTOMER,
    GoogleAdsBase.CAMPAIGN,
    GoogleAdsBase.AD_GROUP,
    GoogleAdsBase.AD_GROUP_AD,
}


def get_gaql_level(fields: list[FieldConfig]) -> str:
    """Determine the GAQL FROM base for the given fields."""
    for f in fields:
        base = f.source.base
        if base in SPECIALIZED_VIEWS:
            return str(base.value)

    resolved = GoogleAdsBase.CUSTOMER
    max_depth = BASE_DEPTH[resolved]

    for f in fields:
        base = f.source.base
        if base != GoogleAdsBase.ANY:
            depth = BASE_DEPTH.get(base)
            if depth is None:
                raise ValueError(f"Unknown base '{base}' found in field {f.field}")
            if depth > max_depth:
                max_depth = depth
                resolved = base

    return str(resolved.value)
