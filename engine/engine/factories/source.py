from typing import Any

from common.model.error_trigger import ErrorTriggerConfig
from common.model.facebook.config import FacebookAdsConfig
from common.model.google.bigquery import BigQuerySourceConfig
from common.model.google.config import GoogleAdsConfig
from common.model.tiktok.config import TikTokAdsConfig
from engine.configs.config import settings
from engine.interfaces.factory import ExtractorFactory
from engine.interfaces.node import Extractor
from engine.node.extractors.bigquery_source.extractor import BigQueryExtractor
from engine.node.extractors.error_trigger_extractor import ErrorTriggerExtractor
from engine.node.extractors.facebook_ads.extractor import FacebookAdsExtractor
from engine.node.extractors.google_ads.extractor import GoogleAdsExtractor
from engine.node.extractors.s3 import S3Extractor
from engine.node.extractors.tiktok_ads.extractor import TikTokAdsExtractor

_CONFIG_CLASSES: dict[str, type[Any]] = {
    settings.services.facebook_ads: FacebookAdsConfig,
    settings.services.google_ads: GoogleAdsConfig,
    settings.services.tiktok_ads: TikTokAdsConfig,
    settings.services.bigquery_source: BigQuerySourceConfig,
    "error_trigger": ErrorTriggerConfig,
}


class SourceFactory(ExtractorFactory):
    """Factory backed by a registry of source implementations."""

    _DEFAULT_REGISTRY: dict[str, type[Extractor]] = {
        settings.services.s3: S3Extractor,
        settings.services.facebook_ads: FacebookAdsExtractor,
        settings.services.google_ads: GoogleAdsExtractor,
        settings.services.tiktok_ads: TikTokAdsExtractor,
        settings.services.bigquery_source: BigQueryExtractor,
        "error_trigger": ErrorTriggerExtractor,
    }

    def create_extractor(self, config: Any, node_id: str) -> Extractor:
        config_cls = _CONFIG_CLASSES.get(node_id)
        if config_cls and isinstance(config, dict):
            config = config_cls(**config)
        return self._create(config, node_id, "source")
