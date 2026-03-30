"""Tests for Facebook service."""
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from common.model.connection import ConnectionItem
from common.model.facebook.ads import FacebookAdsAccount
from common.model.user import UserInDB
from server.services.exceptions import ConnectionNotFoundError, ExternalAPIError
from server.services.facebook.ads import get_facebook_ads_accounts

# Mock user for tests
_MOCK_USER = UserInDB(
    id="test_user_id_123",
    email="test@example.com",
    name="Test User",
    picture="https://example.com/avatar.png",
    role="user",
    is_active=True,
)


class TestFacebookService:
    """Test Facebook service functions."""

    @pytest.fixture
    def mock_mongodb(self):
        with patch("server.services.facebook.ads.mongodb_client") as mock:
            yield mock

    @pytest.fixture
    def mock_user_context(self):
        """Mock the user context for service functions."""
        with patch("server.services.facebook.ads.get_current_user") as mock:
            mock.return_value = _MOCK_USER
            yield mock

    @pytest.fixture
    def mock_settings(self):
        with patch("server.services.facebook.ads.settings") as mock:
            mock.connection_collection = "connections"
            mock.facebook_api_version = "v18.0"
            yield mock

    @pytest.fixture
    def sample_connection_item(self):
        return ConnectionItem(
            _id="conn_123",
            user_id="test_user_id_123",
            connection_name="Test Facebook Ads Connection",
            service_name="FacebookAds",
            connection_type="Source",
            created_at="2024-01-01T00:00:00Z",
            status="Connected",
            params={
                "access_token": "test_access_token",
                "expires_in": 3600,
            },
        )

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_facebook_ads_accounts_success(
        self,
        mock_mongodb,
        mock_settings,
        mock_user_context,
        sample_connection_item,
    ):
        """Test successful retrieval of Facebook Ads accounts with pagination."""
        # Arrange
        mock_mongodb.get_document.return_value = sample_connection_item

        # Mock httpx responses for pagination
        mock_response1 = MagicMock()
        mock_response1.json.return_value = {
            "data": [
                {
                    "id": "act_123",
                    "name": "Account 1",
                    "account_id": "123",
                    "account_status": 1,
                }
            ],
            "paging": {"next": "http://next-page-url"},
        }
        mock_response1.raise_for_status.return_value = None

        mock_response2 = MagicMock()
        mock_response2.json.return_value = {
            "data": [
                {
                    "id": "act_456",
                    "name": "Account 2",
                    "account_id": "456",
                    "account_status": 1,
                }
            ],
            "paging": {},  # No next page
        }
        mock_response2.raise_for_status.return_value = None

        # Create async mock client
        mock_client = AsyncMock()
        mock_client.get.side_effect = [mock_response1, mock_response2]

        with patch(
            "server.services.facebook.ads.httpx.AsyncClient"
        ) as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client

            # Act
            accounts = await get_facebook_ads_accounts("conn_123")

            # Assert
            assert len(accounts) == 2
            assert isinstance(accounts[0], FacebookAdsAccount)
            assert accounts[0].id == "act_123"
            assert accounts[0].name == "Account 1"
            assert accounts[1].id == "act_456"
            assert accounts[1].name == "Account 2"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_facebook_ads_accounts_connection_not_found(
        self, mock_mongodb, mock_settings, mock_user_context
    ):
        """Test Facebook Ads accounts retrieval when connection not found."""
        # Arrange
        mock_mongodb.get_document.return_value = None

        # Act & Assert
        with pytest.raises(ConnectionNotFoundError):
            await get_facebook_ads_accounts("conn_123")

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_facebook_ads_accounts_error(
        self,
        mock_mongodb,
        mock_settings,
        mock_user_context,
        sample_connection_item,
    ):
        """Test Facebook Ads accounts retrieval with API error."""
        # Arrange
        mock_mongodb.get_document.return_value = sample_connection_item

        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_client.get.side_effect = httpx.HTTPStatusError(
            "Bad Request", request=MagicMock(), response=mock_response
        )

        with patch(
            "server.services.facebook.ads.httpx.AsyncClient"
        ) as mock_async_client:
            mock_async_client.return_value.__aenter__.return_value = mock_client

            # Act & Assert
            with pytest.raises(ExternalAPIError):
                await get_facebook_ads_accounts("conn_123")
