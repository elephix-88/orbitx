"""Tests for BigQuery service."""
from unittest.mock import MagicMock, patch

import pytest
from google.auth.exceptions import RefreshError
from common.model.connection import ConnectionItem
from common.model.google.bigquery import BigQueryDataset, BigQueryProject
from common.model.user import UserInDB

from server.services.google.bigquery import (
    get_bigquery_datasets,
    get_bigquery_projects,
    validate_bigquery_connection,
)

# Mock user for tests
_MOCK_USER = UserInDB(
    id="test_user_id_123",
    email="test@example.com",
    name="Test User",
    picture="https://example.com/avatar.png",
    role="user",
    is_active=True,
)


class TestBigQueryService:
    """Test BigQuery service functions."""

    @pytest.fixture
    def mock_mongodb(self):
        with patch("server.services.google.bigquery.mongodb_client") as mock:
            yield mock

    @pytest.fixture
    def mock_user_context(self):
        """Mock the user context for service functions."""
        with patch("server.services.google.bigquery.get_current_user") as mock:
            mock.return_value = _MOCK_USER
            yield mock

    @pytest.fixture
    def mock_settings(self):
        with patch("server.services.google.bigquery.settings") as mock:
            mock.connection_collection = "connections"
            mock.google_oauth_token_url = "https://oauth2.googleapis.com/token"
            mock.google_oauth_client_id = "test_client_id"
            mock.google_oauth_client_secret = "test_client_secret"
            mock.google_oauth_bigquery_scope = (
                "https://www.googleapis.com/auth/bigquery"
            )
            yield mock

    @pytest.fixture
    def mock_build(self):
        with patch("server.services.google.bigquery.build") as mock:
            yield mock

    @pytest.fixture
    def mock_bigquery_client(self):
        with patch("server.services.google.bigquery.bigquery.Client") as mock:
            yield mock

    @pytest.fixture
    def sample_connection_item(self):
        return ConnectionItem(
            _id="conn_123",
            user_id="test_user_id_123",
            connection_name="Test BigQuery Connection",
            service_name="BigQuery",
            connection_type="Source",
            created_at="2024-01-01T00:00:00Z",
            status="Connected",
            params={
                "access_token": "test_access_token",
                "refresh_token": "test_refresh_token",
                "token_type": "Bearer",
                "expires_in": 3600,
                "scope": "https://www.googleapis.com/auth/bigquery",
            },
        )

    @pytest.mark.unit
    def test_get_bigquery_projects_success(
        self,
        mock_mongodb,
        mock_settings,
        mock_build,
        mock_user_context,
        sample_connection_item,
    ):
        """Test successful retrieval of BigQuery projects."""
        # Arrange
        mock_mongodb.get_document.return_value = sample_connection_item

        mock_service = MagicMock()
        mock_build.return_value = mock_service

        mock_projects_response = {
            "projects": [
                {
                    "id": "project-1",
                    "friendlyName": "Project 1",
                    "numericId": "12345",
                },
                {
                    "id": "project-2",
                    "friendlyName": "Project 2",
                    "numericId": "67890",
                },
            ]
        }
        mock_service.projects().list().execute.return_value = mock_projects_response

        # Act
        projects = get_bigquery_projects("conn_123")

        # Assert
        assert len(projects) == 2
        assert isinstance(projects[0], BigQueryProject)
        assert projects[0].project_id == "project-1"
        assert projects[0].project_name == "Project 1"
        assert projects[1].project_id == "project-2"

    @pytest.mark.unit
    def test_get_bigquery_projects_error(
        self,
        mock_mongodb,
        mock_settings,
        mock_build,
        mock_user_context,
        sample_connection_item,
    ):
        """Test BigQuery projects retrieval with error."""
        # Arrange
        mock_mongodb.get_document.return_value = sample_connection_item
        mock_build.side_effect = Exception("API Error")

        # Act & Assert
        with pytest.raises(Exception, match="API Error"):
            get_bigquery_projects("conn_123")

    @pytest.mark.unit
    def test_get_bigquery_datasets_success(
        self,
        mock_mongodb,
        mock_settings,
        mock_bigquery_client,
        mock_user_context,
        sample_connection_item,
    ):
        """Test successful retrieval of BigQuery datasets."""
        # Arrange
        mock_mongodb.get_document.return_value = sample_connection_item

        mock_client_instance = MagicMock()
        mock_bigquery_client.return_value = mock_client_instance

        mock_dataset1 = MagicMock()
        mock_dataset1.dataset_id = "dataset_1"

        mock_dataset2 = MagicMock()
        mock_dataset2.dataset_id = "dataset_2"

        mock_client_instance.list_datasets.return_value = [mock_dataset1, mock_dataset2]

        # Mock get_dataset return values
        mock_dataset_ref1 = MagicMock()
        mock_dataset_ref1.dataset_id = "dataset_1"
        mock_dataset_ref1.friendly_name = "Dataset 1"
        mock_dataset_ref1.description = "Description 1"
        mock_dataset_ref1.location = "US"
        mock_dataset_ref1.created.isoformat.return_value = "2024-01-01T00:00:00"
        mock_dataset_ref1.modified.isoformat.return_value = "2024-01-02T00:00:00"

        mock_dataset_ref2 = MagicMock()
        mock_dataset_ref2.dataset_id = "dataset_2"
        mock_dataset_ref2.friendly_name = "Dataset 2"
        mock_dataset_ref2.description = None
        mock_dataset_ref2.location = "EU"
        mock_dataset_ref2.created = None
        mock_dataset_ref2.modified = None

        mock_client_instance.get_dataset.side_effect = [
            mock_dataset_ref1,
            mock_dataset_ref2,
        ]

        # Act
        datasets = get_bigquery_datasets("conn_123", "project-1")

        # Assert
        assert len(datasets) == 2
        assert isinstance(datasets[0], BigQueryDataset)
        assert datasets[0].dataset_id == "dataset_1"
        assert datasets[0].friendly_name == "Dataset 1"
        assert datasets[0].creation_time == "2024-01-01T00:00:00"

        assert datasets[1].dataset_id == "dataset_2"
        assert datasets[1].creation_time is None

    @pytest.mark.unit
    def test_get_bigquery_datasets_error(
        self,
        mock_mongodb,
        mock_settings,
        mock_bigquery_client,
        mock_user_context,
        sample_connection_item,
    ):
        """Test BigQuery datasets retrieval with error."""
        # Arrange
        mock_mongodb.get_document.return_value = sample_connection_item
        mock_bigquery_client.side_effect = Exception("Client Error")

        # Act & Assert
        with pytest.raises(Exception, match="Client Error"):
            get_bigquery_datasets("conn_123", "project-1")

    @pytest.mark.unit
    def test_validate_bigquery_connection_success(
        self,
        mock_mongodb,
        mock_settings,
        mock_build,
        mock_user_context,
        sample_connection_item,
    ):
        """Test successful BigQuery connection validation."""
        # Arrange
        mock_mongodb.get_document.return_value = sample_connection_item
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_service.projects().list().execute.return_value = {"projects": []}

        # Act
        result = validate_bigquery_connection("conn_123")

        # Assert
        assert result is True

    @pytest.mark.unit
    def test_validate_bigquery_connection_failure(
        self,
        mock_mongodb,
        mock_settings,
        mock_build,
        mock_user_context,
        sample_connection_item,
    ):
        """Test BigQuery connection validation failure."""
        # Arrange
        mock_mongodb.get_document.return_value = sample_connection_item
        mock_build.side_effect = RefreshError("Auth Error")

        # Act
        result = validate_bigquery_connection("conn_123")

        # Assert
        assert result is False
