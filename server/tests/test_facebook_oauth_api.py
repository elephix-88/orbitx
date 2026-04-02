from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

# If you have a main app, import it. Otherwise, create a test app with the router.
from fastapi import FastAPI
from fastapi.testclient import TestClient

from common.model.connection import ConnectionType, ServiceName
from common.model.user import UserInDB

# Adjust imports based on your project structure
from server.api.facebook.oauth import router
from server.services.auth.dependencies import get_current_user

# from server.configs.config import settings

app = FastAPI()
app.include_router(router)

# Mock user for tests
_MOCK_USER = UserInDB(
    id="test_user_id_123",
    email="test@example.com",
    name="Test User",
    picture="https://example.com/avatar.png",
    role="user",
    is_active=True,
)


def _authenticated_client() -> TestClient:
    """Return a TestClient with the get_current_user dependency overridden."""
    app.dependency_overrides[get_current_user] = lambda: _MOCK_USER
    return TestClient(app)


client = _authenticated_client()


@pytest.fixture
def mock_mongo():
    mock_collection = MagicMock()
    mock_collection.insert_one = AsyncMock()
    mock_db = MagicMock()
    mock_db.__getitem__ = MagicMock(return_value=mock_collection)
    with patch("server.services.oauth_base.database", mock_db):
        yield mock_collection


@pytest.fixture
def mock_httpx():
    with patch("server.api.facebook.oauth.httpx.AsyncClient") as mock:
        yield mock


@pytest.fixture
def mock_settings():
    # Use Mock instead of MagicMock to avoid spec issues with rate_limit_enabled
    mock = Mock()
    mock.facebook_app_id = "test_app_id"
    mock.facebook_app_secret = "test_app_secret"
    mock.facebook_redirect_uri = "http://localhost:8080/api/facebook/oauth2callback"
    mock.facebook_oauth_token_url = (
        "https://graph.facebook.com/v24.0/oauth/access_token"
    )
    mock.facebook_scope = ["ads_read"]
    mock.frontend_oauth_success_url = "http://frontend/success"
    mock.oauth_state_secret = "secret"
    mock.facebook_api_version = "v24.0"
    mock.connection_collection = "connections"
    mock.rate_limit_enabled = False
    mock.rate_limit_auth = "100/minute"
    return mock


def test_login_endpoint(mock_settings):
    # Patch settings in both modules where they are used.
    # Authentication is handled via dependency_overrides set on the app.
    with patch("server.api.facebook.oauth.settings", mock_settings), patch(
        "server.services.facebook.oauth.settings", mock_settings
    ):
        payload = {"connection_name": "My Facebook Connection"}
        response = client.post("/api/facebook/login", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "oauth_url" in data
        assert "connection_id" in data
        assert "facebook.com" in data["oauth_url"]
        assert "client_id=test_app_id" in data["oauth_url"]


def test_oauth2callback_success(mock_mongo, mock_httpx, mock_settings):
    # Mock verify_state to return valid data (including user_id for ConnectionKey)
    with patch("server.api.facebook.oauth.verify_state") as mock_verify:
        mock_verify.return_value = {
            "connection_type": ConnectionType.SOURCE.value,
            "connection_id": "test_conn_id",
            "service_name": ServiceName.FACEBOOK_ADS.value,
            "connection_name": "My Facebook Connection",
            "user_id": "test_user_id_123",
        }

        # Mock httpx token exchange response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "test_access_token",
            "token_type": "bearer",
            "expires_in": 3600,
        }
        mock_response.raise_for_status.return_value = None
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_httpx.return_value.__aenter__.return_value = mock_client

        # Patch settings in both modules
        with patch("server.api.facebook.oauth.settings", mock_settings), patch(
            "server.services.facebook.oauth.settings", mock_settings
        ):
            response = client.get(
                "/api/facebook/oauth2callback?code=test_code&state=valid_state",
                follow_redirects=False,
            )

        assert response.status_code == 307
        # It redirects
        assert response.history or response.url

        # Verify DB save — new pattern uses insert_one with a plain dict
        mock_mongo.insert_one.assert_awaited_once()
        inserted_doc = mock_mongo.insert_one.call_args[0][0]
        assert inserted_doc["service_name"] == ServiceName.FACEBOOK_ADS.value
        assert inserted_doc["params"]["access_token"] == "test_access_token"


def test_oauth2callback_missing_params():
    response = client.get("/api/facebook/oauth2callback")
    assert response.status_code == 400
    assert "Missing code/state" in response.json()["detail"]


def test_oauth2callback_token_failure(mock_httpx, mock_settings):
    with patch("server.api.facebook.oauth.verify_state") as mock_verify:
        mock_verify.return_value = {
            "connection_type": ConnectionType.SOURCE.value,
            "connection_id": "test_conn_id",
            "service_name": ServiceName.FACEBOOK_ADS.value,
            "connection_name": "My Facebook Connection",
            "user_id": "test_user_id_123",
        }

        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Error"
        mock_response.raise_for_status.side_effect = Exception("Token exchange failed")
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_httpx.return_value.__aenter__.return_value = mock_client

        with patch("server.api.facebook.oauth.settings", mock_settings):
            response = client.get(
                "/api/facebook/oauth2callback?code=bad_code&state=valid_state",
                follow_redirects=False,
            )

        # The callback catches all exceptions and redirects to the frontend
        # error URL rather than raising HTTP 400.
        assert response.status_code == 307
        assert "error=" in response.headers["location"]
