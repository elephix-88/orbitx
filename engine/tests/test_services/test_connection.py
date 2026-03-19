"""Tests for connection service."""

from unittest.mock import MagicMock, patch

import pytest
from pydantic import BaseModel

from engine.exceptions import ConnectionException
from engine.services.connection import get_connection_token


class MockTokenModel(BaseModel):
    """Mock token model for testing."""

    access_token: str
    refresh_token: str


class TestGetConnectionToken:
    """Tests for get_connection_token function."""

    @patch("engine.services.connection.get_mongodb")
    @patch("engine.services.connection.settings")
    def test_successful_token_retrieval(
        self, mock_settings: MagicMock, mock_mongodb: MagicMock
    ) -> None:
        """Test successful token retrieval from MongoDB."""
        mock_settings.connections_collection = "connections"

        mock_connection = MagicMock()
        mock_connection.params = {
            "access_token": "test_access",
            "refresh_token": "test_refresh",
        }
        mock_mongodb.find_one.return_value = mock_connection

        result = get_connection_token(
            connection_id="conn_123",
            service_name="facebook",
            token_model=MockTokenModel,
        )

        assert isinstance(result, MockTokenModel)
        assert result.access_token == "test_access"
        assert result.refresh_token == "test_refresh"
        mock_mongodb.find_one.assert_called_once()

    @patch("engine.services.connection.get_mongodb")
    @patch("engine.services.connection.settings")
    def test_connection_not_found(
        self, mock_settings: MagicMock, mock_mongodb: MagicMock
    ) -> None:
        """Test exception when connection is not found."""
        mock_settings.connections_collection = "connections"
        mock_mongodb.find_one.return_value = None

        with pytest.raises(ConnectionException) as exc_info:
            get_connection_token(
                connection_id="invalid_id",
                service_name="facebook",
                token_model=MockTokenModel,
            )

        assert "Connection info not found" in str(exc_info.value)
        assert exc_info.value.service_name == "facebook"
        assert exc_info.value.connection_id == "invalid_id"

    @patch("engine.services.connection.get_mongodb")
    @patch("engine.services.connection.settings")
    def test_connection_without_params(
        self, mock_settings: MagicMock, mock_mongodb: MagicMock
    ) -> None:
        """Test exception when connection has no params."""
        mock_settings.connections_collection = "connections"

        mock_connection = MagicMock()
        mock_connection.params = None
        mock_mongodb.find_one.return_value = mock_connection

        with pytest.raises(ConnectionException) as exc_info:
            get_connection_token(
                connection_id="conn_no_params",
                service_name="google",
                token_model=MockTokenModel,
            )

        assert "Connection info not found" in str(exc_info.value)
        assert exc_info.value.service_name == "google"
