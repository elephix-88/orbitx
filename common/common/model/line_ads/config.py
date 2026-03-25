from common.model.common import BaseAdsConfig


class LineAdsConfig(BaseAdsConfig):
    """Configuration for LINE Ads data extraction.

    Inherits from BaseAdsConfig:
        - connection_id: str - Reference to stored LINE OAuth connection
        - ad_account_id: list[str] - LINE Ads group IDs to query
        - fields: list[str] - Field names to extract (metrics + dimensions)
        - time_config: DateTimeConfig - Date range and increment settings

    LINE Ads API Notes:
        - Uses bearer token authentication
        - Base URL: https://ads.line.me/api/v3/
        - Reports endpoint provides campaign/adgroup/ad performance data
    """

    pass
