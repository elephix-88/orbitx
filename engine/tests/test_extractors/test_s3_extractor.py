"""Tests for S3 extractor."""

from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from engine.exceptions import ExtractorException
from engine.node.extractors.s3 import S3Extractor


class MockS3Config:
    """Mock S3 configuration."""

    def __init__(self, file_path: str = "s3://bucket/file.csv"):
        self.file_path = file_path


class TestS3Extractor:
    """Tests for S3Extractor class."""

    @patch("engine.node.extractors.s3.boto3")
    def test_init_creates_s3_client(self, mock_boto3: MagicMock) -> None:
        """Test that initialization creates S3 client."""
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        config = MockS3Config()
        extractor = S3Extractor(config)

        mock_boto3.client.assert_called_once_with("s3")
        assert extractor.s3_client == mock_client
        assert extractor.config == config

    @patch("engine.node.extractors.s3.pd.read_csv")
    @patch("engine.node.extractors.s3.boto3")
    def test_extract_success(
        self, mock_boto3: MagicMock, mock_read_csv: MagicMock
    ) -> None:
        """Test successful data extraction from S3."""
        mock_boto3.client.return_value = MagicMock()

        expected_df = pd.DataFrame({"col1": [1, 2, 3], "col2": ["a", "b", "c"]})
        mock_read_csv.return_value = expected_df

        config = MockS3Config(file_path="s3://my-bucket/data.csv")
        extractor = S3Extractor(config)

        result = extractor.extract()

        mock_read_csv.assert_called_once_with("s3://my-bucket/data.csv")
        assert result.data.equals(expected_df)
        assert result.primary_keys == []
        assert result.report_level == "file"

    @patch("engine.node.extractors.s3.pd.read_csv")
    @patch("engine.node.extractors.s3.boto3")
    def test_extract_raises_extractor_exception_on_read_error(
        self, mock_boto3: MagicMock, mock_read_csv: MagicMock
    ) -> None:
        """Test that extract raises ExtractorException on read error."""
        mock_boto3.client.return_value = MagicMock()
        mock_read_csv.side_effect = Exception("File not found")

        config = MockS3Config(file_path="s3://bucket/missing.csv")
        extractor = S3Extractor(config)

        with pytest.raises(ExtractorException) as exc_info:
            extractor.extract()

        assert "Failed to extract data from S3" in str(exc_info.value)
        assert exc_info.value.source_type == "s3"
        assert exc_info.value.details["file_path"] == "s3://bucket/missing.csv"

    @patch("engine.node.extractors.s3.pd.read_csv")
    @patch("engine.node.extractors.s3.boto3")
    def test_extract_returns_extractor_result(
        self, mock_boto3: MagicMock, mock_read_csv: MagicMock
    ) -> None:
        """Test that extract returns an ExtractorResult object."""
        from common.model.result import ExtractorResult

        mock_boto3.client.return_value = MagicMock()
        mock_read_csv.return_value = pd.DataFrame({"a": [1]})

        config = MockS3Config()
        extractor = S3Extractor(config)

        result = extractor.extract()

        assert isinstance(result, ExtractorResult)

    @patch("engine.node.extractors.s3.pd.read_csv")
    @patch("engine.node.extractors.s3.boto3")
    def test_extract_handles_empty_dataframe(
        self, mock_boto3: MagicMock, mock_read_csv: MagicMock
    ) -> None:
        """Test that extract handles empty dataframe."""
        mock_boto3.client.return_value = MagicMock()
        mock_read_csv.return_value = pd.DataFrame()

        config = MockS3Config()
        extractor = S3Extractor(config)

        result = extractor.extract()

        assert result.data.empty
        assert result.primary_keys == []
