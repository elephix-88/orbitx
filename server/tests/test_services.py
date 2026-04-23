"""Tests for service layer functions."""
import pytest


class TestGoogleOAuthServices:
    """Test Google OAuth service functions."""

    @pytest.mark.unit
    def test_make_state_success(self):
        """Test successful state creation."""
        from server.services.oauth.utils import make_state

        # Act
        state = make_state("Source", "conn_123", "GoogleAds", "Test Connection")

        # Assert
        assert isinstance(state, str)
        assert len(state) > 0

    @pytest.mark.unit
    def test_verify_state_success(self):
        """Test successful state verification."""
        from server.services.oauth.utils import make_state, verify_state

        # Arrange - create state using the same settings that conftest.py mocks
        original_state = make_state(
            "Source", "conn_123", "GoogleAds", "Test Connection"
        )

        # Act
        result = verify_state(original_state)

        # Assert
        assert result is not None
        assert result["connection_type"] == "Source"
        assert result["connection_id"] == "conn_123"
        assert result["service_name"] == "GoogleAds"
        assert result["connection_name"] == "Test Connection"

    @pytest.mark.unit
    def test_verify_state_invalid_format(self):
        """Test state verification with invalid format."""
        from server.services.oauth.utils import verify_state

        # Act & Assert
        with pytest.raises(ValueError, match="Invalid state format"):
            verify_state("invalid_state")

    @pytest.mark.unit
    def test_build_google_oauth_url_success(self):
        """Test successful OAuth URL building."""
        from server.services.google.oauth import build_google_oauth_url

        # Act
        url = build_google_oauth_url(
            scope="https://www.googleapis.com/auth/spreadsheets",
            connection_type="Destination",
            connection_id="conn_123",
            service_name="GoogleSheet",
            connection_name="Test Connection",
        )

        # Assert
        assert "accounts.google.com/o/oauth2/v2/auth" in url
        assert "client_id=test_client_id" in url
        assert "scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets" in url
        assert "redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Foauth2callback" in url
        assert "state=" in url

    @pytest.mark.unit
    def test_build_google_oauth_url_with_list_scope(self):
        """Test OAuth URL building with list of scopes."""
        from server.services.google.oauth import build_google_oauth_url

        # Act
        url = build_google_oauth_url(
            scope=[
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive",
            ],
            connection_type="Destination",
            connection_id="conn_123",
            service_name="GoogleSheet",
            connection_name="Test Connection",
        )

        # Assert
        assert "accounts.google.com/o/oauth2/v2/auth" in url
        assert "spreadsheets" in url
        assert "drive" in url
