"""
Request-scoped user context for multi-tenancy.

This module provides a way to access the current authenticated user
from anywhere in the application without passing user_id explicitly.

Usage:
    from services.auth.context import get_current_user

    def some_service_function():
        user = get_current_user()  # Get user from context
        # Use user.id for queries
"""
from contextvars import ContextVar

from fastapi import HTTPException, status

from common.model.user import UserInDB

# Context variable that stores the current user per request
# This is thread-safe and isolated per async task/request
_current_user: ContextVar[UserInDB | None] = ContextVar("current_user", default=None)


def set_current_user(user: UserInDB) -> None:
    """
    Set the current user in the request context.
    Called by auth middleware when a valid token is found.
    """
    _current_user.set(user)


def get_current_user() -> UserInDB:
    """
    Get the current authenticated user from the request context.

    Raises:
        HTTPException: If no user is authenticated (401 Unauthorized)

    Returns:
        UserInDB: The authenticated user
    """
    user = _current_user.get()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_user_optional() -> UserInDB | None:
    """
    Get the current user if authenticated, otherwise None.
    Use this for routes that work with or without authentication.

    Returns:
        Optional[UserInDB]: The user if authenticated, None otherwise
    """
    return _current_user.get()


def clear_current_user() -> None:
    """
    Clear the current user from the context.
    Called by auth middleware after request completes.
    """
    _current_user.set(None)
