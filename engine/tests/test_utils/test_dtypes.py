import pandas as pd
from common.model.facebook.fields import Endpoints
from common.model.facebook.fields import FacebookField as FieldConfig

from engine.utils.dtypes import (
    apply_dtypes,
    create_dtype_mapping,
    get_pandas_dtype_str,
    normalize_join_keys,
    validate_df_with_fields,
)


def test_get_pandas_dtype_str():
    assert get_pandas_dtype_str("integer") == "Int64"
    assert get_pandas_dtype_str("float") == "Float64"
    assert get_pandas_dtype_str("string") == "string"
    assert get_pandas_dtype_str("date") == "datetime64[ns]"
    assert get_pandas_dtype_str("boolean") == "boolean"


def test_create_dtype_mapping():
    fields = [
        FieldConfig(
            field="id",
            group="insights",
            data_type="integer",
            is_primary_key=True,
            active=True,
            endpoints=Endpoints(
                insights="insights",
                actions=None,
                action_values=None,
                conversions=None,
                breakdowns=None,
                campaigns=None,
                ads=None,
            ),
            action_type=None,
        ),
        FieldConfig(
            field="name",
            group="insights",
            data_type="string",
            is_primary_key=False,
            active=True,
            endpoints=Endpoints(insights="insights"),
        ),
        FieldConfig(
            field="age",
            group="breakdowns",
            data_type="integer",
            is_primary_key=False,
            active=True,
            endpoints=Endpoints(breakdowns="breakdowns"),
            action_type=None,
        ),
        FieldConfig(
            field="actions_values",
            group="action_values",
            data_type="integer",
            is_primary_key=False,
            active=True,
            endpoints=Endpoints(action_values="action_values"),
            action_type=None,
        ),
        FieldConfig(
            field="conversions",
            group="conversions",
            data_type="integer",
            is_primary_key=False,
            active=True,
            endpoints=Endpoints(conversions="conversions"),
            action_type=None,
        ),
        FieldConfig(
            field="campaigns",
            group="campaigns",
            data_type="integer",
            is_primary_key=False,
            active=True,
            endpoints=Endpoints(campaigns="campaigns"),
            action_type=None,
        ),
    ]
    assert create_dtype_mapping(fields) == {
        "id": "Int64",
        "name": "string",
        "age": "Int64",
        "actions_values": "Int64",
        "conversions": "Int64",
        "campaigns": "Int64",
    }


def test_apply_dtypes():
    df = pd.DataFrame(
        {
            "id": [1, 2, 3],
            "name": ["John", "Jane", "Jim"],
            "age": [25, 30, 35],
            "created_at": ["2021-01-01", "2021-01-02", "2021-01-03"],
        }
    )
    dtype_map = {
        "id": "Int64",
        "name": "string",
        "age": "Int64",
        "created_at": "datetime64[ns]",
    }

    result = apply_dtypes(df, dtype_map)
    assert result["id"].dtype == "Int64"
    assert result["name"].dtype == "string"
    assert result["age"].dtype == "Int64"
    assert result["created_at"].dtype == "datetime64[ns]"


def test_validate_df_with_fields():
    fields = [
        FieldConfig(
            field="id",
            group="insights",
            data_type="integer",
            is_primary_key=True,
            active=True,
            endpoints=Endpoints(insights="insights"),
        ),
        FieldConfig(
            field="name",
            group="insights",
            data_type="string",
            is_primary_key=False,
            active=True,
            endpoints=Endpoints(insights="insights"),
        ),
    ]

    # Test valid dataframe
    df = pd.DataFrame({"id": [1, 2], "name": ["A", "B"]})
    result = validate_df_with_fields(df, fields, strict=True)
    assert result["id"].dtype == "Int64"
    assert result["name"].dtype == "string"
    assert len(result.columns) == 2

    # Test missing column (should be added as None)
    df_missing = pd.DataFrame({"id": [1, 2]})
    result_missing = validate_df_with_fields(df_missing, fields, strict=True)
    assert "name" in result_missing.columns
    assert result_missing["name"].isna().all()

    # Test extra column (should be removed in strict mode)
    df_extra = pd.DataFrame({"id": [1, 2], "name": ["A", "B"], "extra": [1, 2]})
    result_extra = validate_df_with_fields(df_extra, fields, strict=True)
    assert "extra" not in result_extra.columns


def test_normalize_join_keys_same_type():
    """Test that same types are not converted."""
    left = pd.DataFrame({"key": ["a", "b", "c"]})
    right = pd.DataFrame({"key": ["a", "b", "d"]})

    result_left, result_right = normalize_join_keys(left, right, "key", "key")

    assert result_left["key"].dtype == "object"
    assert result_right["key"].dtype == "object"
    assert list(result_left["key"]) == ["a", "b", "c"]


def test_normalize_join_keys_datetime_and_string():
    """Test datetime + date string promotes string to datetime (preserves DATE type)."""
    left = pd.DataFrame({"date": pd.to_datetime(["2024-01-01", "2024-01-02"])})
    right = pd.DataFrame({"date": ["2024-01-01", "2024-01-02"]})

    result_left, result_right = normalize_join_keys(left, right, "date", "date")

    # Both should be datetime (preserves DATE type for BigQuery)
    assert pd.api.types.is_datetime64_any_dtype(result_left["date"].dtype)
    assert pd.api.types.is_datetime64_any_dtype(result_right["date"].dtype)


def test_normalize_join_keys_numeric_and_string():
    """Test numeric + int string promotes string to int (preserves INTEGER type)."""
    left = pd.DataFrame({"id": [1, 2, 3]})
    right = pd.DataFrame({"id": ["1", "2", "3"]})

    result_left, result_right = normalize_join_keys(left, right, "id", "id")

    # Left stays int, right converted to int
    assert pd.api.types.is_integer_dtype(result_left["id"].dtype)
    assert pd.api.types.is_integer_dtype(result_right["id"].dtype)
    assert list(result_right["id"]) == [1, 2, 3]


def test_normalize_join_keys_int_and_float():
    """Test int + float promotes int to float (preserves NUMERIC type)."""
    left = pd.DataFrame({"val": [1, 2, 3]})
    right = pd.DataFrame({"val": [1.0, 2.0, 3.0]})

    result_left, result_right = normalize_join_keys(left, right, "val", "val")

    # Int promoted to Float64
    assert pd.api.types.is_float_dtype(result_left["val"].dtype)
    assert pd.api.types.is_float_dtype(result_right["val"].dtype)


def test_normalize_join_keys_preserves_date_type():
    """Test that datetime is preserved as datetime for BigQuery DATE compatibility."""
    left = pd.DataFrame({"date": pd.to_datetime(["2024-12-01", "2024-12-02"])})
    right = pd.DataFrame({"report_date": ["2024-12-01", "2024-12-02"]})

    result_left, result_right = normalize_join_keys(left, right, "date", "report_date")

    # Date column should be datetime (will become DATE in BigQuery)
    assert pd.api.types.is_datetime64_any_dtype(result_left["date"].dtype)
    assert pd.api.types.is_datetime64_any_dtype(result_right["report_date"].dtype)
