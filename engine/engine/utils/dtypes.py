
import pandas as pd
from loguru import logger

from common.model.facebook.fields import FacebookField as FieldConfig

_PANDAS_DTYPE: dict[str, str] = {
    "integer": "Int64",
    "float": "Float64",
    "string": "string",
    "boolean": "boolean",
    "date": "datetime64[ns]",
}


def get_pandas_dtype_str(data_type: str) -> str:
    """Return pandas dtype string for a canonical data_type key."""
    return _PANDAS_DTYPE.get(data_type, "string")


def create_dtype_mapping(fields: list[FieldConfig]) -> dict[str, str]:
    """Create pandas dtype mapping from a list of FieldConfig."""
    return {f.field: get_pandas_dtype_str(f.data_type) for f in fields}


def _safe_dtype_conversion(df: pd.DataFrame, field: str, target_dtype: str) -> bool:
    """Attempt to convert a DataFrame column to the target dtype."""
    if field not in df.columns:
        return True
    try:
        if target_dtype == "Int64":
            df[field] = pd.to_numeric(df[field], errors="coerce").astype("Int64")
        elif target_dtype == "Float64":
            df[field] = pd.to_numeric(df[field], errors="coerce").astype("Float64")
        elif target_dtype == "datetime64[ns]":
            df[field] = pd.to_datetime(df[field], errors="coerce")
        elif target_dtype == "string":
            df[field] = df[field].astype("string")
        elif target_dtype == "boolean":
            df[field] = df[field].astype("boolean")
        return True
    except (ValueError, TypeError) as ex:
        logger.warning(f"Failed to convert field '{field}' to {target_dtype}: {ex}")
        return False


def apply_dtypes(df: pd.DataFrame, dtype_map: dict[str, str]) -> pd.DataFrame:
    """Apply data types to a DataFrame using a field->dtype mapping."""
    failed_fields = []
    for field, target_dtype in dtype_map.items():
        if not _safe_dtype_conversion(df, field, target_dtype):
            failed_fields.append(field)

    if failed_fields:
        logger.warning(
            f"Type conversion failed for {len(failed_fields)} fields: {failed_fields}"
        )
    return df


def normalize_join_keys(
    left_df: pd.DataFrame,
    right_df: pd.DataFrame,
    left_key: str,
    right_key: str,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Normalize join key columns to compatible types for joining."""
    left_df = left_df.copy()
    right_df = right_df.copy()

    left_col = left_df[left_key]
    right_col = right_df[right_key]
    left_dtype = left_col.dtype
    right_dtype = right_col.dtype

    if left_dtype == right_dtype:
        return left_df, right_df

    def is_date_string(col: pd.Series) -> bool:
        if col.dtype != "object" and str(col.dtype) != "string":
            return False
        sample = col.dropna().head(100)
        if len(sample) == 0:
            return False
        try:
            pd.to_datetime(sample, format="%Y-%m-%d")
            return True
        except (ValueError, TypeError):
            return False

    def is_int_string(col: pd.Series) -> bool:
        if col.dtype != "object" and str(col.dtype) != "string":
            return False
        sample = col.dropna().head(100)
        if len(sample) == 0:
            return False
        try:
            return all(str(v).lstrip("-").isdigit() for v in sample)
        except (ValueError, TypeError):
            return False

    left_is_datetime = pd.api.types.is_datetime64_any_dtype(left_dtype)
    right_is_datetime = pd.api.types.is_datetime64_any_dtype(right_dtype)
    left_is_numeric = pd.api.types.is_numeric_dtype(left_dtype)
    right_is_numeric = pd.api.types.is_numeric_dtype(right_dtype)
    left_is_int = pd.api.types.is_integer_dtype(left_dtype)
    right_is_int = pd.api.types.is_integer_dtype(right_dtype)
    left_is_float = pd.api.types.is_float_dtype(left_dtype)
    right_is_float = pd.api.types.is_float_dtype(right_dtype)
    left_is_string = left_dtype == "object" or str(left_dtype) == "string"
    right_is_string = right_dtype == "object" or str(right_dtype) == "string"

    if left_is_datetime and right_is_string and is_date_string(right_col):
        right_df[right_key] = pd.to_datetime(right_col).dt.normalize()
        left_df[left_key] = left_col.dt.normalize()
        return left_df, right_df

    if right_is_datetime and left_is_string and is_date_string(left_col):
        left_df[left_key] = pd.to_datetime(left_col).dt.normalize()
        right_df[right_key] = right_col.dt.normalize()
        return left_df, right_df

    if left_is_datetime and right_is_datetime:
        left_df[left_key] = left_col.dt.normalize()
        right_df[right_key] = right_col.dt.normalize()
        return left_df, right_df

    if left_is_int and right_is_float:
        left_df[left_key] = left_col.astype("Float64")
        return left_df, right_df

    if right_is_int and left_is_float:
        right_df[right_key] = right_col.astype("Float64")
        return left_df, right_df

    if left_is_int and right_is_string and is_int_string(right_col):
        right_df[right_key] = pd.to_numeric(right_col, errors="coerce").astype("Int64")
        return left_df, right_df

    if right_is_int and left_is_string and is_int_string(left_col):
        left_df[left_key] = pd.to_numeric(left_col, errors="coerce").astype("Int64")
        return left_df, right_df

    if left_is_numeric and right_is_string:
        try:
            right_df[right_key] = pd.to_numeric(right_col, errors="coerce").astype(
                "Float64"
            )
            return left_df, right_df
        except (ValueError, TypeError):
            pass

    if right_is_numeric and left_is_string:
        try:
            left_df[left_key] = pd.to_numeric(left_col, errors="coerce").astype(
                "Float64"
            )
            return left_df, right_df
        except (ValueError, TypeError):
            pass

    logger.warning(
        f"Type mismatch for join keys '{left_key}' ({left_dtype}) and "
        f"'{right_key}' ({right_dtype}). Converting both to string."
    )

    def to_string(col: pd.Series) -> pd.Series:
        dtype = col.dtype
        if pd.api.types.is_datetime64_any_dtype(dtype):
            return col.dt.strftime("%Y-%m-%d")
        return col.astype(str)

    if not left_is_string:
        left_df[left_key] = to_string(left_col)
    if not right_is_string:
        right_df[right_key] = to_string(right_col)

    return left_df, right_df


def validate_df_with_fields(
    df: pd.DataFrame, selected_fields: list[FieldConfig], strict: bool = True
) -> pd.DataFrame:
    """Validate DataFrame against selected fields using pure Pandas."""
    dtype_map = create_dtype_mapping(selected_fields)

    for field in dtype_map.keys():
        if field not in df.columns:
            df[field] = None

    df = apply_dtypes(df, dtype_map)

    if strict:
        expected_cols = set(dtype_map.keys())
        current_cols = set(df.columns)
        extra_cols = current_cols - expected_cols
        if extra_cols:
            df = df[list(expected_cols)]

    return df
