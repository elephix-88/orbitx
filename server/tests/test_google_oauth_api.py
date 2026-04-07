"""Tests for Google OAuth API endpoints."""
import base64
import hashlib
import hmac
import json
import time
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from server.services.exceptions import ConnectionNotFoundError, ExternalAPIError


class TestGoogleOAuthEndpoints:
    """Test Google OAuth API endpoints."""

    @pytest.mark.unit
    def test_google_sheets_login_success(self, client: TestClient):
        """Test successful Google Sheets login."""
        # Arrange
        payload = {"connection_name": "Test Sheets Connection"}

        # Act
        response = client.post("/api/google/sheets/login", json=payload)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert "oauth_url" in result
        assert "connection_id" in result
        assert "message" in result
        assert "accounts.google.com" in result["oauth_url"]
        assert (
            "spreadsheets" in result["oauth_url"] or "auth" in result["oauth_url"]
        )  # Check scope or general auth

    @pytest.mark.unit
    def test_google_sheets_login_invalid_payload(self, client: TestClient):
        """Test Google Sheets login with invalid payload."""
        # Arrange
        invalid_payload = {"invalid_field": "value"}

        # Act
        response = client.post("/api/google/sheets/login", json=invalid_payload)

        # Assert
        assert response.status_code == 422

    @pytest.mark.unit
    def test_google_ads_login_success(self, client: TestClient):
        """Test successful Google Ads login."""
        # Arrange
        payload = {"connection_name": "Test Ads Connection"}

        # Act
        response = client.post("/api/google/google_ads/login", json=payload)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert "oauth_url" in result
        assert "connection_id" in result
        assert "message" in result
        assert "accounts.google.com" in result["oauth_url"]
        assert (
            "adwords" in result["oauth_url"] or "auth" in result["oauth_url"]
        )  # Check scope or general auth

    @pytest.mark.unit
    def test_bigquery_login_success(self, client: TestClient):
        """Test successful BigQuery login."""
        # Arrange
        payload = {"connection_name": "Test BigQuery Connection"}

        # Act
        response = client.post("/api/google/bigquery/login", json=payload)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert "oauth_url" in result
        assert "connection_id" in result
        assert "message" in result
        assert "accounts.google.com" in result["oauth_url"]
        assert "bigquery" in result["oauth_url"]  # Check scope

    def create_valid_state(
        self,
        connection_type: str,
        connection_id: str,
        service_name: str,
        connection_name: str,
        user_id: str = "test_user_id_123",
    ) -> str:
        """Helper to create valid state for testing."""
        secret = b"test_oauth_state_secret_12345"
        payload = {
            "t": connection_type,
            "cid": connection_id,
            "svc": service_name,
            "cn": connection_name,
            "uid": user_id,
            "nonce": "test_nonce",
            "ts": int(time.time()),
        }
        raw = json.dumps(payload, separators=(",", ":")).encode()
        sig = hmac.new(secret, raw, hashlib.sha256).digest()
        return base64.urlsafe_b64encode(raw + b"." + sig).decode().rstrip("=")

    @pytest.mark.unit
    def test_oauth2callback_success(
        self, client: TestClient, mock_mongodb, mock_google_oauth
    ):
        """Test successful OAuth2 callback."""
        with patch("server.services.oauth_utils.settings") as mock_oauth_settings:
            mock_oauth_settings.oauth_state_secret = "test_oauth_state_secret_12345"
            mock_oauth_settings.google_oauth_client_id = "test_client_id"
            mock_oauth_settings.google_oauth_client_secret = "test_client_secret"
            mock_oauth_settings.google_oauth_redirect_uri = (
                "http://localhost:8080/oauth2callback"
            )
            mock_oauth_settings.google_oauth_token_url = (
                "https://oauth2.googleapis.com/token"
            )
            mock_oauth_settings.frontend_oauth_success_url = (
                "http://localhost:5173/oauth/success.html"
            )
            mock_oauth_settings.connection_collection = "connections"

            # Arrange
            code = "test_auth_code"
            state = self.create_valid_state(
                "Source", "conn_123", "GoogleAds", "Test Connection"
            )

            # Act
            response = client.get(
                f"/oauth2callback?code={code}&state={state}", follow_redirects=False
            )

            # Assert
            assert response.status_code == 307  # Temporary Redirect
            # Should redirect to frontend success URL
            assert response.headers.get("location") is not None
            assert "oauth/success" in response.headers.get("location", "")
            assert "provider=googleads" in response.headers.get("location", "")

    @pytest.mark.unit
    def test_oauth2callback_missing_code(self, client: TestClient):
        """Test OAuth2 callback with missing code."""
        # Arrange
        state = self.create_valid_state(
            "Source", "conn_123", "GoogleAds", "Test Connection"
        )

        # Act
        response = client.get(f"/oauth2callback?state={state}")

        # Assert
        assert response.status_code == 400
        assert "Missing code/state" in response.json()["detail"]

    @pytest.mark.unit
    def test_oauth2callback_missing_state(self, client: TestClient):
        """Test OAuth2 callback with missing state."""
        # Arrange
        code = "test_auth_code"

        # Act
        response = client.get(f"/oauth2callback?code={code}")

        # Assert
        assert response.status_code == 400
        assert "Missing code/state" in response.json()["detail"]

    @pytest.mark.unit
    def test_oauth2callback_invalid_state(self, client: TestClient):
        """Test OAuth2 callback with invalid state."""
        # Arrange
        code = "test_auth_code"
        invalid_state = "invalid_state_string"

        # Act
        response = client.get(f"/oauth2callback?code={code}&state={invalid_state}")

        # Assert - Invalid state raises ValueError which is caught and returns 400
        assert response.status_code == 400
        assert "Invalid state" in response.json()["detail"]

    @pytest.mark.unit
    def test_oauth2callback_token_exchange_failure(self, client: TestClient):
        """Test OAuth2 callback when token exchange fails."""
        # Arrange
        code = "test_auth_code"
        state = self.create_valid_state(
            "Source", "conn_123", "GoogleAds", "Test Connection"
        )

        from unittest.mock import AsyncMock

        with patch(
            "server.api.google.oauth.httpx.AsyncClient"
        ) as mock_client_class:
            mock_response = Mock()
            mock_response.status_code = 400
            mock_response.text = "Invalid grant"
            mock_response.raise_for_status.side_effect = Exception(
                "Token exchange failed"
            )
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client

            # Act
            response = client.get(f"/oauth2callback?code={code}&state={state}")

            # Assert
            assert response.status_code == 400
            assert "Token exchange failed" in response.json()["detail"]

    @pytest.mark.unit
    def test_google_ads_fields_success(self, client: TestClient):
        """Test successful Google Ads fields retrieval."""
        # Arrange - Mock the service function to return proper GoogleAdsField data
        mock_fields = [
            {
                "field": "impressions",
                "output_name": "impressions",
                "display_name": "Impressions",
                "data_type": "INT64",
                "is_primary_key": False,
                "is_breakdown": False,
                "active": True,
                "source": {
                    "base": "ad_group",
                    "select": "metrics.impressions",
                    "allowed_bases": ["ad_group", "campaign"],
                },
            },
            {
                "field": "clicks",
                "output_name": "clicks",
                "display_name": "Clicks",
                "data_type": "INT64",
                "is_primary_key": False,
                "is_breakdown": False,
                "active": True,
                "source": {
                    "base": "ad_group",
                    "select": "metrics.clicks",
                    "allowed_bases": ["ad_group", "campaign"],
                },
            },
        ]

        with patch("server.api.google.ads.get_google_ads_fields") as mock_get_fields:
            from common.model.google.ads import GoogleAdsField

            mock_get_fields.return_value = [
                GoogleAdsField(**field) for field in mock_fields
            ]

            # Act
            response = client.get("/api/google/google_ads/fields")

            # Assert
            assert response.status_code == 200
            fields = response.json()
            assert len(fields) == 2
            assert fields[0]["field"] == "impressions"
            assert fields[1]["field"] == "clicks"

    @pytest.mark.unit
    def test_google_ads_fields_error(self, client: TestClient):
        """Test Google Ads fields retrieval with error."""
        # Arrange
        with patch("server.api.google.ads.get_google_ads_fields") as mock_get_fields:
            mock_get_fields.side_effect = ExternalAPIError("Google Ads", "API Error")

            # Act
            response = client.get("/api/google/google_ads/fields")

            # Assert
            assert response.status_code == 502
            assert "Google Ads API error" in response.json()["detail"]

    @pytest.mark.unit
    def test_google_ads_accounts_success(self, client: TestClient):
        """Test successful Google Ads accounts retrieval."""
        # Arrange
        connection_id = "conn_123"
        mock_accounts = [
            {
                "resource_name": "customers/123456789",
                "id": "123456789",
                "descriptive_name": "Test Account 1",
            },
            {
                "resource_name": "customers/987654321",
                "id": "987654321",
                "descriptive_name": "Test Account 2",
            },
        ]

        with patch(
            "server.api.google.ads.get_google_ads_accounts"
        ) as mock_get_accounts:
            from common.model.google.ads import GoogleAdsAccount

            mock_get_accounts.return_value = [
                GoogleAdsAccount(**account) for account in mock_accounts
            ]

            # Act
            response = client.get(
                f"/api/google/google_ads/accounts?connection_id={connection_id}"
            )

            # Assert
            assert response.status_code == 200
            accounts = response.json()
            assert len(accounts) == 2
            assert accounts[0]["id"] == "123456789"

    @pytest.mark.unit
    def test_google_ads_accounts_missing_connection_id(self, client: TestClient):
        """Test Google Ads accounts retrieval without connection_id."""
        # Act
        response = client.get("/api/google/google_ads/accounts")

        # Assert
        assert response.status_code == 422

    @pytest.mark.integration
    def test_oauth_flow_integration(
        self, client: TestClient, mock_mongodb, mock_google_oauth
    ):
        """Test complete OAuth flow integration."""
        with (
            patch("server.services.oauth_utils.settings") as mock_utils_settings,
            patch("server.api.google.oauth.settings") as mock_api_settings,
            patch("server.api.google.sheets.settings") as mock_sheets_settings,
        ):
            # Configure settings for all mocks
            for mock_settings in [
                mock_utils_settings,
                mock_api_settings,
                mock_sheets_settings,
            ]:
                mock_settings.oauth_state_secret = "test_oauth_state_secret_12345"
                mock_settings.google_oauth_client_id = "test_client_id"
                mock_settings.google_oauth_client_secret = "test_client_secret"
                mock_settings.google_oauth_redirect_uri = (
                    "http://localhost:8080/oauth2callback"
                )
                mock_settings.google_oauth_token_url = (
                    "https://oauth2.googleapis.com/token"
                )
                mock_settings.frontend_oauth_success_url = (
                    "http://localhost:5173/oauth/success.html"
                )
                mock_settings.connection_collection = "connections"
                mock_settings.google_oauth_drive_scope = (
                    "https://www.googleapis.com/auth/drive"
                )

            # Step 1: Initiate OAuth login
            payload = {"connection_name": "Integration Test Connection"}
            response = client.post("/api/google/sheets/login", json=payload)
            assert response.status_code == 200

            oauth_data = response.json()
            connection_id = oauth_data["connection_id"]

            # Step 2: Simulate OAuth callback
            code = "test_auth_code"
            state = self.create_valid_state(
                "Destination",
                connection_id,
                "GoogleSheet",
                "Integration Test Connection",
            )

            response = client.get(
                f"/oauth2callback?code={code}&state={state}", follow_redirects=False
            )
            assert response.status_code == 307  # Temporary Redirect

            # Verify that save_to_mongo was called
            mock_mongodb.insert_document.assert_called_once()


