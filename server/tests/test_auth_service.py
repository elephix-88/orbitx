"""Tests for auth service module."""
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import jwt
import pytest
from common.model.user import UserInDB, UserRole


class TestPasswordFunctions:
    """Tests for password hashing and verification."""

    def test_hash_password(self):
        """Test that password hashing works correctly."""
        from server.services.auth.service import hash_password

        password = "test_password_123"
        hashed = hash_password(password)

        assert hashed != password
        assert len(hashed) > 0
        # bcrypt hashes start with $2b$
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self):
        """Test that correct password verification returns True."""
        from server.services.auth.service import hash_password, verify_password

        password = "test_password_123"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test that incorrect password verification returns False."""
        from server.services.auth.service import hash_password, verify_password

        password = "test_password_123"
        wrong_password = "wrong_password"
        hashed = hash_password(password)

        assert verify_password(wrong_password, hashed) is False


class TestTokenFunctions:
    """Tests for JWT token creation and decoding."""

    @pytest.fixture
    def mock_settings(self):
        """Mock settings for token tests."""
        with patch("server.services.auth.service.settings") as mock:
            mock.jwt_secret = "test_secret_key_12345"
            mock.jwt_algorithm = "HS256"
            mock.access_token_expire_minutes = 30
            mock.refresh_token_expire_days = 7
            yield mock

    def test_create_access_token(self, mock_settings):
        """Test access token creation."""
        from server.services.auth.service import create_access_token

        user_id = "user_123"
        email = "test@example.com"

        token = create_access_token(user_id, email)

        assert token is not None
        assert isinstance(token, str)

        # Decode and verify
        payload = jwt.decode(token, "test_secret_key_12345", algorithms=["HS256"])
        assert payload["sub"] == user_id
        assert payload["email"] == email
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload

    def test_create_refresh_token(self, mock_settings):
        """Test refresh token creation."""
        from server.services.auth.service import create_refresh_token

        user_id = "user_123"

        token = create_refresh_token(user_id)

        assert token is not None
        assert isinstance(token, str)

        # Decode and verify
        payload = jwt.decode(token, "test_secret_key_12345", algorithms=["HS256"])
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"
        assert "jti" in payload  # unique token id
        assert "exp" in payload
        assert "iat" in payload

    def test_create_token_pair(self, mock_settings):
        """Test creating both access and refresh tokens."""
        from server.services.auth.service import create_token_pair

        user_id = "user_123"
        email = "test@example.com"

        access_token, refresh_token = create_token_pair(user_id, email)

        assert access_token is not None
        assert refresh_token is not None
        assert access_token != refresh_token

    def test_decode_access_token_valid(self, mock_settings):
        """Test decoding a valid access token."""
        from server.services.auth.service import create_access_token, decode_access_token

        user_id = "user_123"
        email = "test@example.com"

        token = create_access_token(user_id, email)
        payload = decode_access_token(token)

        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["email"] == email

    def test_decode_access_token_invalid(self, mock_settings):
        """Test decoding an invalid access token returns None."""
        from server.services.auth.service import decode_access_token

        invalid_token = "invalid.token.here"
        payload = decode_access_token(invalid_token)

        assert payload is None

    def test_decode_access_token_expired(self, mock_settings):
        """Test decoding an expired access token returns None."""
        from server.services.auth.service import decode_access_token

        # Create an expired token
        payload = {
            "sub": "user_123",
            "email": "test@example.com",
            "exp": datetime.now(UTC) - timedelta(hours=1),
            "iat": datetime.now(UTC) - timedelta(hours=2),
            "type": "access",
        }
        expired_token = jwt.encode(payload, "test_secret_key_12345", algorithm="HS256")

        result = decode_access_token(expired_token)
        assert result is None

    def test_decode_refresh_token_valid(self, mock_settings):
        """Test decoding a valid refresh token."""
        from server.services.auth.service import create_refresh_token, decode_refresh_token

        user_id = "user_123"

        token = create_refresh_token(user_id)
        payload = decode_refresh_token(token)

        assert payload is not None
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"

    def test_decode_refresh_token_with_access_token(self, mock_settings):
        """Test that decoding access token as refresh returns None."""
        from server.services.auth.service import create_access_token, decode_refresh_token

        user_id = "user_123"
        email = "test@example.com"

        access_token = create_access_token(user_id, email)
        payload = decode_refresh_token(access_token)

        assert payload is None

    def test_decode_access_token_with_refresh_token(self, mock_settings):
        """Test that decoding refresh token as access returns None."""
        from server.services.auth.service import create_refresh_token, decode_access_token

        user_id = "user_123"

        refresh_token = create_refresh_token(user_id)
        payload = decode_access_token(refresh_token)

        assert payload is None


class TestUserFunctions:
    """Tests for user database operations."""

    @pytest.fixture
    def mock_mongodb(self):
        """Mock MongoDB client."""
        with patch("server.services.auth.service.mongodb_client") as mock:
            yield mock

    @pytest.fixture
    def mock_settings(self):
        """Mock settings."""
        with patch("server.services.auth.service.settings") as mock:
            mock.users_collection = "users"
            mock.jwt_secret = "test_secret_key_12345"
            mock.jwt_algorithm = "HS256"
            mock.access_token_expire_minutes = 30
            mock.refresh_token_expire_days = 7
            yield mock

    @pytest.fixture
    def sample_user_dict(self):
        """Sample user document from MongoDB."""
        return {
            "_id": "user_123",
            "email": "test@example.com",
            "name": "Test User",
            "picture": "https://example.com/avatar.png",
            "role": "user",
            "is_active": True,
            "hashed_password": "$2b$12$abcdefghijklmnopqrstuv",
            "google_id": "google_123",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }

    def test_get_user_by_email_found(
        self, mock_mongodb, mock_settings, sample_user_dict
    ):
        """Test getting user by email when user exists."""
        from server.services.auth.service import get_user_by_email

        mock_mongodb.get_all_documents.return_value = [sample_user_dict]

        user = get_user_by_email("test@example.com")

        assert user is not None
        assert isinstance(user, UserInDB)
        assert user.email == "test@example.com"
        mock_mongodb.get_all_documents.assert_called_once_with(
            "users", {"email": "test@example.com"}
        )

    def test_get_user_by_email_not_found(self, mock_mongodb, mock_settings):
        """Test getting user by email when user doesn't exist."""
        from server.services.auth.service import get_user_by_email

        mock_mongodb.get_all_documents.return_value = []

        user = get_user_by_email("notfound@example.com")

        assert user is None

    def test_get_user_by_id_found(self, mock_mongodb, mock_settings, sample_user_dict):
        """Test getting user by ID when user exists."""
        from server.services.auth.service import get_user_by_id

        mock_mongodb.get_document.return_value = sample_user_dict

        user = get_user_by_id("user_123")

        assert user is not None
        assert isinstance(user, UserInDB)
        assert user.id == "user_123"
        mock_mongodb.get_document.assert_called_once_with("users", {"_id": "user_123"})

    def test_get_user_by_id_not_found(self, mock_mongodb, mock_settings):
        """Test getting user by ID when user doesn't exist."""
        from server.services.auth.service import get_user_by_id

        mock_mongodb.get_document.return_value = None

        user = get_user_by_id("nonexistent_id")

        assert user is None

    def test_get_user_by_google_id_found(
        self, mock_mongodb, mock_settings, sample_user_dict
    ):
        """Test getting user by Google ID when user exists."""
        from server.services.auth.service import get_user_by_google_id

        mock_mongodb.get_all_documents.return_value = [sample_user_dict]

        user = get_user_by_google_id("google_123")

        assert user is not None
        assert user.google_id == "google_123"
        mock_mongodb.get_all_documents.assert_called_once_with(
            "users", {"google_id": "google_123"}
        )

    def test_get_user_by_google_id_not_found(self, mock_mongodb, mock_settings):
        """Test getting user by Google ID when user doesn't exist."""
        from server.services.auth.service import get_user_by_google_id

        mock_mongodb.get_all_documents.return_value = []

        user = get_user_by_google_id("nonexistent_google_id")

        assert user is None

    def test_create_user_with_password(self, mock_mongodb, mock_settings):
        """Test creating a user with password."""
        from server.services.auth.service import create_user

        mock_mongodb.insert_document.return_value = "new_user_id"

        user = create_user(
            email="newuser@example.com",
            name="New User",
            password="secure_password_123",
        )

        assert user is not None
        assert isinstance(user, UserInDB)
        assert user.email == "newuser@example.com"
        assert user.name == "New User"
        assert user.hashed_password is not None
        assert user.role == UserRole.USER
        assert user.is_active is True
        mock_mongodb.insert_document.assert_called_once()

    def test_create_user_with_google_id(self, mock_mongodb, mock_settings):
        """Test creating a user with Google OAuth."""
        from server.services.auth.service import create_user

        mock_mongodb.insert_document.return_value = "new_user_id"

        user = create_user(
            email="googleuser@example.com",
            name="Google User",
            google_id="google_456",
            picture="https://example.com/picture.png",
        )

        assert user is not None
        assert user.email == "googleuser@example.com"
        assert user.google_id == "google_456"
        assert user.picture == "https://example.com/picture.png"
        assert user.hashed_password is None

    def test_authenticate_user_success(self, mock_mongodb, mock_settings):
        """Test authenticating user with correct credentials."""
        from server.services.auth.service import authenticate_user, hash_password

        password = "correct_password"
        hashed = hash_password(password)
        user_dict = {
            "_id": "user_123",
            "email": "test@example.com",
            "name": "Test User",
            "hashed_password": hashed,
            "role": "user",
            "is_active": True,
        }
        mock_mongodb.get_all_documents.return_value = [user_dict]

        user = authenticate_user("test@example.com", password)

        assert user is not None
        assert user.email == "test@example.com"

    def test_authenticate_user_wrong_password(self, mock_mongodb, mock_settings):
        """Test authenticating user with wrong password."""
        from server.services.auth.service import authenticate_user, hash_password

        hashed = hash_password("correct_password")
        user_dict = {
            "_id": "user_123",
            "email": "test@example.com",
            "name": "Test User",
            "hashed_password": hashed,
            "role": "user",
            "is_active": True,
        }
        mock_mongodb.get_all_documents.return_value = [user_dict]

        user = authenticate_user("test@example.com", "wrong_password")

        assert user is None

    def test_authenticate_user_not_found(self, mock_mongodb, mock_settings):
        """Test authenticating non-existent user."""
        from server.services.auth.service import authenticate_user

        mock_mongodb.get_all_documents.return_value = []

        user = authenticate_user("nonexistent@example.com", "password")

        assert user is None

    def test_authenticate_user_no_password(self, mock_mongodb, mock_settings):
        """Test authenticating user that has no password (OAuth only)."""
        from server.services.auth.service import authenticate_user

        user_dict = {
            "_id": "user_123",
            "email": "oauth@example.com",
            "name": "OAuth User",
            "hashed_password": None,
            "role": "user",
            "is_active": True,
        }
        mock_mongodb.get_all_documents.return_value = [user_dict]

        user = authenticate_user("oauth@example.com", "any_password")

        assert user is None


