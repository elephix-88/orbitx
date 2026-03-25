"""Import verification — all Sprint 2 modules must import cleanly."""

import pytest


def test_ga4_extractor_imports():
    from engine.node.extractors.ga4.extractor import GA4Extractor
    assert GA4Extractor is not None


def test_ga4_config_imports():
    from common.model.google.ga4 import GA4Config
    assert GA4Config is not None


def test_pulse_generator_imports():
    from engine.node.intelligence.pulse_generator import (
        PulseAggregation,
        PulseResult,
        aggregate_marketing_data,
        build_pulse_blocks,
        generate_pulse_summary,
        safe_divide,
    )
    assert aggregate_marketing_data is not None
    assert build_pulse_blocks is not None
    assert generate_pulse_summary is not None


def test_unify_transformer_imports():
    from engine.node.transformers.unify import UnifyTransformer, GA4_MAPPING, PLATFORM_MAPPINGS
    assert UnifyTransformer is not None
    assert "ga4" in PLATFORM_MAPPINGS


def test_ga4_in_platform_mappings():
    """GA4 must be registered in the PLATFORM_MAPPINGS dict."""
    from engine.node.transformers.unify import PLATFORM_MAPPINGS
    assert "ga4" in PLATFORM_MAPPINGS
    mapping = PLATFORM_MAPPINGS["ga4"]
    assert "sessionCampaignName" in mapping
    assert mapping["sessionCampaignName"] == "campaign_name"
    assert "purchaseRevenue" in mapping
    assert mapping["purchaseRevenue"] == "conversion_value"


def test_pulse_generator_constants():
    """PULSE_MODEL and PULSE_MAX_TOKENS must be defined."""
    from engine.node.intelligence.pulse_generator import PULSE_MODEL, PULSE_MAX_TOKENS
    assert isinstance(PULSE_MODEL, str)
    assert len(PULSE_MODEL) > 0
    assert isinstance(PULSE_MAX_TOKENS, int)
    assert PULSE_MAX_TOKENS > 0
