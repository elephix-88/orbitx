from typing import Any, Dict, List
from unittest.mock import MagicMock, patch

import pandas as pd
from common.model.workflow import (
    Connection,
    Node,
    WorkflowData,
    WorkflowStatus,
)
from pydantic import TypeAdapter

# Mock data for tests
MOCK_DF = pd.DataFrame({"col1": [1, 2], "col2": ["a", "b"]})


def create_workflow(
    nodes_data: List[Dict[str, Any]], connections_data: List[Dict[str, Any]]
) -> WorkflowData:
    """Create a WorkflowData object for testing."""
    nodes = []
    for n in nodes_data:
        nodes.append(TypeAdapter(Node).validate_python(n))

    connections = [Connection(**c) for c in connections_data]

    return WorkflowData.model_construct(
        id="test_workflow_id",
        user_id="test_user",
        job_name="Test Workflow",
        status=WorkflowStatus.ACTIVE,
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
        schedule_expression="0 0 * * *",
        nodes=nodes,
        connections=connections,
    )


def setup_mocks() -> tuple:
    """Setup common mocks for workflow tests."""
    mock_extractor = MagicMock()
    mock_extractor.extract.return_value.data = MOCK_DF
    mock_extractor.extract.return_value.primary_keys = ["col1"]
    mock_extractor.extract.return_value.report_level = "campaign"

    mock_transformer = MagicMock()
    mock_transformer.transform.return_value = MOCK_DF
    mock_transformer.config = MagicMock()
    mock_transformer.config.sql_query = "SELECT * FROM test"

    mock_loader_instance = MagicMock()
    mock_loader_instance.config = MagicMock()
    mock_loader_instance.config.destination_table = "test_table"
    mock_loader_instance.config.insert_mode = MagicMock()
    mock_loader_instance.config.insert_mode.value = "APPEND"

    return mock_extractor, mock_transformer, mock_loader_instance


