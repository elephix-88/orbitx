"""Tests for BigQuery loader."""

from unittest.mock import MagicMock, patch

import pandas as pd
import pytest
from google.api_core import exceptions

from engine.exceptions import LoaderException, ValidationException
from engine.node.loaders.bigquery.loader import BigQueryLoader
from engine.node.loaders.bigquery.operations import (
    _create_temp_table,
    _execute_load_job,
    append_data,
    table_exists,
    truncate_data,
    upsert_data,
)


class MockBigQueryConfig:
    """Mock BigQuery configuration."""

    def __init__(
        self,
        project_id: str = "test-project",
        dataset: str = "test_dataset",
        destination_table: str = "test_table",
        connection_id: str = "conn_123",
        insert_mode: MagicMock = None,
    ):
        self.project_id = project_id
        self.dataset = dataset
        self.destination_table = destination_table
        self.connection_id = connection_id
        if insert_mode is None:
            self.insert_mode = MagicMock()
            self.insert_mode.value = "append"
        else:
            self.insert_mode = insert_mode


class TestBigQueryOperations:
    """Tests for BigQuery operations functions."""

    def test_table_exists_returns_true_when_table_found(self) -> None:
        """Test that table_exists returns True when table is found."""
        mock_client = MagicMock()
        mock_client.get_table.return_value = MagicMock()

        result = table_exists(mock_client, "project.dataset.table")

        assert result is True
        mock_client.get_table.assert_called_once_with("project.dataset.table")

    def test_table_exists_returns_false_when_not_found(self) -> None:
        """Test that table_exists returns False when table is not found."""
        mock_client = MagicMock()
        mock_client.get_table.side_effect = exceptions.NotFound("Table not found")

        result = table_exists(mock_client, "project.dataset.table")

        assert result is False

    def test_execute_load_job(self) -> None:
        """Test _execute_load_job runs the job."""
        from google.cloud import bigquery

        mock_client = MagicMock()
        mock_job = MagicMock()
        mock_client.load_table_from_dataframe.return_value = mock_job

        df = pd.DataFrame({"col1": ["a", "b"]})
        schema = [bigquery.SchemaField("col1", "STRING")]

        _execute_load_job(
            mock_client,
            df,
            "project.dataset.table",
            bigquery.WriteDisposition.WRITE_APPEND,
            schema,
        )

        mock_client.load_table_from_dataframe.assert_called_once()
        mock_job.result.assert_called_once()

    @patch("engine.node.loaders.bigquery.operations._execute_load_job")
    def test_append_data_uses_write_append(self, mock_execute: MagicMock) -> None:
        """Test append_data uses WRITE_APPEND disposition."""
        from google.cloud import bigquery

        mock_client = MagicMock()
        df = pd.DataFrame({"col1": [1, 2]})

        append_data(mock_client, "project.dataset.table", df)

        mock_execute.assert_called_once()
        call_args = mock_execute.call_args
        write_disposition = call_args[0][3]
        assert write_disposition == bigquery.WriteDisposition.WRITE_APPEND

    @patch("engine.node.loaders.bigquery.operations._execute_load_job")
    def test_truncate_data_uses_write_truncate(self, mock_execute: MagicMock) -> None:
        """Test truncate_data uses WRITE_TRUNCATE disposition."""
        from google.cloud import bigquery

        mock_client = MagicMock()
        df = pd.DataFrame({"col1": [1, 2]})

        truncate_data(mock_client, "project.dataset.table", df)

        mock_execute.assert_called_once()
        call_args = mock_execute.call_args
        write_disposition = call_args[0][3]
        assert write_disposition == bigquery.WriteDisposition.WRITE_TRUNCATE

    def test_create_temp_table(self) -> None:
        """Test _create_temp_table creates a temporary table with schema."""
        from google.cloud import bigquery

        mock_client = MagicMock()

        schema = [bigquery.SchemaField("col1", "INTEGER")]

        result = _create_temp_table(mock_client, "project.dataset.table", schema)

        assert "project.dataset.table_temp_" in result
        mock_client.create_table.assert_called_once()

    @patch("engine.node.loaders.bigquery.operations._create_temp_table")
    @patch("engine.node.loaders.bigquery.operations.build_merge_statement")
    def test_upsert_data(
        self, mock_build_merge: MagicMock, mock_create_temp: MagicMock
    ) -> None:
        """Test upsert_data creates temp table and executes merge."""
        mock_client = MagicMock()
        mock_job = MagicMock()
        mock_query_job = MagicMock()
        mock_client.load_table_from_dataframe.return_value = mock_job
        mock_client.query.return_value = mock_query_job
        mock_create_temp.return_value = "project.dataset.table_temp_abc"
        mock_build_merge.return_value = "MERGE SQL"

        df = pd.DataFrame({"col1": [1, 2], "col2": ["a", "b"]})
        merge_keys = ["col1"]

        upsert_data(mock_client, "project.dataset.table", df, merge_keys)

        mock_create_temp.assert_called_once()
        mock_build_merge.assert_called_once_with(
            target_table="project.dataset.table",
            source_table="project.dataset.table_temp_abc",
            merge_keys=["col1"],
            columns=["col1", "col2"],
        )
        mock_client.query.assert_called_once_with("MERGE SQL")
        mock_client.delete_table.assert_called_once()


