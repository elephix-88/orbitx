"""Tests for Facebook API endpoints."""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from server.services.exceptions import ExternalAPIError


class TestFacebookAPI:
    """Test Facebook API endpoints."""

    @pytest.mark.unit
    def test_facebook_ads_accounts_success(self, client: TestClient):
        """Test successful Facebook Ads accounts retrieval."""
        # Arrange
        mock_accounts = [
            {
                "id": "act_123",
                "name": "Test Account 1",
                "account_id": "123",
                "account_status": 1,
            },
            {
                "id": "act_456",
                "name": "Test Account 2",
                "account_id": "456",
                "account_status": 1,
            },
        ]

        with patch(
            "server.api.facebook.ads.get_facebook_ads_accounts"
        ) as mock_get_accounts:
            from common.model.facebook.ads import FacebookAdsAccount

            mock_get_accounts.return_value = [
                FacebookAdsAccount(**account) for account in mock_accounts
            ]

            # Act
            response = client.get("/api/facebook/ads/accounts?connection_id=conn_123")

            # Assert
            assert response.status_code == 200
            accounts = response.json()
            assert len(accounts) == 2
            assert accounts[0]["id"] == "act_123"

    @pytest.mark.unit
    def test_facebook_ads_accounts_error(self, client: TestClient):
        """Test Facebook Ads accounts retrieval with error."""
        # Arrange
        with patch(
            "server.api.facebook.ads.get_facebook_ads_accounts"
        ) as mock_get_accounts:
            mock_get_accounts.side_effect = ExternalAPIError("Facebook", "API Error")

            # Act
            response = client.get("/api/facebook/ads/accounts?connection_id=conn_123")

            # Assert
            assert response.status_code == 502
            assert "Facebook API error" in response.json()["detail"]

    @pytest.mark.unit
    def test_facebook_fields_success(self, client: TestClient):
        """Test successful Facebook fields retrieval."""
        # Arrange
        mock_fields = [
            {
                "field": "impressions",
                "display_name": "Impressions",
                "group": "metrics",
                "data_type": "numeric",
                "is_primary_key": False,
                "endpoints": {"insights": "impressions"},
            },
            {
                "field": "clicks",
                "display_name": "Clicks",
                "group": "metrics",
                "data_type": "numeric",
                "is_primary_key": False,
                "endpoints": {"insights": "clicks"},
            },
        ]

        with patch(
            "server.api.facebook.facebook_fields.get_facebook_fields"
        ) as mock_get_fields:
            from common.model.facebook.fields import FacebookField

            mock_get_fields.return_value = [
                FacebookField(**field) for field in mock_fields
            ]

            # Act
            response = client.get("/api/facebook/facebook_fields")

            # Assert
            assert response.status_code == 200
            fields = response.json()
            assert len(fields) == 2
            assert fields[0]["field"] == "impressions"

    @pytest.mark.unit
    def test_facebook_fields_error(self, client: TestClient):
        """Test Facebook fields retrieval with error."""
        # Arrange
        with patch(
            "server.api.facebook.facebook_fields.get_facebook_fields"
        ) as mock_get_fields:
            mock_get_fields.side_effect = ExternalAPIError("Facebook", "API Error")

            # Act
            response = client.get("/api/facebook/facebook_fields")

            # Assert
            assert response.status_code == 502
            assert "Facebook API error" in response.json()["detail"]
