"""Test configuration and fixtures."""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Generator
from unittest.mock import MagicMock, Mock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

if TYPE_CHECKING:
    from collections.abc import Iterator

# =============================================================================
# Module-Level Mocks (must be set before any application imports)
# =============================================================================

# Mock the entire database.mongodb module before any imports
mock_mongodb_module = MagicMock()
mock_mongodb_client = Mock()

# Mock return values with proper data structures
mock_user_data: dict[str, Any] = {
    "_id": "test_user_id_123",
    "email": "test@example.com",
    "name": "Test User",
    "picture": "https://example.com/avatar.png",
    "role": "user",
    "is_active": True,
    "google_id": "google_123",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
}

mock_connection_data: dict[str, Any] = {
    "_id": "mock_connection_id_123",
    "connection_name": "Test Connection",
    "service_name": "GoogleSheets",
    "connection_type": "Destination",
    "status": "Connected",
    "params": {"access_token": "test_token"},
    "user_id": "test_user_id_123",
    "created_at": "2024-01-01T00:00:00Z",
}

mock_workflow_data: dict[str, Any] = {
    "_id": "mock_workflow_id_123",
    "job_name": "Test Workflow",
    "status": "PAUSED",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "schedule_expression": "0 0 * * *",
    "user_id": "test_user_id_123",
    "nodes": [
        {
            "node_instance_id": 1,
            "node_id": "google_ads",
            "node_type": "source",
            "parameters": {
                "connection_id": "conn_123",
                "fields": ["impressions", "clicks"],
            },
        }
    ],
    "connections": [],
}

mock_mongodb_client.insert_document.return_value = "mock_id_12345"


# Smart mock for get_document that returns appropriate data based on collection
def mock_get_document(
    collection_name: str | None = None,
    query: dict[str, Any] | None = None,
    *args: Any,
    **kwargs: Any,
) -> dict[str, Any] | None:
    """Return appropriate mock data based on collection name."""
    # Handle both positional and keyword arguments
    collection = collection_name or (args[0] if args else "")
    if not collection:
        return mock_connection_data

    collection_lower = collection.lower()
    if "user" in collection_lower:
        return mock_user_data
    elif "connection" in collection_lower:
        return mock_connection_data
    elif "workflow" in collection_lower:
        return mock_workflow_data
    return mock_connection_data  # default fallback


mock_mongodb_client.get_document.side_effect = mock_get_document
mock_mongodb_client.get_all_documents.return_value = [
    mock_connection_data,
    mock_workflow_data,
]
mock_update_result = Mock()
mock_update_result.matched_count = 1
mock_update_result.modified_count = 1
mock_mongodb_client.update_document.return_value = mock_update_result
mock_mongodb_client.delete_document.return_value = True

# Set the mongodb attribute to our mock client
mock_mongodb_module.mongodb = mock_mongodb_client
mock_mongodb_module.mongodb_client = mock_mongodb_client
mock_mongodb_module.MongoDBClient = Mock(return_value=mock_mongodb_client)
mock_mongodb_module.get_mongodb = Mock(return_value=mock_mongodb_client)

sys.modules["database.mongodb"] = mock_mongodb_module
sys.modules["common.database"] = mock_mongodb_module
sys.modules["common.database.mongodb"] = mock_mongodb_module

# Mock settings module FIRST before any imports
mock_settings = Mock()
mock_settings.google_oauth_client_id = "test_client_id"
mock_settings.google_oauth_client_secret = "test_client_secret"
mock_settings.google_oauth_redirect_uri = "http://localhost:8080/oauth2callback"
mock_settings.google_oauth_sheets_scope = "https://www.googleapis.com/auth/spreadsheets"
mock_settings.google_oauth_ads_scope = "https://www.googleapis.com/auth/adwords"
mock_settings.google_oauth_bigquery_scope = "https://www.googleapis.com/auth/bigquery"
mock_settings.oauth_state_secret = "test_oauth_state_secret_12345"
mock_settings.database = "test_db"
mock_settings.connection_collection = "connections"
mock_settings.workflow_collection = "workflows"
mock_settings.users_collection = "users"
mock_settings.google_fields = "google_fields"
mock_settings.google_oauth_token_url = "https://oauth2.googleapis.com/token"
mock_settings.frontend_oauth_success_url = "http://localhost:5173/oauth/success.html"
mock_settings.cors_origins = ["*"]
mock_settings.jwt_secret = "test_jwt_secret_key_for_testing_12345"
mock_settings.jwt_secret_key = "test_jwt_secret_key_for_testing_12345"  # alias
mock_settings.jwt_algorithm = "HS256"
mock_settings.access_token_expire_minutes = 30
mock_settings.refresh_token_expire_days = 7
mock_settings.access_token_cookie = "orbitx_access"
mock_settings.refresh_token_cookie = "orbitx_refresh"
mock_settings.rate_limit_enabled = False
mock_settings.rate_limit_default = "1000/minute"
mock_settings.rate_limit_auth = "100/minute"
mock_settings.rate_limit_expensive = "100/minute"
mock_settings.csrf_enabled = False
mock_settings.env = "DEV"