class TestBigQueryLoader:
    """Tests for BigQueryLoader class."""

    @patch("engine.node.loaders.bigquery.loader.build_connection_credentials")
    @patch("engine.node.loaders.bigquery.loader.bigquery.Client")
    def test_init_creates_client(
        self, mock_client_cls: MagicMock, mock_build_creds: MagicMock
    ) -> None:
        """Test that initialization creates BigQuery client."""
        mock_creds = MagicMock()
        mock_build_creds.return_value = mock_creds
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        config = MockBigQueryConfig()
        loader = BigQueryLoader(config)

        mock_build_creds.assert_called_once_with(config.connection_id)
        mock_client_cls.assert_called_once_with(
            credentials=mock_creds, project=config.project_id
        )
        assert loader.client == mock_client

    @patch("engine.node.loaders.bigquery.loader.build_connection_credentials")
    @patch("engine.node.loaders.bigquery.loader.bigquery.Client")
    def test_destination_table_property(
        self, mock_client_cls: MagicMock, mock_build_creds: MagicMock
    ) -> None:
        """Test destination_table property returns correct format."""
        mock_build_creds.return_value = MagicMock()
        mock_client_cls.return_value = MagicMock()

        config = MockBigQueryConfig(
            project_id="my-project",
            dataset="my_dataset",
            destination_table="my_table",
        )
        loader = BigQueryLoader(config)

        assert loader.destination_table == "my-project.my_dataset.my_table"

    @patch("engine.node.loaders.bigquery.loader.append_data")
    @patch("engine.node.loaders.bigquery.loader.table_exists")
    @patch("engine.node.loaders.bigquery.loader.build_connection_credentials")
    @patch("engine.node.loaders.bigquery.loader.bigquery.Client")
    def test_load_creates_table_if_not_exists(
        self,
        mock_client_cls: MagicMock,
        mock_build_creds: MagicMock,
        mock_table_exists: MagicMock,
        mock_append: MagicMock,
    ) -> None:
        """Test load creates table if it doesn't exist."""
        mock_build_creds.return_value = MagicMock()
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_table_exists.return_value = False

        config = MockBigQueryConfig()
        loader = BigQueryLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})
        loader.load(df)

        mock_append.assert_called_once()

    @patch("engine.node.loaders.bigquery.loader.append_data")
    @patch("engine.node.loaders.bigquery.loader.table_exists")
    @patch("engine.node.loaders.bigquery.loader.build_connection_credentials")
    @patch("engine.node.loaders.bigquery.loader.bigquery.Client")
    def test_load_append_mode(
        self,
        mock_client_cls: MagicMock,
        mock_build_creds: MagicMock,
        mock_table_exists: MagicMock,
        mock_append: MagicMock,
    ) -> None:
        """Test load with APPEND mode."""
        from common.model.common import InsertMode

        mock_build_creds.return_value = MagicMock()
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_table_exists.return_value = True

        config = MockBigQueryConfig()
        config.insert_mode = InsertMode.APPEND
        loader = BigQueryLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})
        loader.load(df)

        mock_append.assert_called_once()

    @patch("engine.node.loaders.bigquery.loader.truncate_data")
    @patch("engine.node.loaders.bigquery.loader.table_exists")
    @patch("engine.node.loaders.bigquery.loader.build_connection_credentials")
    @patch("engine.node.loaders.bigquery.loader.bigquery.Client")
    def test_load_truncate_mode(
        self,
        mock_client_cls: MagicMock,
        mock_build_creds: MagicMock,
        mock_table_exists: MagicMock,
        mock_truncate: MagicMock,
    ) -> None:
        """Test load with TRUNCATE mode."""
        from common.model.common import InsertMode

        mock_build_creds.return_value = MagicMock()
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_table_exists.return_value = True

        config = MockBigQueryConfig()
        config.insert_mode = InsertMode.TRUNCATE
        loader = BigQueryLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})
        loader.load(df)

        mock_truncate.assert_called_once()

    @patch("engine.node.loaders.bigquery.loader.upsert_data")
    @patch("engine.node.loaders.bigquery.loader.table_exists")
    @patch("engine.node.loaders.bigquery.loader.build_connection_credentials")
    @patch("engine.node.loaders.bigquery.loader.bigquery.Client")
    def test_load_upsert_mode(
        self,
        mock_client_cls: MagicMock,
        mock_build_creds: MagicMock,
        mock_table_exists: MagicMock,
        mock_upsert: MagicMock,
    ) -> None:
        """Test load with UPSERT mode."""
        from common.model.common import InsertMode

        mock_build_creds.return_value = MagicMock()
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_table_exists.return_value = True

        config = MockBigQueryConfig()
        config.insert_mode = InsertMode.UPSERT
        loader = BigQueryLoader(config)
        loader.merge_keys = ["col1"]

        df = pd.DataFrame({"col1": [1, 2]})
        loader.load(df)

        mock_upsert.assert_called_once()

    @patch("engine.node.loaders.bigquery.loader.table_exists")
    @patch("engine.node.loaders.bigquery.loader.build_connection_credentials")
    @patch("engine.node.loaders.bigquery.loader.bigquery.Client")
    def test_load_upsert_without_merge_keys_raises_error(
        self,
        mock_client_cls: MagicMock,
        mock_build_creds: MagicMock,
        mock_table_exists: MagicMock,
    ) -> None:
        """Test load with UPSERT mode raises error without merge_keys."""
        from common.model.common import InsertMode

        mock_build_creds.return_value = MagicMock()
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_table_exists.return_value = True

        config = MockBigQueryConfig()
        config.insert_mode = InsertMode.UPSERT
        loader = BigQueryLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})

        with pytest.raises(ValidationException):
            loader.load(df)

    @patch("engine.node.loaders.bigquery.loader.table_exists")
    @patch("engine.node.loaders.bigquery.loader.build_connection_credentials")
    @patch("engine.node.loaders.bigquery.loader.bigquery.Client")
    def test_load_raises_loader_exception_on_error(
        self,
        mock_client_cls: MagicMock,
        mock_build_creds: MagicMock,
        mock_table_exists: MagicMock,
    ) -> None:
        """Test load raises LoaderException on failure."""
        mock_build_creds.return_value = MagicMock()
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_table_exists.side_effect = Exception("Connection error")

        config = MockBigQueryConfig()
        loader = BigQueryLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})

        with pytest.raises(LoaderException) as exc_info:
            loader.load(df)

        assert "Failed to load data to BigQuery" in str(exc_info.value)
        assert exc_info.value.destination_type == "bigquery"
