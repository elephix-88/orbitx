"""Tests for auth dependencies module."""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from common.model.user import UserInDB


class TestExtractToken:
    """Tests for _extract_token function."""

    def test_extract_token_from_header(self):
        """Test extracting token from Authorization header."""
        from server.services.auth.dependencies import _extract_token

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="header_token_123"
        )

        token = _extract_token(mock_request, credentials)

        assert token == "header_token_123"

    def test_extract_token_from_cookie(self):
        """Test extracting token from cookie when header is not present."""
        from server.services.auth.dependencies import _extract_token

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = "cookie_token_456"

        with patch("server.services.auth.dependencies.settings") as mock_settings:
            mock_settings.access_token_cookie = "orbitx_access"
            token = _extract_token(mock_request, None)

        assert token == "cookie_token_456"
        mock_request.cookies.get.assert_called_once_with("orbitx_access")

    def test_extract_token_header_priority(self):
        """Test that Authorization header takes priority over cookie."""
        from server.services.auth.dependencies import _extract_token

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = "cookie_token"
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="header_token"
        )

        token = _extract_token(mock_request, credentials)

        assert token == "header_token"
        # Cookie should not be checked when header is present
        mock_request.cookies.get.assert_not_called()

    def test_extract_token_none_when_missing(self):
        """Test that None is returned when no token is available."""
        from server.services.auth.dependencies import _extract_token

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None

        with patch("server.services.auth.dependencies.settings") as mock_settings:
            mock_settings.access_token_cookie = "orbitx_access"
            token = _extract_token(mock_request, None)

        assert token is None


class TestGetCurrentUser:
    """Tests for get_current_user dependency."""

    @pytest.fixture
    def mock_settings(self):
        """Mock settings for token verification."""
        with patch("server.services.auth.dependencies.settings") as mock:
            mock.access_token_cookie = "orbitx_access"
            yield mock

    @pytest.fixture
    def mock_decode_token(self):
        """Mock decode_access_token function."""
        with patch("server.services.auth.dependencies.decode_access_token") as mock:
            yield mock

    @pytest.fixture
    def mock_get_user_by_id(self):
        """Mock get_user_by_id function."""
        with patch("server.services.auth.dependencies.get_user_by_id") as mock:
            yield mock

    @pytest.fixture
    def sample_user(self):
        """Sample user for tests."""
        return UserInDB(
            id="user_123",
            email="test@example.com",
            name="Test User",
            picture="https://example.com/avatar.png",
            role="user",
            is_active=True,
        )

    def test_get_current_user_success(
        self, mock_settings, mock_decode_token, mock_get_user_by_id, sample_user
    ):
        """Test successful user retrieval."""
        from server.services.auth.dependencies import get_current_user

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_decode_token.return_value = {
            "sub": "user_123",
            "email": "test@example.com",
        }
        mock_get_user_by_id.return_value = sample_user

        user = get_current_user(mock_request, credentials)

        assert user == sample_user
        mock_decode_token.assert_called_once_with("valid_token")
        mock_get_user_by_id.assert_called_once_with("user_123")

    def test_get_current_user_no_token(self, mock_settings):
        """Test that 401 is raised when no token is provided."""
        from server.services.auth.dependencies import get_current_user

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(mock_request, None)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"

    def test_get_current_user_invalid_token(self, mock_settings, mock_decode_token):
        """Test that 401 is raised for invalid token."""
        from server.services.auth.dependencies import get_current_user

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="invalid_token"
        )
        mock_decode_token.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(mock_request, credentials)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid or expired token"

    def test_get_current_user_missing_sub_claim(self, mock_settings, mock_decode_token):
        """Test that 401 is raised when token has no sub claim."""
        from server.services.auth.dependencies import get_current_user

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_decode_token.return_value = {"email": "test@example.com"}  # No "sub"

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(mock_request, credentials)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Invalid token: missing user ID"

    def test_get_current_user_user_not_found(
        self, mock_settings, mock_decode_token, mock_get_user_by_id
    ):
        """Test that 401 is raised when user is not found in database."""
        from server.services.auth.dependencies import get_current_user

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_decode_token.return_value = {
            "sub": "deleted_user",
            "email": "deleted@example.com",
        }
        mock_get_user_by_id.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(mock_request, credentials)

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "User not found"

    def test_get_current_user_inactive_user(
        self, mock_settings, mock_decode_token, mock_get_user_by_id
    ):
        """Test that 403 is raised for inactive user."""
        from server.services.auth.dependencies import get_current_user

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_decode_token.return_value = {
            "sub": "inactive_user",
            "email": "inactive@example.com",
        }
        inactive_user = UserInDB(
            id="inactive_user",
            email="inactive@example.com",
            name="Inactive User",
            role="user",
            is_active=False,
        )
        mock_get_user_by_id.return_value = inactive_user

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(mock_request, credentials)

        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "User account is disabled"

    def test_get_current_user_from_cookie(
        self, mock_settings, mock_decode_token, mock_get_user_by_id, sample_user
    ):
        """Test that token can be retrieved from cookie."""
        from server.services.auth.dependencies import get_current_user

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = "cookie_token"
        mock_decode_token.return_value = {
            "sub": "user_123",
            "email": "test@example.com",
        }
        mock_get_user_by_id.return_value = sample_user

        user = get_current_user(mock_request, None)

        assert user == sample_user
        mock_decode_token.assert_called_once_with("cookie_token")


