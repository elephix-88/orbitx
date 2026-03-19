import pandas as pd
import pytest
from common.model.transform import (
    ColumnConversion,
    ColumnEditorConfig,
    DataType,
    NewColumn,
)

from engine.exceptions import TransformerException
from engine.node.transformers.column_editor import ColumnEditorTransformer


class TestColumnEditorTransformer:
    """Tests for ColumnEditorTransformer."""

    def test_rename_only(self):
        """Test renaming a column without type cast."""
        df = pd.DataFrame({"old_col": [1, 2, 3], "keep_col": [4, 5, 6]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="old_col", rename="new_col")]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "new_col" in result.columns
        assert "old_col" not in result.columns
        assert "keep_col" in result.columns
        assert list(result["new_col"]) == [1, 2, 3]

    def test_cast_only(self):
        """Test casting a column without renaming."""
        df = pd.DataFrame({"int_col": [1, 2, 3]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="int_col", cast=DataType.FLOAT)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "int_col" in result.columns
        assert result["int_col"].dtype == "float64"

    def test_rename_and_cast(self):
        """Test renaming and casting a column in one operation."""
        df = pd.DataFrame({"cost_micros": [1000000, 2000000, 3000000]})
        config = ColumnEditorConfig(
            conversions=[
                ColumnConversion(
                    column="cost_micros", rename="spend", cast=DataType.FLOAT
                )
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "spend" in result.columns
        assert "cost_micros" not in result.columns
        assert result["spend"].dtype == "float64"

    def test_multiple_conversions(self):
        """Test multiple column conversions at once."""
        df = pd.DataFrame(
            {
                "col_a": [1, 2, 3],
                "col_b": ["2024-01-01", "2024-01-02", "2024-01-03"],
                "col_c": [4, 5, 6],
            }
        )
        config = ColumnEditorConfig(
            conversions=[
                ColumnConversion(column="col_a", rename="alpha"),
                ColumnConversion(column="col_b", rename="date", cast=DataType.DATE),
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "alpha" in result.columns
        assert "date" in result.columns
        assert "col_c" in result.columns
        assert "col_a" not in result.columns
        assert "col_b" not in result.columns

    def test_empty_conversions_passthrough(self):
        """Test that empty conversions returns DataFrame unchanged."""
        df = pd.DataFrame({"col1": [1, 2, 3]})
        config = ColumnEditorConfig(conversions=[])
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert result is df

    def test_missing_column_raises_error(self):
        """Test that missing source column raises TransformerException."""
        df = pd.DataFrame({"existing": [1, 2, 3]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="nonexistent", rename="new")]
        )
        transformer = ColumnEditorTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            transformer.transform(df)

        assert "nonexistent" in str(exc_info.value)

    def test_duplicate_rename_raises_error(self):
        """Test that duplicate rename targets raise TransformerException."""
        df = pd.DataFrame({"a": [1], "b": [2], "c": [3]})
        config = ColumnEditorConfig(
            conversions=[
                ColumnConversion(column="a", rename="same"),
                ColumnConversion(column="b", rename="same"),
            ]
        )
        transformer = ColumnEditorTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            transformer.transform(df)

        assert "Duplicate" in str(exc_info.value)

    def test_cast_string_to_integer(self):
        """Test casting string to integer."""
        df = pd.DataFrame({"str_col": ["1", "2", "3"]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="str_col", cast=DataType.INTEGER)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert result["str_col"].dtype == "int64"
        assert list(result["str_col"]) == [1, 2, 3]

    def test_cast_to_boolean(self):
        """Test casting to boolean."""
        df = pd.DataFrame({"bool_col": [1, 0, 1]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="bool_col", cast=DataType.BOOLEAN)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert result["bool_col"].dtype == "bool"
        assert list(result["bool_col"]) == [True, False, True]

    def test_cast_to_date(self):
        """Test casting string to date."""
        df = pd.DataFrame({"date_col": ["2024-01-01", "2024-01-02", "2024-01-03"]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="date_col", cast=DataType.DATE)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        # DuckDB returns date as object type in pandas
        assert result["date_col"].iloc[0].year == 2024

    def test_cast_to_datetime(self):
        """Test casting string to datetime."""
        df = pd.DataFrame({"dt_col": ["2024-01-01 12:00:00", "2024-01-02 13:00:00"]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="dt_col", cast=DataType.DATETIME)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert pd.api.types.is_datetime64_any_dtype(result["dt_col"])

    def test_preserves_unmodified_columns(self):
        """Test that columns not in conversions are preserved."""
        df = pd.DataFrame(
            {
                "modify": [1, 2, 3],
                "keep1": ["a", "b", "c"],
                "keep2": [True, False, True],
            }
        )
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="modify", rename="modified")]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "modified" in result.columns
        assert "keep1" in result.columns
        assert "keep2" in result.columns
        assert list(result["keep1"]) == ["a", "b", "c"]
        assert list(result["keep2"]) == [True, False, True]

    def test_preserves_row_count(self):
        """Test that row count is preserved."""
        df = pd.DataFrame({"col": range(100)})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="col", rename="new_col")]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert len(result) == 100

    def test_empty_dataframe(self):
        """Test with empty DataFrame."""
        df = pd.DataFrame({"a": [], "b": []})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="a", rename="alpha")]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "alpha" in result.columns
        assert len(result) == 0

    def test_try_cast_handles_invalid_values(self):
        """Test that TRY_CAST returns NULL for invalid conversions."""
        df = pd.DataFrame({"mixed": ["1", "not_a_number", "3"]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="mixed", cast=DataType.INTEGER)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        # TRY_CAST should return NULL for invalid values
        assert pd.isna(result["mixed"].iloc[1])
        assert result["mixed"].iloc[0] == 1
        assert result["mixed"].iloc[2] == 3

    def test_update_field_schemas_rename_only(self):
        """Test update_field_schemas with rename only."""
        from pydantic import BaseModel

        class MockSchema(BaseModel):
            field: str
            data_type: str

        schemas = [
            MockSchema(field="old_name", data_type="string"),
            MockSchema(field="keep", data_type="integer"),
        ]
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="old_name", rename="new_name")]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.update_field_schemas(schemas)

        assert result[0].field == "new_name"
        assert result[0].data_type == "string"  # unchanged
        assert result[1].field == "keep"

    def test_update_field_schemas_cast_only(self):
        """Test update_field_schemas with cast only."""
        from pydantic import BaseModel

        class MockSchema(BaseModel):
            field: str
            data_type: str

        schemas = [MockSchema(field="col", data_type="string")]
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="col", cast=DataType.FLOAT)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.update_field_schemas(schemas)

        assert result[0].field == "col"  # unchanged
        assert result[0].data_type == "float"

    def test_update_field_schemas_rename_and_cast(self):
        """Test update_field_schemas with both rename and cast."""
        from pydantic import BaseModel

        class MockSchema(BaseModel):
            field: str
            data_type: str

        schemas = [MockSchema(field="cost_micros", data_type="integer")]
        config = ColumnEditorConfig(
            conversions=[
                ColumnConversion(
                    column="cost_micros", rename="spend", cast=DataType.FLOAT
                )
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.update_field_schemas(schemas)

        assert result[0].field == "spend"
        assert result[0].data_type == "float"

    def test_drop_single_column(self):
        """Test dropping a single column."""
        df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6], "c": [7, 8, 9]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="b", drop=True)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "a" in result.columns
        assert "b" not in result.columns
        assert "c" in result.columns
        assert len(result.columns) == 2

    def test_drop_multiple_columns(self):
        """Test dropping multiple columns."""
        df = pd.DataFrame({"a": [1], "b": [2], "c": [3], "d": [4]})
        config = ColumnEditorConfig(
            conversions=[
                ColumnConversion(column="b", drop=True),
                ColumnConversion(column="d", drop=True),
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert list(result.columns) == ["a", "c"]

    def test_drop_and_rename_combined(self):
        """Test dropping some columns while renaming others."""
        df = pd.DataFrame({"old_name": [1], "drop_me": [2], "keep": [3]})
        config = ColumnEditorConfig(
            conversions=[
                ColumnConversion(column="old_name", rename="new_name"),
                ColumnConversion(column="drop_me", drop=True),
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "new_name" in result.columns
        assert "drop_me" not in result.columns
        assert "keep" in result.columns

    def test_drop_and_cast_combined(self):
        """Test dropping some columns while casting others."""
        df = pd.DataFrame({"int_col": [1, 2], "drop_col": [3, 4]})
        config = ColumnEditorConfig(
            conversions=[
                ColumnConversion(column="int_col", cast=DataType.FLOAT),
                ColumnConversion(column="drop_col", drop=True),
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "int_col" in result.columns
        assert "drop_col" not in result.columns
        assert result["int_col"].dtype == "float64"

    def test_update_field_schemas_drop(self):
        """Test update_field_schemas removes dropped columns."""
        from pydantic import BaseModel

        class MockSchema(BaseModel):
            field: str
            data_type: str

        schemas = [
            MockSchema(field="keep", data_type="string"),
            MockSchema(field="drop_me", data_type="integer"),
            MockSchema(field="also_keep", data_type="float"),
        ]
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="drop_me", drop=True)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.update_field_schemas(schemas)

        assert len(result) == 2
        assert result[0].field == "keep"
        assert result[1].field == "also_keep"

    def test_drop_preserves_row_count(self):
        """Test that dropping columns preserves row count."""
        df = pd.DataFrame({"a": range(100), "b": range(100)})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="b", drop=True)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert len(result) == 100
        assert list(result.columns) == ["a"]

    # New column tests

    def test_add_single_new_column(self):
        """Test adding a single new column with constant value."""
        df = pd.DataFrame({"existing": [1, 2, 3]})
        config = ColumnEditorConfig(
            new_columns=[
                NewColumn(name="channel", value="Google", data_type=DataType.STRING)
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "existing" in result.columns
        assert "channel" in result.columns
        assert list(result["channel"]) == ["Google", "Google", "Google"]

    def test_add_multiple_new_columns(self):
        """Test adding multiple new columns."""
        df = pd.DataFrame({"a": [1, 2]})
        config = ColumnEditorConfig(
            new_columns=[
                NewColumn(name="source", value="API", data_type=DataType.STRING),
                NewColumn(name="version", value="2", data_type=DataType.INTEGER),
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "source" in result.columns
        assert "version" in result.columns
        assert list(result["source"]) == ["API", "API"]
        assert list(result["version"]) == [2, 2]

    def test_add_new_column_with_float_type(self):
        """Test adding a new column with float data type."""
        df = pd.DataFrame({"a": [1, 2, 3]})
        config = ColumnEditorConfig(
            new_columns=[NewColumn(name="rate", value="0.15", data_type=DataType.FLOAT)]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert result["rate"].dtype == "float64"
        assert list(result["rate"]) == [0.15, 0.15, 0.15]

    def test_add_new_column_with_boolean_type(self):
        """Test adding a new column with boolean data type."""
        df = pd.DataFrame({"a": [1, 2]})
        config = ColumnEditorConfig(
            new_columns=[
                NewColumn(name="active", value="true", data_type=DataType.BOOLEAN)
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert result["active"].dtype == "bool"
        assert list(result["active"]) == [True, True]

    def test_add_new_column_combined_with_conversions(self):
        """Test adding new columns alongside column conversions."""
        df = pd.DataFrame({"old_name": [1, 2], "int_col": [3, 4]})
        config = ColumnEditorConfig(
            conversions=[
                ColumnConversion(column="old_name", rename="new_name"),
                ColumnConversion(column="int_col", cast=DataType.FLOAT),
            ],
            new_columns=[
                NewColumn(name="channel", value="Facebook", data_type=DataType.STRING)
            ],
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "new_name" in result.columns
        assert "old_name" not in result.columns
        assert result["int_col"].dtype == "float64"
        assert "channel" in result.columns
        assert list(result["channel"]) == ["Facebook", "Facebook"]

    def test_add_new_column_with_drop(self):
        """Test adding new columns while dropping existing ones."""
        df = pd.DataFrame({"keep": [1], "drop_me": [2]})
        config = ColumnEditorConfig(
            conversions=[ColumnConversion(column="drop_me", drop=True)],
            new_columns=[
                NewColumn(name="new_col", value="value", data_type=DataType.STRING)
            ],
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "keep" in result.columns
        assert "drop_me" not in result.columns
        assert "new_col" in result.columns
        assert list(result.columns) == ["keep", "new_col"]

    def test_duplicate_new_column_name_raises_error(self):
        """Test that duplicate new column names raise error."""
        df = pd.DataFrame({"a": [1]})
        config = ColumnEditorConfig(
            new_columns=[
                NewColumn(name="same", value="v1", data_type=DataType.STRING),
                NewColumn(name="same", value="v2", data_type=DataType.STRING),
            ]
        )
        transformer = ColumnEditorTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            transformer.transform(df)

        assert "Duplicate" in str(exc_info.value)

    def test_new_column_conflicts_with_existing(self):
        """Test that new column name conflicting with existing raises error."""
        df = pd.DataFrame({"existing": [1, 2]})
        config = ColumnEditorConfig(
            new_columns=[
                NewColumn(name="existing", value="value", data_type=DataType.STRING)
            ]
        )
        transformer = ColumnEditorTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            transformer.transform(df)

        assert "Duplicate" in str(exc_info.value)

    def test_new_column_with_special_characters(self):
        """Test adding a column with value containing special characters."""
        df = pd.DataFrame({"a": [1, 2]})
        config = ColumnEditorConfig(
            new_columns=[
                NewColumn(name="text", value="It's a test", data_type=DataType.STRING)
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert list(result["text"]) == ["It's a test", "It's a test"]

    def test_update_field_schemas_new_columns(self):
        """Test update_field_schemas adds schemas for new columns."""
        from pydantic import BaseModel

        class MockSchema(BaseModel):
            field: str
            data_type: str

        schemas = [MockSchema(field="existing", data_type="string")]
        config = ColumnEditorConfig(
            new_columns=[
                NewColumn(name="channel", value="Google", data_type=DataType.STRING),
                NewColumn(name="count", value="10", data_type=DataType.INTEGER),
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.update_field_schemas(schemas)

        assert len(result) == 3
        assert result[0].field == "existing"
        assert result[1].field == "channel"
        assert result[1].data_type == "string"
        assert result[2].field == "count"
        assert result[2].data_type == "integer"

    def test_only_new_columns_no_conversions(self):
        """Test adding only new columns without any conversions."""
        df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
        config = ColumnEditorConfig(
            conversions=[],
            new_columns=[
                NewColumn(name="source", value="test", data_type=DataType.STRING)
            ],
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert list(result.columns) == ["a", "b", "source"]
        assert list(result["source"]) == ["test", "test", "test"]

    def test_empty_dataframe_with_new_column(self):
        """Test adding new column to empty DataFrame."""
        df = pd.DataFrame({"a": []})
        config = ColumnEditorConfig(
            new_columns=[
                NewColumn(name="new", value="value", data_type=DataType.STRING)
            ]
        )
        transformer = ColumnEditorTransformer(config)

        result = transformer.transform(df)

        assert "new" in result.columns
        assert len(result) == 0