class TestGoogleSheetsEndpoints:
    """Test Google Sheets API endpoints."""

    @pytest.mark.unit
    def test_google_sheets_spreadsheets_success(self, client: TestClient):
        """Test successful Google Sheets spreadsheets retrieval."""
        # Arrange - Mock the service function to return proper GoogleSheetsFile data
        mock_spreadsheets = [
            {
                "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                "name": "Example Spreadsheet",
                "web_view_link": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
                "created_time": "2023-01-01T00:00:00Z",
                "modified_time": "2023-01-02T00:00:00Z",
                "mime_type": "application/vnd.google-apps.spreadsheet",
            },
            {
                "id": "2CxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
                "name": "Another Spreadsheet",
                "web_view_link": "https://docs.google.com/spreadsheets/d/2CxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
                "created_time": "2023-01-03T00:00:00Z",
                "modified_time": "2023-01-04T00:00:00Z",
                "mime_type": "application/vnd.google-apps.spreadsheet",
            },
        ]

        with patch(
            "server.api.google.sheets.get_google_sheets_spreadsheets"
        ) as mock_get_spreadsheets:
            from common.model.google.sheets import GoogleSheetsFile

            mock_get_spreadsheets.return_value = [
                GoogleSheetsFile(**sheet) for sheet in mock_spreadsheets
            ]

            # Act
            response = client.get(
                "/api/google/sheets/spreadsheets?connection_id=test_conn_123"
            )

            # Assert
            assert response.status_code == 200
            spreadsheets = response.json()
            assert len(spreadsheets) == 2
            assert spreadsheets[0]["name"] == "Example Spreadsheet"
            assert spreadsheets[1]["name"] == "Another Spreadsheet"

    @pytest.mark.unit
    def test_google_sheets_spreadsheet_details_success(self, client: TestClient):
        """Test successful Google Sheets spreadsheet details retrieval."""
        # Arrange - Mock the service function to return GoogleSheetsSpreadsheet
        mock_spreadsheet = {
            "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
            "name": "Example Spreadsheet",
            "spreadsheet_url": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
            "created_time": "2023-01-01T00:00:00Z",
            "modified_time": "2023-01-02T00:00:00Z",
            "worksheets": [
                {
                    "sheet_id": 0,
                    "title": "Sheet1",
                    "index": 0,
                    "sheet_type": "GRID",
                    "grid_properties": {"rowCount": 1000, "columnCount": 26},
                },
                {
                    "sheet_id": 123456,
                    "title": "Data",
                    "index": 1,
                    "sheet_type": "GRID",
                    "grid_properties": {"rowCount": 500, "columnCount": 10},
                },
            ],
        }

        with patch(
            "server.api.google.sheets.get_google_sheets_worksheets"
        ) as mock_get_worksheets:
            from common.model.google.sheets import GoogleSheetsSpreadsheet

            mock_get_worksheets.return_value = GoogleSheetsSpreadsheet(
                **mock_spreadsheet
            )

            # Act
            response = client.get(
                "/api/google/sheets/spreadsheets/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms?connection_id=test_conn_123"
            )

            # Assert
            assert response.status_code == 200
            spreadsheet = response.json()
            assert spreadsheet["name"] == "Example Spreadsheet"
            assert len(spreadsheet["worksheets"]) == 2
            assert spreadsheet["worksheets"][0]["title"] == "Sheet1"
            assert spreadsheet["worksheets"][1]["title"] == "Data"

    @pytest.mark.unit
    def test_google_sheets_validate_connection_success(self, client: TestClient):
        """Test successful Google Sheets connection validation."""
        # Arrange
        with patch(
            "server.api.google.sheets.validate_google_sheets_connection"
        ) as mock_validate:
            mock_validate.return_value = True

            # Act
            response = client.get(
                "/api/google/sheets/validate?connection_id=test_conn_123"
            )

            # Assert
            assert response.status_code == 200
            result = response.json()
            assert result["connection_id"] == "test_conn_123"
            assert result["is_valid"] is True
            assert "valid" in result["message"]

    @pytest.mark.unit
    def test_google_sheets_spreadsheets_error(self, client: TestClient):
        """Test Google Sheets spreadsheets retrieval with error."""
        # Arrange
        with patch(
            "server.api.google.sheets.get_google_sheets_spreadsheets"
        ) as mock_get_spreadsheets:
            mock_get_spreadsheets.side_effect = ExternalAPIError(
                "Google Sheets", "API Error"
            )

            # Act
            response = client.get(
                "/api/google/sheets/spreadsheets?connection_id=test_conn_123"
            )

            # Assert
            assert response.status_code == 502
            assert "Google Sheets API error" in response.json()["detail"]

    @pytest.mark.unit
    def test_google_sheets_spreadsheet_details_not_found(self, client: TestClient):
        """Test Google Sheets spreadsheet details with connection not found."""
        # Arrange
        with patch(
            "server.api.google.sheets.get_google_sheets_worksheets"
        ) as mock_get_worksheets:
            mock_get_worksheets.side_effect = ConnectionNotFoundError("test_conn_123")

            # Act
            response = client.get(
                "/api/google/sheets/spreadsheets/invalid_id?connection_id=test_conn_123"
            )

            # Assert
            assert response.status_code == 404
            assert "Connection not found" in response.json()["detail"]
