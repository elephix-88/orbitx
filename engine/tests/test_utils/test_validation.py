"""Tests for DataFrame validation utilities."""

import pandas as pd
import pytest

from engine.exceptions import ValidationException
from engine.utils.validation import validate_dataframe, validate_dataframe_for_load


class TestValidateDataframe:
    """Tests for validate_dataframe function."""

    def test_valid_dataframe(self) -> None:
        """Test that a valid DataFrame passes validation."""
        df = pd.DataFrame({"col1": [1, 2, 3], "col2": ["a", "b", "c"]})
        result = validate_dataframe(df)
        assert result is df

    def test_none_raises_exception(self) -> None:
        """Test that None raises ValidationException."""
        with pytest.raises(ValidationException) as exc_info:
            validate_dataframe(None)

        assert "DataFrame is None" in str(exc_info.value)
        assert exc_info.value.details.get("validation_type") == "dataframe_null"

    def test_non_dataframe_raises_exception(self) -> None:
        """Test that non-DataFrame input raises ValidationException."""
        with pytest.raises(ValidationException) as exc_info:
            validate_dataframe([1, 2, 3])  # type: ignore

        assert "Expected pandas DataFrame" in str(exc_info.value)
        assert exc_info.value.details.get("validation_type") == "dataframe_type"

    def test_empty_dataframe_raises_exception(self) -> None:
        """Test that empty DataFrame raises ValidationException by default."""
        df = pd.DataFrame()

        with pytest.raises(ValidationException) as exc_info:
            validate_dataframe(df)

        assert "DataFrame is empty" in str(exc_info.value)
        assert exc_info.value.details.get("validation_type") == "dataframe_empty"

    def test_empty_dataframe_allowed_when_specified(self) -> None:
        """Test that empty DataFrame passes when allow_empty=True."""
        df = pd.DataFrame()
        result = validate_dataframe(df, allow_empty=True)
        assert result is df

    def test_min_rows_validation(self) -> None:
        """Test minimum rows validation."""
        df = pd.DataFrame({"col1": [1, 2]})

        # Should pass with 2 rows when min_rows=2
        result = validate_dataframe(df, min_rows=2)
        assert result is df

        # Should fail with 2 rows when min_rows=3
        with pytest.raises(ValidationException) as exc_info:
            validate_dataframe(df, min_rows=3)

        assert "minimum 3 required" in str(exc_info.value)
        assert exc_info.value.details.get("validation_type") == "dataframe_min_rows"
        assert exc_info.value.expected == 3
        assert exc_info.value.actual == 2

    def test_required_columns_validation(self) -> None:
        """Test required columns validation."""
        df = pd.DataFrame({"col1": [1], "col2": [2]})

        # Should pass when all required columns present
        result = validate_dataframe(df, required_columns=["col1"])
        assert result is df

        # Should fail when required column is missing
        with pytest.raises(ValidationException) as exc_info:
            validate_dataframe(df, required_columns=["col1", "col3"])

        assert "missing required columns" in str(exc_info.value)
        assert exc_info.value.details.get("validation_type") == "dataframe_columns"
        assert "col3" in exc_info.value.details.get("missing_columns", [])

    def test_node_context_in_exception(self) -> None:
        """Test that node context is included in exceptions."""
        with pytest.raises(ValidationException) as exc_info:
            validate_dataframe(None, node_id="test_node", node_instance_id=123)

        assert exc_info.value.node_id == "test_node"
        assert exc_info.value.node_instance_id == 123

    def test_multiple_validations(self) -> None:
        """Test combining multiple validation criteria."""
        df = pd.DataFrame({"col1": [1, 2, 3], "col2": ["a", "b", "c"]})

        result = validate_dataframe(
            df,
            min_rows=2,
            required_columns=["col1", "col2"],
        )
        assert result is df


class TestValidateDataframeForLoad:
    """Tests for validate_dataframe_for_load function."""

    def test_valid_dataframe(self) -> None:
        """Test that a valid DataFrame passes validation."""
        df = pd.DataFrame({"col1": [1, 2]})

        result = validate_dataframe_for_load(
            df,
            destination_type="bigquery",
            destination_table="test_table",
        )
        assert result is df

    def test_none_raises_with_destination_context(self) -> None:
        """Test that None raises exception with destination context."""
        with pytest.raises(ValidationException) as exc_info:
            validate_dataframe_for_load(
                None,
                destination_type="mysql",
                destination_table="users",
                node_id="mysql_loader",
            )

        assert exc_info.value.details.get("destination_type") == "mysql"
        assert exc_info.value.details.get("destination_table") == "users"

    def test_empty_dataframe_allowed_by_default(self) -> None:
        """Test that empty DataFrame is allowed by default for loaders."""
        df = pd.DataFrame()

        result = validate_dataframe_for_load(
            df,
            destination_type="bigquery",
            destination_table="analytics",
        )
        assert result is df

    def test_empty_raises_when_explicitly_disallowed(self) -> None:
        """Test that empty DataFrame raises exception when allow_empty=False."""
        df = pd.DataFrame()

        with pytest.raises(ValidationException) as exc_info:
            validate_dataframe_for_load(
                df,
                destination_type="bigquery",
                destination_table="analytics",
                allow_empty=False,
            )

        assert exc_info.value.details.get("destination_type") == "bigquery"
        assert exc_info.value.details.get("destination_table") == "analytics"


class TestLoaderSetMergeKeys:
    """Tests for Loader.set_merge_keys method."""

    def test_set_merge_keys(self) -> None:
        """Test that set_merge_keys sets the merge_keys attribute."""
        from unittest.mock import MagicMock

        from engine.interfaces.node import Loader

        # Create a concrete implementation for testing
        class TestLoader(Loader):
            def __init__(self, config: MagicMock) -> None:
                self.config = config

            def load(self, data: MagicMock) -> None:
                pass

        loader = TestLoader(MagicMock())

        # Initially None
        assert loader.merge_keys is None

        # Set merge keys
        loader.set_merge_keys(["id", "date"])
        assert loader.merge_keys == ["id", "date"]

        # Set to None
        loader.set_merge_keys(None)
        assert loader.merge_keys is None

    def test_merge_keys_default_is_none(self) -> None:
        """Test that merge_keys defaults to None."""
        from unittest.mock import MagicMock

        from engine.interfaces.node import Loader

        class TestLoader(Loader):
            def __init__(self, config: MagicMock) -> None:
                self.config = config

            def load(self, data: MagicMock) -> None:
                pass

        loader = TestLoader(MagicMock())
        assert loader.merge_keys is None