class TestGetCurrentUserOptional:
    """Tests for get_current_user_optional dependency."""

    @pytest.fixture
    def mock_settings(self):
        """Mock settings for token verification."""
        with patch("server.services.auth.dependencies.settings") as mock:
            mock.access_token_cookie = "orbitx_access"
            yield mock

    @pytest.fixture
    def mock_decode_token(self):
        """Mock decode_access_token function."""
        with patch("server.services.auth.dependencies.decode_access_token") as mock:
            yield mock

    @pytest.fixture
    def mock_get_user_by_id(self):
        """Mock get_user_by_id function."""
        with patch("server.services.auth.dependencies.get_user_by_id") as mock:
            yield mock

    @pytest.fixture
    def sample_user(self):
        """Sample user for tests."""
        return UserInDB(
            id="user_123",
            email="test@example.com",
            name="Test User",
            picture="https://example.com/avatar.png",
            role="user",
            is_active=True,
        )

    def test_get_current_user_optional_with_valid_token(
        self, mock_settings, mock_decode_token, mock_get_user_by_id, sample_user
    ):
        """Test successful optional user retrieval."""
        from server.services.auth.dependencies import get_current_user_optional

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_decode_token.return_value = {
            "sub": "user_123",
            "email": "test@example.com",
        }
        mock_get_user_by_id.return_value = sample_user

        user = get_current_user_optional(mock_request, credentials)

        assert user == sample_user

    def test_get_current_user_optional_no_token(self, mock_settings):
        """Test that None is returned when no token is provided."""
        from server.services.auth.dependencies import get_current_user_optional

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None

        user = get_current_user_optional(mock_request, None)

        assert user is None

    def test_get_current_user_optional_invalid_token(
        self, mock_settings, mock_decode_token
    ):
        """Test that None is returned for invalid token."""
        from server.services.auth.dependencies import get_current_user_optional

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="invalid_token"
        )
        mock_decode_token.return_value = None

        user = get_current_user_optional(mock_request, credentials)

        assert user is None

    def test_get_current_user_optional_missing_sub(
        self, mock_settings, mock_decode_token
    ):
        """Test that None is returned when token has no sub claim."""
        from server.services.auth.dependencies import get_current_user_optional

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_decode_token.return_value = {"email": "test@example.com"}  # No "sub"

        user = get_current_user_optional(mock_request, credentials)

        assert user is None

    def test_get_current_user_optional_user_not_found(
        self, mock_settings, mock_decode_token, mock_get_user_by_id
    ):
        """Test that None is returned when user is not found."""
        from server.services.auth.dependencies import get_current_user_optional

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_decode_token.return_value = {
            "sub": "deleted_user",
            "email": "deleted@example.com",
        }
        mock_get_user_by_id.return_value = None

        user = get_current_user_optional(mock_request, credentials)

        assert user is None