class TestGoogleAuth:
    """Tests for Google OAuth authentication."""

    @pytest.fixture
    def mock_mongodb(self):
        """Mock MongoDB client."""
        with patch("server.services.auth.service.mongodb_client") as mock:
            yield mock

    @pytest.fixture
    def mock_get_mongodb(self):
        """Mock get_mongodb function."""
        with patch("server.services.auth.service.get_mongodb") as mock:
            mock_collection = MagicMock()
            mock.return_value.get_collection.return_value = mock_collection
            yield mock

    @pytest.fixture
    def mock_settings(self):
        """Mock settings."""
        with patch("server.services.auth.service.settings") as mock:
            mock.users_collection = "users"
            mock.orbitx_google_oauth_client_id = "test_client_id"
            mock.jwt_secret = "test_secret_key_12345"
            mock.jwt_algorithm = "HS256"
            mock.access_token_expire_minutes = 30
            mock.refresh_token_expire_days = 7
            yield mock

    @pytest.fixture
    def mock_google_id_token(self):
        """Mock Google id_token verification."""
        with patch("server.services.auth.service.id_token") as mock:
            yield mock

    def test_authenticate_google_user_new_user(
        self, mock_mongodb, mock_settings, mock_google_id_token
    ):
        """Test Google auth creating a new user."""
        from server.services.auth.service import authenticate_google_user

        mock_google_id_token.verify_oauth2_token.return_value = {
            "sub": "google_new_123",
            "email": "newgoogleuser@example.com",
            "name": "New Google User",
            "picture": "https://example.com/avatar.png",
        }
        # No existing user found
        mock_mongodb.get_all_documents.return_value = []
        mock_mongodb.insert_document.return_value = "new_user_id"

        user = authenticate_google_user("valid_credential_token")

        assert user is not None
        assert user.email == "newgoogleuser@example.com"
        assert user.google_id == "google_new_123"
        mock_mongodb.insert_document.assert_called_once()

    def test_authenticate_google_user_existing_by_google_id(
        self, mock_mongodb, mock_settings, mock_google_id_token
    ):
        """Test Google auth with existing user by Google ID."""
        from server.services.auth.service import authenticate_google_user

        existing_user = {
            "_id": "user_123",
            "email": "existing@example.com",
            "name": "Existing User",
            "google_id": "google_existing_123",
            "role": "user",
            "is_active": True,
        }
        mock_google_id_token.verify_oauth2_token.return_value = {
            "sub": "google_existing_123",
            "email": "existing@example.com",
            "name": "Existing User",
        }
        mock_mongodb.get_all_documents.return_value = [existing_user]

        user = authenticate_google_user("valid_credential_token")

        assert user is not None
        assert user.google_id == "google_existing_123"
        # Should not create new user
        mock_mongodb.insert_document.assert_not_called()

    def test_authenticate_google_user_link_existing_email(
        self, mock_mongodb, mock_get_mongodb, mock_settings, mock_google_id_token
    ):
        """Test Google auth linking to existing user by email."""
        from server.services.auth.service import authenticate_google_user

        existing_user = {
            "_id": "user_123",
            "email": "link@example.com",
            "name": "Link User",
            "google_id": None,  # No Google ID yet
            "role": "user",
            "is_active": True,
        }
        mock_google_id_token.verify_oauth2_token.return_value = {
            "sub": "google_link_123",
            "email": "link@example.com",
            "name": "Link User",
            "picture": "https://example.com/avatar.png",
        }
        # First call (by google_id) returns empty, second call (by email) returns user
        mock_mongodb.get_all_documents.side_effect = [[], [existing_user]]

        user = authenticate_google_user("valid_credential_token")

        assert user is not None
        assert user.google_id == "google_link_123"
        # Should update existing user with Google ID
        mock_get_mongodb.return_value.get_collection.return_value.update_one.assert_called_once()

    def test_authenticate_google_user_invalid_token(
        self, mock_mongodb, mock_settings, mock_google_id_token
    ):
        """Test Google auth with invalid token."""
        from server.services.auth.service import authenticate_google_user

        mock_google_id_token.verify_oauth2_token.side_effect = ValueError(
            "Invalid token"
        )

        user = authenticate_google_user("invalid_token")

        assert user is None


class TestUserToResponse:
    """Tests for user response conversion."""

    def test_user_to_response(self):
        """Test converting UserInDB to UserResponse."""
        from server.services.auth.service import user_to_response

        user = UserInDB(
            id="user_123",
            email="test@example.com",
            name="Test User",
            picture="https://example.com/avatar.png",
            role=UserRole.USER,
            is_active=True,
            hashed_password="hashed_pw",
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        response = user_to_response(user)

        assert response.id == user.id
        assert response.email == user.email
        assert response.name == user.name
        assert response.picture == user.picture
        assert response.role == user.role
        assert response.is_active == user.is_active
        # Should not include sensitive fields
        assert not hasattr(response, "hashed_password")

    def test_user_to_response_no_picture(self):
        """Test converting UserInDB without picture."""
        from server.services.auth.service import user_to_response

        user = UserInDB(
            id="user_123",
            email="test@example.com",
            name="Test User",
            picture=None,
            role=UserRole.USER,
            is_active=True,
            created_at=datetime.now(UTC),
        )

        response = user_to_response(user)

        assert response.picture is None
