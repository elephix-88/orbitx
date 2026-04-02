"""Tests for connection service."""

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import BaseModel

from engine.exceptions import ConnectionException
from engine.services.connection import get_connection_token


class MockTokenModel(BaseModel):
    """Mock token model for testing."""

    access_token: str
    refresh_token: str


def _make_connection_document(
    params: dict | None = None,
) -> dict:
    return {
        "_id": "conn_123",
        "user_id": "user_1",
        "connection_name": "Test Connection",
        "service_name": "facebook",
        "connection_type": "Source",
        "created_at": datetime.now(),
        "params": params or {},
    }


class TestGetConnectionToken:
    """Tests for get_connection_token function."""

    @patch("engine.services.connection.settings")
    @patch(
        "engine.services.connection.find_one",
        new_callable=AsyncMock,
    )
    def test_successful_token_retrieval(
        self, mock_find_one: AsyncMock, mock_settings: AsyncMock
    ) -> None:
        """Test successful token retrieval from MongoDB."""
        mock_settings.connections_collection = "connections"
        mock_find_one.return_value = None  # overridden below with a real model

        from common.model.connection import ConnectionItem

        mock_find_one.return_value = ConnectionItem.model_validate(
            _make_connection_document(
                params={
                    "access_token": "test_access",
                    "refresh_token": "test_refresh",
                }
            )
        )

        result = asyncio.run(
            get_connection_token(
                connection_id="conn_123",
                service_name="facebook",
                token_model=MockTokenModel,
            )
        )

        assert isinstance(result, MockTokenModel)
        assert result.access_token == "test_access"
        assert result.refresh_token == "test_refresh"
        assert mock_find_one.call_count == 1
        call_args = mock_find_one.call_args
        assert call_args.args[1] == "conn_123"
        assert call_args.args[2] is ConnectionItem

    @patch("engine.services.connection.settings")
    @patch(
        "engine.services.connection.find_one",
        new_callable=AsyncMock,
    )
    def test_connection_not_found(
        self, mock_find_one: AsyncMock, mock_settings: AsyncMock
    ) -> None:
        """Test exception when connection is not found."""
        mock_settings.connections_collection = "connections"
        mock_find_one.return_value = None

        with pytest.raises(ConnectionException) as exc_info:
            asyncio.run(
                get_connection_token(
                    connection_id="invalid_id",
                    service_name="facebook",
                    token_model=MockTokenModel,
                )
            )

        assert "Connection info not found" in str(exc_info.value)
        assert exc_info.value.service_name == "facebook"
        assert exc_info.value.connection_id == "invalid_id"

    @patch("engine.services.connection.settings")
    @patch(
        "engine.services.connection.find_one",
        new_callable=AsyncMock,
    )
    def test_connection_without_params(
        self, mock_find_one: AsyncMock, mock_settings: AsyncMock
    ) -> None:
        """Test exception when connection has empty params."""
        mock_settings.connections_collection = "connections"

        from common.model.connection import ConnectionItem

        mock_find_one.return_value = ConnectionItem.model_validate(
            _make_connection_document(params={})
        )

        with pytest.raises(ConnectionException) as exc_info:
            asyncio.run(
                get_connection_token(
                    connection_id="conn_no_params",
                    service_name="google",
                    token_model=MockTokenModel,
                )
            )

        assert "Connection info not found" in str(exc_info.value)
        assert exc_info.value.service_name == "google"
