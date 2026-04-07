# tests/unit/test_google_auth.py
import json
from unittest.mock import MagicMock, patch

import pytest
from google.oauth2.credentials import Credentials

from engine.services.google.auth import build_credentials


@pytest.fixture
def mock_settings(monkeypatch):
    monkeypatch.setattr(
        "engine.services.google.auth.settings.google_oauth_token_uri",
        "https://fake.token.uri",
    )
    monkeypatch.setattr(
        "engine.services.google.auth.settings.google_oauth_client_id", "fake-client-id"
    )
    monkeypatch.setattr(
        "engine.services.google.auth.settings.google_oauth_client_secret",
        "fake-client-secret",
    )


@patch("requests.Session.request")
def test_build_credentials_with_access_token(mock_request, mock_settings):
    # This test verifies behavior when an access token is provided,
    # but the underlying google-auth library may still attempt a refresh
    # if it considers the token invalid (e.g., missing expiry).
    # We mock the network call to prevent a real request and simulate a refresh.
    mock_response = MagicMock()
    mock_response.status_code = 200
    response_data = {
        "access_token": "refreshed-access-token",
        "expires_in": 3600,
        "token_type": "Bearer",
    }
    mock_response.content = json.dumps(response_data).encode("utf-8")
    mock_request.return_value = mock_response

    creds = build_credentials(
        refresh_token="refresh-123",
        access_token="access-456",  # Assume this token is expired/invalid
    )

    assert isinstance(creds, Credentials)
    assert creds.refresh_token == "refresh-123"
    # The token should be the one from the mocked refresh response
    assert creds.token == "refreshed-access-token"
    assert creds.token_uri == "https://fake.token.uri"
    assert creds.client_id == "fake-client-id"
    assert creds.client_secret == "fake-client-secret"


@patch("requests.Session.request")
def test_build_credentials_without_access_token(mock_request, mock_settings):
    # Verifies that a token is correctly refreshed when no access token is provided.
    mock_response = MagicMock()
    mock_response.status_code = 200
    response_data = {
        "access_token": "new-access-token",
        "expires_in": 3600,
        "token_type": "Bearer",
    }
    mock_response.content = json.dumps(response_data).encode("utf-8")
    mock_request.return_value = mock_response

    creds = build_credentials(
        refresh_token="refresh-xyz",
        access_token=None,
    )

    assert isinstance(creds, Credentials)
    assert creds.refresh_token == "refresh-xyz"
    # The token should be the new one from the mocked refresh response
    assert creds.token == "new-access-token"
    assert creds.token_uri == "https://fake.token.uri"
    assert creds.client_id == "fake-client-id"
    assert creds.client_secret == "fake-client-secret"
    # Ensure the network call was made
    mock_request.assert_called_once()
