from enum import Enum

from common.model.facebook.common import Group
from common.model.facebook.fields import FacebookField as FieldConfig


class ReportLevel(str, Enum):
    AD = "ad"
    CAMPAIGN = "campaign"
    ADSET = "adset"

    @classmethod
    def get_level_from_keys(cls, primary_keys: list[str]) -> str:
        if not primary_keys:
            return cls.AD.value

        keys = set(primary_keys)

        if "ad_id" in keys:
            return cls.AD.value
        elif "adset_id" in keys:
            return cls.ADSET.value
        elif "campaign_id" in keys:
            return cls.CAMPAIGN.value

        return cls.AD.value


def analyze_primary_keys(
    field_config: list[FieldConfig],
) -> tuple[list[str], str, set[str]]:
    """Analyze primary keys once and return (primary_keys, level, api_fields)."""
    primary_keys = [field.field for field in field_config if field.is_primary_key]
    level = ReportLevel.get_level_from_keys(primary_keys)

    api_fields: set[str] = set()
    primary_key_set = set(primary_keys)
    for config in field_config:
        insights_field = config.endpoints.insights
        if config.field in primary_key_set:
            if insights_field and config.group != Group.BREAKDOWNS.value:
                api_fields.add(insights_field)

    return primary_keys, level, api_fields


def get_primary_key_and_level(field_config: list[FieldConfig]) -> tuple[list[str], str]:
    primary_keys, level, _ = analyze_primary_keys(field_config)
    return primary_keys, level


def build_processing_fields(
    field_config: list[FieldConfig],
) -> tuple[set[str], set[str], set[str], set[str], set[str], list[FieldConfig]]:
    all_fields = set()
    selected_actions = set()
    selected_actions_value = set()
    selected_conversions = set()
    selected_breakdown = set()
    post_process_fields = []

    for field in field_config:
        if field.group == Group.INSIGHTS.value:
            all_fields.add(field.endpoints.insights)

        elif field.group == Group.ACTIONS.value and field.action_type:
            selected_actions.add(field.action_type)
            all_fields.add(field.group)

        elif field.group == Group.ACTION_VALUES.value and field.action_type:
            selected_actions_value.add(field.action_type)
            all_fields.add(field.group)

        elif field.group == Group.CONVERSIONS.value and field.action_type:
            selected_conversions.add(field.action_type)
            all_fields.add(field.group)

        elif field.group == Group.BREAKDOWNS.value:
            selected_breakdown.add(field.field)

        elif field.group == Group.CAMPAIGNS.value or field.group == Group.ADS.value:
            post_process_fields.append(field)

    _, _, api_fields_for_keys = analyze_primary_keys(field_config)
    all_fields.update(api_fields_for_keys)

    return (
        all_fields,
        selected_actions,
        selected_actions_value,
        selected_conversions,
        selected_breakdown,
        post_process_fields,
    )


def unify_fields(
    selected_fields: list[FieldConfig],
    post_processing_fields: list[FieldConfig] | None = None,
) -> list[FieldConfig]:
    """Merge two field lists without duplicates by field name."""
    if not post_processing_fields:
        return selected_fields
    existing = {f.field for f in selected_fields}
    unique_post = [f for f in post_processing_fields if f.field not in existing]
    return selected_fields + unique_post
