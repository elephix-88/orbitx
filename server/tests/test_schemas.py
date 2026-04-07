"""Tests for Pydantic schemas."""

import pytest
from pydantic import ValidationError

from common.model.connection import (
    ConnectionItem,
    ConnectionNamePayload,
    ConnectionStatus,
    ConnectionType,
    DeleteConnectionResponse,
    OAuthLoginResponse,
    ServiceName,
)

# from common.model.google import OAuthLoginResponse
from common.model.token import GoogleConnectionParams
from common.model.workflow import JobIdRequest, WorkflowData, WorkflowSummary


class TestWorkflowSchemas:
    """Test workflow-related schemas."""

    @pytest.mark.unit
    def test_workflow_data_valid(self, sample_workflow_data):
        """Test WorkflowData with valid data."""
        # Act
        workflow = WorkflowData(**sample_workflow_data)

        # Assert
        assert workflow.id == "test_job_123"
        assert workflow.job_name == "Test Workflow"
        assert workflow.status == "PAUSED"
        assert len(workflow.nodes) == 1

    @pytest.mark.unit
    def test_workflow_data_missing_required_fields(self):
        """Test WorkflowData with missing required fields."""
        # Arrange - missing job_name
        data = {
            "_id": "test_123",
            "status": "ACTIVE",
        }

        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            WorkflowData(**data)
        assert "job_name" in str(exc_info.value)

    @pytest.mark.unit
    def test_workflow_data_invalid_status(self, sample_workflow_data):
        """Test WorkflowData with invalid status."""
        # Arrange
        sample_workflow_data["status"] = "invalid_status"

        # Act & Assert
        with pytest.raises(ValidationError):
            WorkflowData(**sample_workflow_data)

    @pytest.mark.unit
    def test_workflow_summary_valid(self):
        """Test WorkflowSummary with valid data."""
        # Arrange
        data = {
            "_id": "workflow_123",
            "user_id": "test_user_id_123",
            "job_name": "Test Workflow",
            "status": "ACTIVE",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "schedule_expression": "0 0 * * *",
        }

        # Act
        summary = WorkflowSummary(**data)

        # Assert
        assert summary.id == "workflow_123"
        assert summary.job_name == "Test Workflow"

    @pytest.mark.unit
    def test_job_id_request_valid(self):
        """Test JobIdRequest with valid data."""
        # Act
        request = JobIdRequest(_id="test_job_123")

        # Assert
        assert request.id == "test_job_123"

    @pytest.mark.unit
    def test_job_id_request_empty_id(self):
        """Test JobIdRequest with empty id."""
        # Act & Assert
        with pytest.raises(ValidationError):
            JobIdRequest(id="")


class TestConnectionSchemas:
    """Test connection-related schemas."""

    @pytest.mark.unit
    def test_connection_item_valid(self, sample_connection_data):
        """Test ConnectionItem with valid data."""
        # Act
        connection = ConnectionItem(**sample_connection_data)

        # Assert
        assert connection.id == "conn_123"  # _id aliased to id
        assert connection.connection_name == "Test Google Ads Connection"
        assert connection.service_name == "GoogleAds"

    @pytest.mark.unit
    def test_connection_item_missing_id(self, sample_connection_data):
        """Test ConnectionItem with missing _id."""
        # Arrange
        del sample_connection_data["_id"]

        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            ConnectionItem(**sample_connection_data)

        assert "_id" in str(exc_info.value)

    @pytest.mark.unit
    def test_connection_name_payload_valid(self):
        """Test ConnectionNamePayload with valid data."""
        # Act
        payload = ConnectionNamePayload(connection_name="Test Connection")

        # Assert
        assert payload.connection_name == "Test Connection"

    @pytest.mark.unit
    def test_connection_name_payload_empty_name(self):
        """ConnectionNamePayload with empty name should fail."""
        # Act & Assert - Empty string should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            ConnectionNamePayload(connection_name="")
        assert "connection_name" in str(exc_info.value)

    @pytest.mark.unit
    def test_delete_connection_response_valid(self):
        """Test DeleteConnectionResponse with valid data."""
        # Act
        response = DeleteConnectionResponse(success=True)

        # Assert
        assert response.success is True

    @pytest.mark.unit
    def test_service_name_enum_values(self):
        """Test ServiceName enum values."""
        # Assert
        assert ServiceName.BIGQUERY.value == "BigQuery"
        assert ServiceName.GOOGLE_SHEET.value == "GoogleSheet"
        assert ServiceName.GOOGLE_ADS.value == "GoogleAds"

    @pytest.mark.unit
    def test_connection_type_enum_values(self):
        """Test ConnectionType enum values."""
        # Assert
        assert ConnectionType.SOURCE.value == "Source"
        assert ConnectionType.TRANSFORM.value == "Transform"
        assert ConnectionType.DESTINATION.value == "Destination"

    @pytest.mark.unit
    def test_connection_status_enum_values(self):
        """Test ConnectionStatus enum values."""
        # Assert
        assert ConnectionStatus.CONNECTED.value == "Connected"
        assert ConnectionStatus.DISCONNECTED.value == "Disconnected"


