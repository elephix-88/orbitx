from typing import Any

from engine.configs.config import settings
from engine.interfaces.factory import ExtractorFactory
from engine.interfaces.node import Extractor
from engine.node.extractors.bigquery_source.extractor import BigQueryExtractor
from engine.node.extractors.facebook_ads.extractor import FacebookAdsExtractor
from engine.node.extractors.google_ads.extractor import GoogleAdsExtractor
from engine.node.extractors.s3 import S3Extractor
from engine.node.extractors.tiktok_ads.extractor import TikTokAdsExtractor
from common.model.facebook.config import FacebookAdsConfig
from common.model.google.ads_config import GoogleAdsConfig
from common.model.google.bigquery import BigQuerySourceConfig
from common.model.tiktok.config import TikTokAdsConfig

_CONFIG_CLASSES: dict[str, type[Any]] = {
    settings.services.facebook_ads: FacebookAdsConfig,
    settings.services.google_ads: GoogleAdsConfig,
    settings.services.tiktok_ads: TikTokAdsConfig,
    settings.services.bigquery_source: BigQuerySourceConfig,
}


class SourceFactory(ExtractorFactory):
    """Factory backed by a registry of source implementations."""

    _DEFAULT_REGISTRY: dict[str, type[Extractor]] = {
        settings.services.s3: S3Extractor,
        settings.services.facebook_ads: FacebookAdsExtractor,
        settings.services.google_ads: GoogleAdsExtractor,
        settings.services.tiktok_ads: TikTokAdsExtractor,
        settings.services.bigquery_source: BigQueryExtractor,
    }

    def create_extractor(self, config: Any, node_id: str) -> Extractor:
        config_cls = _CONFIG_CLASSES.get(node_id)
        if config_cls and isinstance(config, dict):
            config = config_cls(**config)
        return self._create(config, node_id, "source")
