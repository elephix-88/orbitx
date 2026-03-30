"""Tests for auth context module."""
import pytest
from fastapi import HTTPException

from common.model.user import UserInDB


class TestAuthContext:
    """Tests for auth context functions."""

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

    def test_set_and_get_current_user(self, sample_user):
        """Test setting and getting current user."""
        from server.services.auth.context import (
            clear_current_user,
            get_current_user,
            set_current_user,
        )

        # Clear any existing user first
        clear_current_user()

        # Set user
        set_current_user(sample_user)

        # Get user
        user = get_current_user()

        assert user == sample_user
        assert user.id == "user_123"
        assert user.email == "test@example.com"

        # Cleanup
        clear_current_user()

    def test_get_current_user_not_authenticated(self):
        """Test that HTTPException is raised when not authenticated."""
        from server.services.auth.context import clear_current_user, get_current_user

        # Ensure no user is set
        clear_current_user()

        with pytest.raises(HTTPException) as exc_info:
            get_current_user()

        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"

    def test_get_current_user_optional_with_user(self, sample_user):
        """Test optional user retrieval when authenticated."""
        from server.services.auth.context import (
            clear_current_user,
            get_current_user_optional,
            set_current_user,
        )

        clear_current_user()
        set_current_user(sample_user)

        user = get_current_user_optional()

        assert user == sample_user

        # Cleanup
        clear_current_user()

    def test_get_current_user_optional_without_user(self):
        """Test optional user retrieval when not authenticated."""
        from server.services.auth.context import (
            clear_current_user,
            get_current_user_optional,
        )

        clear_current_user()

        user = get_current_user_optional()

        assert user is None

    def test_clear_current_user(self, sample_user):
        """Test clearing the current user."""
        from server.services.auth.context import (
            clear_current_user,
            get_current_user_optional,
            set_current_user,
        )

        set_current_user(sample_user)
        assert get_current_user_optional() is not None

        clear_current_user()
        assert get_current_user_optional() is None

    def test_context_isolation(self, sample_user):
        """Test that context is properly isolated."""
        from server.services.auth.context import (
            clear_current_user,
            get_current_user_optional,
            set_current_user,
        )

        # Set a user
        clear_current_user()
        set_current_user(sample_user)
        assert get_current_user_optional() == sample_user

        # Create a different user
        other_user = UserInDB(
            id="other_user_456",
            email="other@example.com",
            name="Other User",
            role="admin",
            is_active=True,
        )

        # Replace the user
        set_current_user(other_user)
        current = get_current_user_optional()

        assert current.id == "other_user_456"
        assert current.email == "other@example.com"

        # Cleanup
        clear_current_user()
