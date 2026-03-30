from collections.abc import Iterator
from typing import Any

import pandas as pd
from loguru import logger

from common.model.facebook.common import Group
from common.model.facebook.fields import FacebookField as FieldConfig
from engine.node.extractors.facebook_ads.api.request.field_mapper import unify_fields
from engine.node.extractors.facebook_ads.api.request.post_processing import (
    normalize_data,
)
from engine.utils.dtypes import (
    apply_dtypes,
    create_dtype_mapping,
    validate_df_with_fields,
)

NESTED_FIELDS = ["actions", "action_values", "conversions"]


def _create_empty_dataframe(
    selected_fields: list[FieldConfig],
    post_processing_fields: list[FieldConfig] | None = None,
) -> pd.DataFrame:
    """Create empty DataFrame with proper schema"""
    logger.warning("Processing empty data - creating DataFrame with proper schema")

    all_fields = unify_fields(selected_fields, post_processing_fields)
    schema_dtypes = create_dtype_mapping(all_fields)

    data_dict = {
        field: pd.Series(dtype=dtype) for field, dtype in schema_dtypes.items()
    }
    df = pd.DataFrame(data_dict)

    logger.info(f"Empty DataFrame created: {df.shape[1]} columns")

    validation_df = df[[f.field for f in selected_fields if f.field in df.columns]]
    validated_df = validate_df_with_fields(validation_df, selected_fields, strict=True)
    df.update(validated_df)

    return df


def _merge_metadata(
    df: pd.DataFrame,
    metadata_tags: list[str] | None,
    post_processing_fields: list[FieldConfig],
    id_type: str,
    endpoint_group: str,
    batch_result: dict,
) -> pd.DataFrame:
    """Generic function to merge metadata with main DataFrame"""
    logger.info(f"Merging {id_type} data")

    drop_cols = [
        field.field
        for field in post_processing_fields
        if field.group.lower() == endpoint_group.lower()
    ]
    df = df.drop(columns=drop_cols, errors="ignore")

    if not metadata_tags:
        return df

    rows: list[dict[str, Any]] = []
    data_by_tag = batch_result.get("data_by_tag", {})
    for tag in metadata_tags:
        rows.extend(data_by_tag.get(tag, []))

    if not rows:
        logger.warning(f"No metadata rows found for {endpoint_group}")
        return df

    metadata_df = normalize_data(
        rows, post_processing_fields, endpoint_name=endpoint_group
    )

    id_field = f"{id_type}_id"
    df = pd.merge(df, metadata_df, left_on=id_field, right_on="id", how="inner").drop(
        columns=["id"], errors="ignore"
    )

    logger.info(f"{id_type.capitalize()} merge completed: {df.shape}")
    return df


def flatten_data(
    records: list[dict], selected_fields: list[FieldConfig]
) -> Iterator[dict]:
    """Flatten nested Facebook Ads data structures"""
    required_fields = {f.field for f in selected_fields}

    for row in records:
        flat = row.copy()
        if "date_start" in flat:
            flat["date"] = flat["date_start"]
        elif "date_stop" in flat:
            flat["date"] = flat["date_stop"]
        flat.pop("date_start", None)
        flat.pop("date_stop", None)

        base = {k: v for k, v in flat.items() if k not in NESTED_FIELDS}

        for nested_field in NESTED_FIELDS:
            for item in row.get(nested_field, []):
                action_type = item.get("action_type", "").replace(".", "_")
                col_name = f"{nested_field}_{action_type}"
                base[col_name] = item.get("value")

        yield {field: base.get(field) for field in required_fields}


def _process_data(
    insights_data: list[dict],
    selected_fields: list[FieldConfig],
    post_processing_fields: list[FieldConfig],
) -> pd.DataFrame:
    """Process non-empty insights data"""
    logger.info(f"Processing {len(insights_data):,} records")

    all_fields = unify_fields(selected_fields, post_processing_fields)
    schema_dtypes = create_dtype_mapping(all_fields)

    insights_results = list(flatten_data(insights_data, selected_fields))
    df = pd.DataFrame(insights_results)

    df = apply_dtypes(df, schema_dtypes)
    df = validate_df_with_fields(df, all_fields, strict=True)
    logger.info(f"Data processing completed: {df.shape}")
    return df


