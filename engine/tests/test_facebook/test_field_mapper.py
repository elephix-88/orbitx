from common.model.facebook.common import Group
from common.model.facebook.fields import Endpoints
from common.model.facebook.fields import FacebookField as FieldConfig
from engine.node.extractors.facebook_ads.api.request.field_mapper import (
    analyze_primary_keys,
    build_processing_fields,
    get_primary_key_and_level,
    unify_fields,
)


def _f(
    field: str, group: Group, insights: str | None = None, *, pk=False, action_type=None
):
    return FieldConfig(
        field=field,
        group=group.value,
        data_type="string",
        is_primary_key=pk,
        active=True,
        endpoints=Endpoints(insights=insights if insights is not None else None),
        action_type=action_type,
    )


def test_analyze_primary_keys_and_level():
    fields = [
        _f("campaign_id", Group.INSIGHTS, insights="campaign_id", pk=True),
        _f("date", Group.INSIGHTS, insights="date_start"),
        _f("name", Group.INSIGHTS, insights="campaign_name"),
    ]

    pks, level, api_fields = analyze_primary_keys(fields)
    assert pks == ["campaign_id"]
    assert level == "campaign"
    # Insights endpoint for primary key should be included (not breakdowns)
    assert "campaign_id" in api_fields


def test_get_primary_key_and_level_wrapper():
    fields = [
        _f("ad_id", Group.INSIGHTS, insights="ad_id", pk=True),
        _f("date", Group.INSIGHTS, insights="date_start"),
    ]
    pks, level = get_primary_key_and_level(fields)
    assert pks == ["ad_id"]
    assert level == "ad"


def test_build_processing_fields_and_unify():
    fields = [
        _f("ad_id", Group.INSIGHTS, insights="ad_id", pk=True),
        _f("clicks", Group.INSIGHTS, insights="clicks"),
        FieldConfig(
            field="campaign_name",
            group=Group.CAMPAIGNS.value,
            data_type="string",
            is_primary_key=False,
            active=True,
            endpoints=Endpoints(campaigns="name"),
        ),
        FieldConfig(
            field="ad_creative_body",
            group=Group.ADS.value,
            data_type="string",
            is_primary_key=False,
            active=True,
            endpoints=Endpoints(ads="creative{body}"),
        ),
        FieldConfig(
            field="actions_purchase",
            group=Group.ACTIONS.value,
            data_type="integer",
            is_primary_key=False,
            active=True,
            endpoints=Endpoints(actions="actions"),
            action_type="purchase",
        ),
    ]

    (
        all_fields,
        selected_actions,
        selected_action_values,
        selected_conversions,
        selected_breakdowns,
        post_process_fields,
    ) = build_processing_fields(fields)

    # Insights fields should include non-breakdown insights
    assert "clicks" in all_fields
    # Primary key insights should be included via analyze_primary_keys
    assert "ad_id" in all_fields
    # Actions should capture action_type
    assert "purchase" in selected_actions
    # Post-processing fields should include campaigns/ads items
    assert any(f.field == "campaign_name" for f in post_process_fields)
    assert any(f.field == "ad_creative_body" for f in post_process_fields)

    # Unify should append non-duplicate post processing fields
    unified = unify_fields([fields[0], fields[1]], post_process_fields)
    names = {f.field for f in unified}
    assert {"ad_id", "clicks", "campaign_name", "ad_creative_body"}.issubset(names)
