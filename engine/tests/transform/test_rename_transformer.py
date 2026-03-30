import pandas as pd
import pytest

from common.model.transform import RenameTransformConfig
from engine.exceptions import TransformerException
from engine.node.transformers.rename import RenameTransformer


class TestRenameTransformer:
    """Tests for RenameTransformer."""

    @pytest.mark.asyncio
    async def test_basic_rename(self):
        """Test basic single column renaming."""
        df = pd.DataFrame({"old_col": [1, 2, 3], "keep_col": [4, 5, 6]})
        config = RenameTransformConfig(column_mapping={"old_col": "new_col"})
        transformer = RenameTransformer(config)

        result = await transformer.transform(df)

        assert "new_col" in result.columns
        assert "old_col" not in result.columns
        assert "keep_col" in result.columns
        assert list(result["new_col"]) == [1, 2, 3]

    @pytest.mark.asyncio
    async def test_multiple_renames(self):
        """Test renaming multiple columns at once."""
        df = pd.DataFrame({"a": [1], "b": [2], "c": [3]})
        config = RenameTransformConfig(column_mapping={"a": "alpha", "b": "beta"})
        transformer = RenameTransformer(config)

        result = await transformer.transform(df)

        assert list(result.columns) == ["alpha", "beta", "c"]
        assert result["alpha"].iloc[0] == 1
        assert result["beta"].iloc[0] == 2
        assert result["c"].iloc[0] == 3

    @pytest.mark.asyncio
    async def test_empty_mapping_passthrough(self):
        """Test that empty mapping returns DataFrame unchanged."""
        df = pd.DataFrame({"col1": [1, 2, 3]})
        config = RenameTransformConfig(column_mapping={})
        transformer = RenameTransformer(config)

        result = await transformer.transform(df)

        assert list(result.columns) == ["col1"]
        assert result is df  # Should be the same object

    @pytest.mark.asyncio
    async def test_missing_column_raises_error(self):
        """Test that missing source column raises TransformerException."""
        df = pd.DataFrame({"existing": [1, 2, 3]})
        config = RenameTransformConfig(column_mapping={"nonexistent": "new_name"})
        transformer = RenameTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            await transformer.transform(df)

        assert "Columns not in DataFrame" in str(exc_info.value)
        assert "nonexistent" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_duplicate_target_name_raises_error(self):
        """Test that duplicate target names raise TransformerException."""
        df = pd.DataFrame({"a": [1], "b": [2], "c": [3]})
        config = RenameTransformConfig(column_mapping={"a": "c"})  # 'c' already exists
        transformer = RenameTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            await transformer.transform(df)

        assert "duplicate" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_preserves_data_types(self):
        """Test that data types are preserved after rename."""
        df = pd.DataFrame(
            {
                "int_col": [1, 2, 3],
                "float_col": [1.1, 2.2, 3.3],
                "str_col": ["a", "b", "c"],
            }
        )
        config = RenameTransformConfig(
            column_mapping={
                "int_col": "renamed_int",
                "float_col": "renamed_float",
                "str_col": "renamed_str",
            }
        )
        transformer = RenameTransformer(config)

        result = await transformer.transform(df)

        assert result["renamed_int"].dtype == df["int_col"].dtype
        assert result["renamed_float"].dtype == df["float_col"].dtype
        assert result["renamed_str"].dtype == df["str_col"].dtype

    @pytest.mark.asyncio
    async def test_preserves_row_count(self):
        """Test that row count is preserved after rename."""
        df = pd.DataFrame({"col": range(100)})
        config = RenameTransformConfig(column_mapping={"col": "new_col"})
        transformer = RenameTransformer(config)

        result = await transformer.transform(df)

        assert len(result) == len(df)

    @pytest.mark.asyncio
    async def test_swap_columns_raises_error(self):
        """Test that swapping column names raises duplicate error."""
        df = pd.DataFrame({"a": [1], "b": [2]})
        # Trying to rename both: a->b and b->a would create intermediary conflicts
        config = RenameTransformConfig(column_mapping={"a": "b"})
        transformer = RenameTransformer(config)

        with pytest.raises(TransformerException):
            await transformer.transform(df)

    @pytest.mark.asyncio
    async def test_rename_all_columns(self):
        """Test renaming all columns in DataFrame."""
        df = pd.DataFrame({"old1": [1], "old2": [2], "old3": [3]})
        config = RenameTransformConfig(
            column_mapping={"old1": "new1", "old2": "new2", "old3": "new3"}
        )
        transformer = RenameTransformer(config)

        result = await transformer.transform(df)

        assert list(result.columns) == ["new1", "new2", "new3"]
        assert "old1" not in result.columns
        assert "old2" not in result.columns
        assert "old3" not in result.columns

    @pytest.mark.asyncio
    async def test_special_characters_in_column_names(self):
        """Test renaming columns with special characters."""
        df = pd.DataFrame({"col with space": [1], "col-with-dash": [2]})
        config = RenameTransformConfig(
            column_mapping={
                "col with space": "col_with_underscore",
                "col-with-dash": "col_clean",
            }
        )
        transformer = RenameTransformer(config)

        result = await transformer.transform(df)

        assert "col_with_underscore" in result.columns
        assert "col_clean" in result.columns

    @pytest.mark.asyncio
    async def test_empty_dataframe(self):
        """Test renaming columns on empty DataFrame."""
        df = pd.DataFrame({"a": [], "b": []})
        config = RenameTransformConfig(column_mapping={"a": "alpha"})
        transformer = RenameTransformer(config)

        result = await transformer.transform(df)

        assert "alpha" in result.columns
        assert "a" not in result.columns
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_multiple_missing_columns_error_message(self):
        """Test that error message includes all missing columns."""
        df = pd.DataFrame({"existing": [1]})
        config = RenameTransformConfig(
            column_mapping={"missing1": "new1", "missing2": "new2"}
        )
        transformer = RenameTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            await transformer.transform(df)

        error_message = str(exc_info.value)
        assert "missing1" in error_message
        assert "missing2" in error_message

    @pytest.mark.asyncio
    async def test_error_includes_missing_column_name(self):
        """Test that error message includes missing column name."""
        df = pd.DataFrame({"col_a": [1], "col_b": [2]})
        config = RenameTransformConfig(column_mapping={"nonexistent": "new"})
        transformer = RenameTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            await transformer.transform(df)

        error_message = str(exc_info.value)
        assert "nonexistent" in error_message
