"""Tests for node output utilities."""

import pandas as pd

from common.model.execution import NodeOutputType
from engine.utils.node_output import (
    build_error_output,
    build_extractor_output,
    build_loader_output,
    build_transformer_output,
    create_data_summary,
)


class TestDataSummary:
    """Tests for create_data_summary."""

    def test_none_dataframe(self):
        """Test with None DataFrame."""
        result = create_data_summary(None)
        assert result is None

    def test_empty_dataframe(self):
        """Test with empty DataFrame."""
        df = pd.DataFrame()
        result = create_data_summary(df)
        assert result is not None
        assert result.row_count == 0
        assert result.column_count == 0
        assert result.columns == []

    def test_basic_dataframe(self):
        """Test with basic DataFrame."""
        df = pd.DataFrame(
            {
                "id": [1, 2, 3],
                "name": ["a", "b", "c"],
                "value": [1.1, 2.2, 3.3],
            }
        )
        result = create_data_summary(df)
        assert result.row_count == 3
        assert result.column_count == 3
        assert set(result.columns) == {"id", "name", "value"}
        assert result.sample_data is not None
        assert len(result.sample_data) == 3

    def test_sample_limit(self):
        """Test sample row limit."""
        df = pd.DataFrame({"x": range(100)})
        result = create_data_summary(df, sample_rows=5)
        assert result.row_count == 100
        assert len(result.sample_data) == 5

    def test_no_sample(self):
        """Test without sample data."""
        df = pd.DataFrame({"x": [1, 2, 3]})
        result = create_data_summary(df, include_sample=False)
        assert result.row_count == 3
        assert result.sample_data is None


class TestExtractorOutput:
    """Tests for build_extractor_output."""

    def test_successful_extraction(self):
        """Test successful extraction output."""
        df = pd.DataFrame({"id": [1, 2], "clicks": [100, 200]})
        result = build_extractor_output(
            source_type="facebook_ads",
            df=df,
            duration_seconds=5.5,
            primary_keys=["id"],
            report_level="ad",
        )
        assert result.output_type == NodeOutputType.EXTRACTOR
        assert "2" in result.title  # row count
        assert "facebook_ads" in result.summary  # source type in summary
        assert result.duration_seconds == 5.5
        assert result.extractor_output.source_type == "facebook_ads"
        assert result.extractor_output.records_extracted == 2
        assert result.extractor_output.columns_extracted == 2
        assert result.extractor_output.primary_keys == ["id"]
        assert result.extractor_output.report_level == "ad"
        assert result.error_type is None

    def test_failed_extraction(self):
        """Test failed extraction output."""
        error = ValueError("Connection failed")
        result = build_extractor_output(
            source_type="google_ads",
            df=None,
            duration_seconds=0.5,
            error=error,
        )
        assert "Failed" in result.title
        assert result.error_type == "ValueError"
        assert "Connection failed" in result.error_message


class TestTransformerOutput:
    """Tests for build_transformer_output."""

    def test_successful_transform(self):
        """Test successful transformation output."""
        input_df = pd.DataFrame({"x": [1, 2, 3, 4, 5]})
        output_df = pd.DataFrame({"x": [2, 4], "doubled": [4, 8]})
        result = build_transformer_output(
            transform_type="sql",
            input_df=input_df,
            output_df=output_df,
            duration_seconds=1.2,
            query="SELECT * FROM temp_table WHERE x % 2 = 0",
        )
        assert result.output_type == NodeOutputType.TRANSFORMER
        assert "5" in result.title and "2" in result.title  # row counts
        assert result.transformer_output.records_input == 5
        assert result.transformer_output.records_output == 2
        assert result.transformer_output.records_filtered == 3  # 5 - 2 = 3 filtered
        assert result.transformer_output.query is not None

    def test_no_row_change(self):
        """Test transformation with no row change."""
        df = pd.DataFrame({"x": [1, 2, 3]})
        result = build_transformer_output(
            transform_type="sql",
            input_df=df,
            output_df=df,
            duration_seconds=0.1,
        )
        assert "no change" in result.summary.lower()
        assert result.transformer_output.records_filtered == 0
        assert result.transformer_output.records_added == 0


class TestLoaderOutput:
    """Tests for build_loader_output."""

    def test_successful_load(self):
        """Test successful load output."""
        df = pd.DataFrame({"id": [1, 2, 3], "value": [10, 20, 30]})
        result = build_loader_output(
            destination_type="bigquery",
            destination_table="project.dataset.table",
            df=df,
            duration_seconds=3.0,
            operation="INSERT",
        )
        assert result.output_type == NodeOutputType.LOADER
        assert "3" in result.title  # row count
        assert result.loader_output.destination_type == "bigquery"
        assert result.loader_output.records_total == 3
        assert result.loader_output.records_inserted == 3
        assert result.loader_output.operation == "INSERT"

    def test_upsert_with_merge_keys(self):
        """Test upsert load with merge keys."""
        df = pd.DataFrame({"id": [1, 2]})
        result = build_loader_output(
            destination_type="mysql",
            destination_table="users",
            df=df,
            duration_seconds=2.0,
            operation="UPSERT",
            merge_keys=["id"],
        )
        assert result.loader_output.merge_keys == ["id"]
        assert result.loader_output.operation == "UPSERT"
        assert result.loader_output.records_total == 2


class TestErrorOutput:
    """Tests for build_error_output."""

    def test_extractor_error(self):
        """Test error output for extractor."""
        error = RuntimeError("API rate limit exceeded")
        result = build_error_output(
            output_type=NodeOutputType.EXTRACTOR,
            node_type_name="facebook_ads",
            error=error,
            duration_seconds=1.0,
        )
        assert result.output_type == NodeOutputType.EXTRACTOR
        assert "failed" in result.title.lower()
        assert result.error_type == "RuntimeError"
        assert "rate limit" in result.error_message

    def test_error_with_orbitx_exception(self):
        """Test error output preserves OrbitX exception details."""
        from engine.exceptions import ExtractorException

        error = ExtractorException(
            "Connection timeout",
            source_type="google_ads",
            node_id="google_ads_1",
            node_instance_id=123,
            details={"connection_id": "conn_abc"},
        )
        result = build_error_output(
            output_type=NodeOutputType.EXTRACTOR,
            node_type_name="google_ads",
            error=error,
            duration_seconds=30.0,
        )
        assert result.error_type == "ExtractorException"
        assert result.error_details is not None
        assert result.error_details.get("node_id") == "google_ads_1"
