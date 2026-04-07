from unittest.mock import Mock

import pytest

from engine.factories.source import SourceFactory
from engine.interfaces.node import Extractor
from engine.node.extractors.facebook_ads.extractor import FacebookAdsExtractor
from engine.node.extractors.google_ads.extractor import GoogleAdsExtractor
from engine.node.extractors.s3 import S3Extractor
from engine.node.extractors.source_types import SourceType


def test_source_factory_creates_s3_extractor():
    """Verify that the factory correctly creates an S3Extractor."""
    factory = SourceFactory()
    mock_config = Mock()
    extractor = factory.create_extractor(mock_config, SourceType.S3.value)
    assert isinstance(extractor, S3Extractor)


def test_source_factory_creates_facebook_ads_extractor():
    """Verify that the factory correctly creates a FacebookAdsExtractor."""
    factory = SourceFactory()
    mock_config = Mock()
    extractor = factory.create_extractor(mock_config, SourceType.FacebookAds.value)
    assert isinstance(extractor, FacebookAdsExtractor)


def test_source_factory_creates_google_ads_extractor():
    """Verify that the factory correctly creates a GoogleAdsExtractor."""
    factory = SourceFactory()
    mock_config = Mock()
    extractor = factory.create_extractor(mock_config, SourceType.GoogleAds.value)
    assert isinstance(extractor, GoogleAdsExtractor)


def test_source_factory_raises_error_for_unknown_type():
    """Verify that the factory raises a ValueError for an unregistered source type."""
    factory = SourceFactory()
    mock_config = Mock()
    with pytest.raises(ValueError, match="Unknown source type: unknown_source"):
        factory.create_extractor(mock_config, "unknown_source")


def test_source_factory_register_and_create_custom_extractor():
    """Verify that a new custom extractor can be registered and created."""

    class CustomExtractor(Extractor):
        def __init__(self, config):
            self.config = config

        async def extract(self, row_limit=None):
            return "custom_data"

    factory = SourceFactory()
    factory.register("custom", CustomExtractor)

    mock_config = Mock()
    extractor = factory.create_extractor(mock_config, "custom")

    assert isinstance(extractor, CustomExtractor)
    assert extractor.extract() == "custom_data"
