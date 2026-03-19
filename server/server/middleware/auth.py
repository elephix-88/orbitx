"""
Authentication middleware that sets user context for each request.

This middleware:
1. Extracts JWT token from Authorization header OR HttpOnly cookie
2. Validates the token and fetches user
3. Sets user in request context (accessible anywhere)
4. Cleans up context after request completes
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from server.configs.config import settings
from server.services.auth.context import clear_current_user, set_current_user
from server.services.auth.service import decode_access_token, get_user_by_id


class AuthContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that automatically sets the authenticated user in request context.

    Supports two authentication methods:
    1. Authorization header: Bearer <token>
    2. HttpOnly cookie: orbitx_access

    After this middleware runs, any code can access the current user via:
        from services.auth.context import get_current_user
        user = get_current_user()
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        token = None

        # Try Authorization header first (for backwards compatibility)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

        # Fall back to HttpOnly cookie
        if not token:
            token = request.cookies.get(settings.access_token_cookie)

        if token:
            # Decode and validate token
            payload = decode_access_token(token)

            if payload:
                user_id = payload.get("sub")
                if user_id:
                    # Fetch user from database
                    user = await get_user_by_id(user_id)
                    if user and user.is_active:
                        # Set user in context for this request
                        set_current_user(user)

        try:
            # Process the request
            response = await call_next(request)
            return response
        finally:
            # Always clean up context after request
            clear_current_user()
