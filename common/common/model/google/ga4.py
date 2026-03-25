from common.model.common import BaseConnectedConfig, DateTimeConfig


class GA4Config(BaseConnectedConfig):
    """Configuration for GA4 data extraction.

    GA4 uses property_id (not ad_account_id) and explicit dimension/metric lists
    instead of a generic fields list, because the GA4 Data API requires dimensions
    and metrics to be separated in the RunReportRequest.

    Property ID format: "properties/123456789" or just "123456789" (we normalize).
    """

    property_id: str
    dimensions: list[str]
    metrics: list[str]
    time_config: DateTimeConfig
