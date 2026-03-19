from common.model.common import BaseAdsConfig


class TikTokAdsConfig(BaseAdsConfig):
    """Configuration for TikTok Ads data extraction.

    Inherits from BaseAdsConfig:
        - connection_id: str - Reference to stored TikTok OAuth connection
        - ad_account_id: List[str] - TikTok advertiser IDs to query
        - fields: List[str] - Field names to extract (metrics + dimensions)
        - time_config: DateTimeConfig - Date range and increment settings

    TikTok API Notes:
        - Uses advertiser_id instead of ad_account_id in API calls
        - Supports data_level: AUCTION_CAMPAIGN, AUCTION_ADGROUP, AUCTION_AD
        - Report endpoint: POST /open_api/v1.3/report/integrated/get/
    """

    pass