# Mock configs module
mock_config_module = Mock()
mock_config_module.settings = mock_settings
sys.modules["server.configs.config"] = mock_config_module


# =============================================================================
# Session-Scoped Fixtures
# =============================================================================


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment() -> None:
    """Set up test environment variables and mocks."""
    # Set test environment variables
    os.environ.update(
        {
            "MONGO_USERNAME": "test_user",
            "MONGO_PASSWORD": "test_pass",
            "MONGO_URI": "test.mongodb.net",
            "MONGO_DATABASE": "test_db",
            "GOOGLE_OAUTH_CLIENT_ID": "test_client_id",
            "GOOGLE_OAUTH_CLIENT_SECRET": "test_client_secret",
            "JWT_SECRET": "test_jwt_secret_key_for_testing_12345",
            "OAUTH_STATE_SECRET": "test_oauth_state_secret_12345",
        }
    )

    # Configure orbitx-common database settings
    from common.config.settings import configure_database

    configure_database(mock_settings)


# =============================================================================
# Test User & Auth Fixtures
# =============================================================================


@pytest.fixture
def test_user() -> dict[str, Any]:
    """Create a test user for authentication."""
    return {
        "_id": "test_user_id_123",
        "email": "test@example.com",
        "name": "Test User",
        "picture": "https://example.com/avatar.png",
        "role": "user",
        "is_active": True,
    }


@pytest.fixture
def mock_user_model(test_user: dict[str, Any]) -> Any:
    """Create a mock UserInDB model."""
    from common.model.user import UserInDB

    return UserInDB(
        id=test_user["_id"],
        email=test_user["email"],
        name=test_user["name"],
        picture=test_user.get("picture"),
        role=test_user["role"],
        is_active=test_user["is_active"],
    )