def post_process_data(
    df: pd.DataFrame,
    campaigns_result_tags: list[str] | None,
    ads_result_tags: list[str] | None,
    post_processing_fields: list[FieldConfig],
    batch_result: dict,
) -> pd.DataFrame:
    """Post-process data"""
    if campaigns_result_tags:
        df = _merge_metadata(
            df,
            campaigns_result_tags,
            post_processing_fields,
            "campaign",
            Group.CAMPAIGNS.value,
            batch_result,
        )
    if ads_result_tags:
        df = _merge_metadata(
            df,
            ads_result_tags,
            post_processing_fields,
            "ad",
            Group.ADS.value,
            batch_result,
        )
    return df


def create_dataframe(
    insights_data: list[dict],
    selected_fields: list[FieldConfig],
    campaigns_result_tags: list[str] | None,
    ads_result_tags: list[str] | None,
    post_processing_fields: list[FieldConfig],
    batch_result: dict,
) -> pd.DataFrame:
    """Main function to create DataFrame from insights data"""
    logger.info(f"Creating DataFrame from {len(insights_data):,} records")

    if not insights_data:
        logger.warning("No insights data found - creating empty DataFrame")
        return _create_empty_dataframe(selected_fields, post_processing_fields)
    else:
        df = _process_data(
            insights_data,
            selected_fields,
            post_processing_fields,
        )
        df = post_process_data(
            df,
            campaigns_result_tags,
            ads_result_tags,
            post_processing_fields,
            batch_result,
        )
        all_fields_after = unify_fields(selected_fields, post_processing_fields)
        schema_dtypes_after = create_dtype_mapping(all_fields_after)
        df = apply_dtypes(df, schema_dtypes_after)
        df = validate_df_with_fields(df, all_fields_after, strict=True)
        logger.info(f"Data processing completed: {df.shape}")
        return df


def merge_data(
    batch_result: dict[str, Any],
    selected_fields: list[FieldConfig],
    post_process_fields: list[FieldConfig],
    access_token: str,
) -> tuple[pd.DataFrame, dict]:
    logger.info(f"Merging data from {len(batch_result['data_by_tag'])} tags")

    insights_data = []
    account_data_summary: dict[str, int] = {}

    try:
        for tag, rows in batch_result["data_by_tag"].items():
            insights_data.extend(rows)

            if tag.startswith("fb_insights_batch_"):
                account_id = _extract_account_from_tag(tag)
                account_data_summary[account_id] = account_data_summary.get(
                    account_id, 0
                ) + len(rows)

        campaigns_result_tags, ads_result_tags, batch_result = _handle_post_processing(
            post_process_fields, insights_data, batch_result, access_token
        )

        df = create_dataframe(
            insights_data,
            selected_fields,
            campaigns_result_tags,
            ads_result_tags,
            post_process_fields,
            batch_result,
        )

        _log_account_summary(account_data_summary, len(df))

        return df, batch_result
    except Exception as ex:
        raise ex


def _handle_post_processing(
    post_process_fields: list[FieldConfig],
    insights_data: list[dict],
    batch_result: dict,
    access_token: str,
) -> tuple[list[str] | None, list[str] | None, dict]:
    """Handles campaign and ads post-processing.
    Note: This is sync because it's called from merge_data which handles
    the post_processing object that needs async internally.
    For now, keeping sync - the PostProcessing methods will need to be
    called from an async context separately if needed.
    """
    campaigns_result_tags: list[str] | None = None
    ads_result_tags: list[str] | None = None

    if not post_process_fields or not insights_data:
        return None, None, batch_result

    # PostProcessing now has async methods, but this merge_data function
    # is called synchronously. We keep the sync interface for now.
    # The actual async post-processing happens in the batch planner level.

    return campaigns_result_tags, ads_result_tags, batch_result


def _extract_account_from_tag(tag: str) -> str:
    """Extract account ID from standardized tag."""
    try:
        parts = tag.split("_")
        if len(parts) >= 5:
            return f"act_{parts[-2]}"
        return "unknown_account"
    except Exception:
        return "unknown_account"


def _log_account_summary(
    account_data_summary: dict[str, int], final_df_length: int
) -> None:
    """Log summary of data extraction per account"""
    total_raw_records = sum(account_data_summary.values())

    logger.success("Facebook Ads Data Extraction Summary:")
    for account_id, record_count in account_data_summary.items():
        percentage = (
            (record_count / total_raw_records * 100) if total_raw_records > 0 else 0
        )
        logger.success(f"{account_id}: {record_count:,} records ({percentage:.1f}%)")

    logger.success(f"Total Raw Records: {total_raw_records:,}")
    logger.success(f"Final DataFrame: {final_df_length:,} records")
