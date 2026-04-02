"""
Security middleware for headers and CSRF protection.
"""
import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from server.configs.config import settings

# CSRF constants
CSRF_COOKIE_NAME = "orbitx_csrf"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_EXCLUDED_PATHS = {
    "/oauth2callback",
    "/api/facebook/oauth2callback",
    "/api/tiktok/oauth2callback",
    "/api/auth/google",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/healthz",
    "/readyz",
}


def _set_csrf_cookie(response: Response, token: str) -> None:
    """Set CSRF cookie with appropriate security settings."""
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        httponly=False,  # Must be readable by JavaScript
        secure=settings.env == "PROD",
        samesite="strict" if settings.env == "PROD" else "lax",
        max_age=86400,
        path="/",
    )


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to all responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"

        if settings.env == "PROD":
            response.headers[
                "Strict-Transport-Security"
            ] = "max-age=31536000; includeSubDomains"

        return response


class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection using double-submit cookie pattern."""

    async def dispatch(self, request: Request, call_next) -> Response:
        if not getattr(settings, "csrf_enabled", True):
            return await call_next(request)

        csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)

        # Safe methods: just ensure cookie exists
        if request.method in CSRF_SAFE_METHODS:
            response = await call_next(request)
            if not csrf_cookie:
                _set_csrf_cookie(response, secrets.token_urlsafe(32))
            return response

        # Protected methods: validate token if cookie exists
        path = request.url.path
        is_excluded = any(path.startswith(p) for p in CSRF_EXCLUDED_PATHS)

        if not is_excluded and csrf_cookie:
            csrf_header = request.headers.get(CSRF_HEADER_NAME)
            if not csrf_header or csrf_header != csrf_cookie:
                origin = request.headers.get("origin", "")
                response = Response(
                    content='{"detail": "CSRF token validation failed"}',
                    status_code=403,
                    media_type="application/json",
                )
                if origin in getattr(settings, "cors_origins", []):
                    response.headers["Access-Control-Allow-Origin"] = origin
                    response.headers["Access-Control-Allow-Credentials"] = "true"
                return response

        response = await call_next(request)

        # Set cookie if it doesn't exist
        if not csrf_cookie:
            _set_csrf_cookie(response, secrets.token_urlsafe(32))

        return response