@pytest.fixture
def auth_headers(test_user: dict[str, Any]) -> dict[str, str]:
    """Create authorization headers with a valid test token."""
    payload = {
        "sub": test_user["_id"],
        "email": test_user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(
        payload, "test_jwt_secret_key_for_testing_12345", algorithm="HS256"
    )
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# FastAPI Test Client with Dependency Overrides
# =============================================================================


# Pre-generate a test token to avoid issues with mock settings during token creation
_TEST_JWT_SECRET = "test_jwt_secret_key_for_testing_12345"
_TEST_TOKEN_PAYLOAD = {
    "sub": "test_user_id_123",
    "email": "test@example.com",
    "exp": datetime.now(timezone.utc) + timedelta(days=1),
    "iat": datetime.now(timezone.utc),
}
_TEST_TOKEN = jwt.encode(_TEST_TOKEN_PAYLOAD, _TEST_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Create a test client for the FastAPI app with auth dependency override."""
    from common.model.user import UserInDB

    from server.main import app
    from server.services.auth.dependencies import get_current_user

    # Create mock user inline to avoid fixture dependency issues
    mock_user = UserInDB(
        id="test_user_id_123",
        email="test@example.com",
        name="Test User",
        picture="https://example.com/avatar.png",
        role="user",
        is_active=True,
    )

    # Override the auth dependency to return our mock user
    async def override_get_current_user() -> UserInDB:
        return mock_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    # Create client with default auth headers using pre-generated token
    with TestClient(
        app, headers={"Authorization": f"Bearer {_TEST_TOKEN}"}
    ) as test_client:
        yield test_client

    # Clean up dependency overrides
    app.dependency_overrides.clear()


@pytest.fixture
def unauthenticated_client() -> Generator[TestClient, None, None]:
    """Create a test client without auth override (for testing auth failures)."""
    from server.main import app

    # Clear any existing overrides
    app.dependency_overrides.clear()

    with TestClient(app) as test_client:
        yield test_client


# =============================================================================
# MongoDB Mock Fixture
# =============================================================================


@pytest.fixture
def mock_mongodb() -> Mock:
    """Mock MongoDB client - returns the global mock that can be modified in tests."""
    # Reset mock behavior for each test
    mock_mongodb_client.reset_mock()

    # Set default behaviors
    mock_mongodb_client.insert_document.return_value = "mock_id_12345"
    mock_mongodb_client.insert_document.side_effect = None

    # Keep the smart get_document that returns appropriate data based on collection
    mock_mongodb_client.get_document.side_effect = mock_get_document

    mock_mongodb_client.get_all_documents.return_value = [
        mock_connection_data,
        mock_workflow_data,
    ]
    mock_mongodb_client.get_all_documents.side_effect = None

    result = Mock()
    result.matched_count = 1
    result.modified_count = 1
    mock_mongodb_client.update_document.return_value = result
    mock_mongodb_client.update_document.side_effect = None
    mock_mongodb_client.delete_document.return_value = True
    mock_mongodb_client.delete_document.side_effect = None

    return mock_mongodb_client


# =============================================================================
# Sample Data Fixtures
# =============================================================================


@pytest.fixture
def sample_workflow_data() -> dict[str, Any]:
    """Sample workflow data for testing."""
    return {
        "_id": "test_job_123",
        "job_name": "Test Workflow",
        "status": "PAUSED",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "schedule_expression": "0 0 * * *",
        "user_id": "test_user_id_123",
        "nodes": [
            {
                "node_instance_id": 1,
                "node_id": "google_ads",
                "node_type": "source",
                "parameters": {
                    "connection_id": "conn_123",
                    "fields": ["impressions", "clicks"],
                },
            }
        ],
        "connections": [],
    }


@pytest.fixture
def sample_connection_data() -> dict[str, Any]:
    """Sample connection data for testing."""
    return {
        "_id": "conn_123",
        "connection_name": "Test Google Ads Connection",
        "service_name": "GoogleAds",
        "connection_type": "Source",
        "created_at": "2024-01-01T00:00:00Z",
        "status": "Connected",
        "user_id": "test_user_id_123",
        "params": {
            "access_token": "test_token",
            "refresh_token": "test_refresh_token",
            "token_type": "Bearer",
        },
    }


# =============================================================================
# External Service Mocks
# =============================================================================


@pytest.fixture
def mock_google_oauth() -> Iterator[Mock]:
    """Mock Google OAuth httpx responses."""
    from unittest.mock import AsyncMock

    with patch("server.api.google.oauth.httpx.AsyncClient") as mock_client_class:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "token_type": "Bearer",
            "expires_in": 3600,
            "scope": "https://www.googleapis.com/auth/spreadsheets",
        }
        mock_response.raise_for_status.return_value = None
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_google_cloud_run() -> Iterator[Mock]:
    """Mock Google Cloud Run client."""
    with patch("server.services.workflow.run_v2.JobsClient") as mock_client_class:
        mock_client = Mock()
        mock_operation = Mock()
        mock_response = Mock()
        mock_response.name = "test_execution_name"
        mock_operation.result.return_value = mock_response
        mock_client.run_job.return_value = mock_operation
        mock_client_class.return_value = mock_client
        yield mock_client


# =============================================================================
# Settings Mock (autouse for all tests)
# =============================================================================


@pytest.fixture(autouse=True)
def mock_settings_fixture() -> Iterator[Mock]:
    """Mock settings for all tests - ensures consistent configuration."""
    # Update the module-level mock with additional settings
    mock_settings.connection_collection = "test_connections"
    mock_settings.workflow_collection = "test_workflows"
    mock_settings.google_fields = "google_fields"
    mock_settings.google_cloud_project_id = "test_project"
    mock_settings.google_cloud_location = "test_location"
    mock_settings.google_cloud_job_name = "test_job"
    mock_settings.google_cloud_scheduler_timezone = "UTC"
    yield mock_settings