class TestGoogleSchemas:
    """Test Google-related schemas."""

    @pytest.mark.unit
    def test_oauth_login_response_valid(self):
        """Test OAuthLoginResponse with valid data."""
        # Arrange
        data = {
            "oauth_url": "https://accounts.google.com/oauth2/auth?...",
            "connection_id": "conn_123",
            "message": "Redirect user to this URL",
        }

        # Act
        response = OAuthLoginResponse(**data)

        # Assert
        assert response.oauth_url == data["oauth_url"]
        assert response.connection_id == "conn_123"
        assert response.message == data["message"]

    @pytest.mark.unit
    def test_oauth_login_response_invalid_url(self):
        """Test OAuthLoginResponse with invalid URL."""
        # Arrange
        data = {
            "oauth_url": "not_a_valid_url",
            "connection_id": "conn_123",
            "message": "Test message",
        }

        # Act - Should still work as oauth_url is just a string field
        response = OAuthLoginResponse(**data)

        # Assert
        assert response.oauth_url == "not_a_valid_url"

    @pytest.mark.unit
    def test_google_connection_params_valid(self):
        """Test GoogleConnectionParams with valid data."""
        # Arrange
        data = {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": "https://www.googleapis.com/auth/spreadsheets",
        }

        # Act
        params = GoogleConnectionParams(**data)

        # Assert
        assert params.access_token == "test_access_token"
        assert params.refresh_token == "test_refresh_token"
        assert params.token_type == "Bearer"
        assert params.expires_in == 3600
        assert params.scope == "https://www.googleapis.com/auth/spreadsheets"

    @pytest.mark.unit
    def test_google_connection_params_missing_required(self):
        """Test GoogleConnectionParams with missing required fields."""
        # Arrange
        data = {"access_token": "test_token"}

        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            GoogleConnectionParams(**data)

        # Should require token_type at minimum
        assert "refresh_token" in str(exc_info.value)

    @pytest.mark.unit
    def test_google_connection_params_optional_fields(self):
        """Test GoogleConnectionParams with all required fields."""
        # Arrange - All fields are actually required based on the schema
        data = {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": "https://www.googleapis.com/auth/spreadsheets",
        }

        # Act
        params = GoogleConnectionParams(**data)

        # Assert
        assert params.access_token == "test_access_token"
        assert params.refresh_token == "test_refresh_token"
        assert params.token_type == "Bearer"
        assert params.expires_in == 3600
        assert params.scope == "https://www.googleapis.com/auth/spreadsheets"


class TestSchemaIntegration:
    """Test schema integration and edge cases."""

    @pytest.mark.unit
    def test_workflow_with_complex_nodes(self):
        """Test WorkflowData with complex node structures."""
        # Arrange
        complex_workflow = {
            "_id": "complex_job",
            "user_id": "test_user_id_123",
            "job_name": "Complex Workflow",
            "status": "ACTIVE",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "schedule_expression": "0 */6 * * *",
            "nodes": [
                {
                    "node_instance_id": 1,
                    "node_id": "google_ads",
                    "node_type": "source",
                    "parameters": {
                        "connection_id": "conn_ads",
                        "fields": ["impressions", "clicks", "cost"],
                        "date_range": {"start": "2024-01-01", "end": "2024-01-31"},
                        "filters": [
                            {
                                "field": "campaign_status",
                                "operator": "=",
                                "value": "ENABLED",
                            }
                        ],
                    },
                },
                {
                    "node_instance_id": 2,
                    "node_id": "sql_transform",
                    "node_type": "transform",
                    "parameters": {
                        "sql_query": (
                            "SELECT *, clicks/impressions as ctr "
                            "FROM input_table WHERE cost > 0"
                        )
                    },
                },
                {
                    "node_instance_id": 3,
                    "node_id": "google_sheets",
                    "node_type": "destination",
                    "parameters": {
                        "connection_id": "conn_sheets",
                        "spreadsheet_id": "1234567890",
                        "worksheet_name": "Campaign Data",
                        "range": "A1:Z1000",
                    },
                },
            ],
            "connections": [
                {"from_node": 1, "to_node": 2},
                {"from_node": 2, "to_node": 3},
            ],
        }

        # Act
        workflow = WorkflowData(**complex_workflow)

        # Assert
        assert len(workflow.nodes) == 3
        assert workflow.nodes[0].node_type == "source"
        assert workflow.nodes[1].node_type == "transform"
        assert workflow.nodes[2].node_type == "destination"
        assert len(workflow.connections) == 2

    @pytest.mark.unit
    def test_schema_serialization_deserialization(self, sample_workflow_data):
        """Test schema serialization and deserialization."""
        # Arrange
        original_workflow = WorkflowData(**sample_workflow_data)

        # Act - Serialize to dict
        serialized = original_workflow.model_dump(by_alias=True)

        # Act - Deserialize back to object
        deserialized_workflow = WorkflowData(**serialized)

        # Assert
        assert original_workflow.id == deserialized_workflow.id
        assert original_workflow.job_name == deserialized_workflow.job_name
        assert len(original_workflow.nodes) == len(deserialized_workflow.nodes)