class TestWorkflowExecution:

    @patch("apps.workflow.create_loader_node")
    @patch("apps.workflow.create_transform_node")
    @patch("apps.workflow.create_source_node")
    @patch("apps.workflow.ExecutionTracker")
    def test_s3_to_mysql_append(
        self,
        mock_tracker_cls: MagicMock,
        mock_source: MagicMock,
        mock_transform: MagicMock,
        mock_loader: MagicMock,
    ) -> None:
        """Test S3 Source -> MySQL Destination (Append)"""
        # Setup mocks
        mock_tracker_cls.return_value = MagicMock()

        mock_extractor, mock_transformer, mock_loader_instance = setup_mocks()
        mock_source.return_value = mock_extractor
        mock_transform.return_value = mock_transformer
        mock_loader.return_value = mock_loader_instance

        # Import after patches are applied
        from engine.workflow import run_workflow

        nodes_data = [
            {
                "node_instance_id": 1,
                "node_id": "s3",
                "node_type": "source",
                "parameters": {
                    "file_path": "s3://bucket/file.csv",
                    "file_format": "csv",
                },
            },
            {
                "node_instance_id": 2,
                "node_id": "mysql",
                "node_type": "destinations",
                "parameters": {
                    "host": "localhost",
                    "port": 3306,
                    "database": "db",
                    "username": "user",
                    "password": "pass",
                    "table": "table",
                    "insert_mode": "append",
                    "batch_size": 1000,
                    "num_partitions": 1,
                },
            },
        ]
        connections_data = [{"from_node": 1, "to_node": 2}]

        workflow = create_workflow(nodes_data, connections_data)

        # Run workflow
        run_workflow(workflow, "all")

        # Verify Source Creation was called
        mock_source.assert_called_once()
        call_args = mock_source.call_args[0][0]
        assert call_args.node_id == "s3"

        # Verify Loader Creation was called
        mock_loader.assert_called_once()
        call_args = mock_loader.call_args[0][0]
        assert call_args.node_id == "mysql"

    @patch("apps.workflow.create_loader_node")
    @patch("apps.workflow.create_transform_node")
    @patch("apps.workflow.create_source_node")
    @patch("apps.workflow.ExecutionTracker")
    def test_facebook_to_bigquery_upsert(
        self,
        mock_tracker_cls: MagicMock,
        mock_source: MagicMock,
        mock_transform: MagicMock,
        mock_loader: MagicMock,
    ) -> None:
        """Test Facebook Ads -> BigQuery (Upsert)"""
        mock_tracker_cls.return_value = MagicMock()

        mock_extractor, mock_transformer, mock_loader_instance = setup_mocks()
        mock_source.return_value = mock_extractor
        mock_transform.return_value = mock_transformer
        mock_loader.return_value = mock_loader_instance

        from engine.workflow import run_workflow

        nodes_data = [
            {
                "node_instance_id": 1,
                "node_id": "facebook_ads",
                "node_type": "source",
                "parameters": {
                    "connection_id": "conn_fb",
                    "ad_account_id": ["act_123"],
                    "fields": ["campaign_name"],
                    "time_config": {"time_preset": "last_3d"},
                },
            },
            {
                "node_instance_id": 2,
                "node_id": "bigquery",
                "node_type": "destinations",
                "parameters": {
                    "connection_id": "conn_bq",
                    "project_id": "proj",
                    "dataset": "ds",
                    "destination_table": "table",
                    "insert_mode": "upsert",
                    "location": "US",
                },
            },
        ]
        connections_data = [{"from_node": 1, "to_node": 2}]

        workflow = create_workflow(nodes_data, connections_data)
        run_workflow(workflow, "all")

        # Verify Source was called with facebook_ads node
        mock_source.assert_called_once()
        call_args = mock_source.call_args[0][0]
        assert call_args.node_id == "facebook_ads"

        # Verify Loader was called with bigquery node
        mock_loader.assert_called_once()
        call_args = mock_loader.call_args[0][0]
        assert call_args.node_id == "bigquery"

    @patch("apps.workflow.create_loader_node")
    @patch("apps.workflow.create_transform_node")
    @patch("apps.workflow.create_source_node")
    @patch("apps.workflow.ExecutionTracker")
    def test_google_ads_to_sheets(
        self,
        mock_tracker_cls: MagicMock,
        mock_source: MagicMock,
        mock_transform: MagicMock,
        mock_loader: MagicMock,
    ) -> None:
        """Test Google Ads -> Google Sheets"""
        mock_tracker_cls.return_value = MagicMock()

        mock_extractor, mock_transformer, mock_loader_instance = setup_mocks()
        mock_source.return_value = mock_extractor
        mock_transform.return_value = mock_transformer
        mock_loader.return_value = mock_loader_instance

        from engine.workflow import run_workflow

        nodes_data = [
            {
                "node_instance_id": 1,
                "node_id": "google_ads",
                "node_type": "source",
                "parameters": {
                    "connection_id": "conn_google",
                    "ad_account_id": ["123-456-7890"],
                    "fields": ["campaign.name"],
                    "time_config": {"time_preset": "yesterday"},
                },
            },
            {
                "node_instance_id": 2,
                "node_id": "google_sheet",
                "node_type": "destinations",
                "parameters": {
                    "connection_id": "conn_sheet",
                    "spreadsheet_id": "sheet_id",
                    "worksheet_name": "Sheet1",
                    "range": "A1:Z100",
                    "insert_mode": "truncate",
                },
            },
        ]
        connections_data = [{"from_node": 1, "to_node": 2}]

        workflow = create_workflow(nodes_data, connections_data)
        run_workflow(workflow, "all")

        # Verify Source was called with google_ads node
        mock_source.assert_called_once()
        call_args = mock_source.call_args[0][0]
        assert call_args.node_id == "google_ads"

        # Verify Loader was called with google_sheet node
        mock_loader.assert_called_once()
        call_args = mock_loader.call_args[0][0]
        assert call_args.node_id == "google_sheet"

    @patch("apps.workflow.create_loader_node")
    @patch("apps.workflow.create_transform_node")
    @patch("apps.workflow.create_source_node")
    @patch("apps.workflow.ExecutionTracker")
    def test_s3_to_sql_to_mysql(
        self,
        mock_tracker_cls: MagicMock,
        mock_source: MagicMock,
        mock_transform: MagicMock,
        mock_loader: MagicMock,
    ) -> None:
        """Test S3 -> SQL Transform -> MySQL"""
        mock_tracker_cls.return_value = MagicMock()

        mock_extractor, mock_transformer, mock_loader_instance = setup_mocks()
        mock_source.return_value = mock_extractor
        mock_transform.return_value = mock_transformer
        mock_loader.return_value = mock_loader_instance

        from engine.workflow import run_workflow

        nodes_data = [
            {
                "node_instance_id": 1,
                "node_id": "s3",
                "node_type": "source",
                "parameters": {
                    "file_path": "s3://bucket/data.csv",
                    "file_format": "csv",
                },
            },
            {
                "node_instance_id": 2,
                "node_id": "sql",
                "node_type": "transform",
                "parameters": {
                    "sql_query": "SELECT * FROM temp_table",
                    "table_name": "temp_table",
                },
            },
            {
                "node_instance_id": 3,
                "node_id": "mysql",
                "node_type": "destinations",
                "parameters": {
                    "host": "localhost",
                    "port": 3306,
                    "database": "db",
                    "username": "user",
                    "password": "pass",
                    "table": "table",
                    "insert_mode": "append",
                    "batch_size": 1000,
                    "num_partitions": 1,
                },
            },
        ]
        connections_data = [
            {"from_node": 1, "to_node": 2},
            {"from_node": 2, "to_node": 3},
        ]

        workflow = create_workflow(nodes_data, connections_data)
        run_workflow(workflow, "all")

        # Verify Source was called
        mock_source.assert_called_once()

        # Verify Transform was called with sql node
        mock_transform.assert_called_once()
        call_args = mock_transform.call_args[0][0]
        assert call_args.node_id == "sql"

        # Verify Loader was called
        mock_loader.assert_called_once()
