from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from common.model.user import (
    GoogleAuthRequest,
    TokenResponse,
    UserInDB,
    UserResponse,
)
from server.configs.config import settings
from server.middleware import limiter
from server.services.auth import (
    authenticate_google_user,
    create_token_pair,
    decode_refresh_token,
    get_user_by_id,
    user_to_response,
)
from server.services.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set HttpOnly cookies for authentication tokens."""
    is_secure = settings.env == "PROD"
    same_site: Literal["lax", "strict", "none"] = (
        "strict" if settings.env == "PROD" else "lax"
    )

    # Access token - short-lived HttpOnly cookie
    response.set_cookie(
        key=settings.access_token_cookie,
        value=access_token,
        httponly=True,
        secure=is_secure,
        samesite=same_site,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )

    # Refresh token - longer-lived HttpOnly cookie
    response.set_cookie(
        key=settings.refresh_token_cookie,
        value=refresh_token,
        httponly=True,
        secure=is_secure,
        samesite=same_site,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/api/auth",  # Only sent to auth endpoints
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear authentication cookies."""
    response.delete_cookie(key=settings.access_token_cookie, path="/")
    response.delete_cookie(key=settings.refresh_token_cookie, path="/api/auth")


@router.post("/google", response_model=TokenResponse)
@limiter.limit(settings.rate_limit_auth)
async def google_auth(request: Request, response: Response, auth_request: GoogleAuthRequest):
    """Authenticate with Google OAuth credential."""
    user = await authenticate_google_user(auth_request.credential)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed",
        )

    access_token, refresh_token = create_token_pair(user.id, user.email)

    # Set HttpOnly cookies
    set_auth_cookies(response, access_token, refresh_token)

    # Also return token in response for backwards compatibility
    # Frontend can choose to use cookies or localStorage
    return TokenResponse(
        access_token=access_token,
        user=user_to_response(user),
    )


@router.post("/refresh")
@limiter.limit(settings.rate_limit_auth)
async def refresh_token(request: Request, response: Response):
    """Refresh access token using refresh token from cookie."""
    refresh_token_cookie = request.cookies.get(settings.refresh_token_cookie)

    if not refresh_token_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    payload = decode_refresh_token(refresh_token_cookie)
    if not payload:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    if not user_id:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload",
        )

    user = await get_user_by_id(user_id)

    if not user or not user.is_active:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new token pair
    new_access_token, new_refresh_token = create_token_pair(user.id, user.email)
    set_auth_cookies(response, new_access_token, new_refresh_token)

    return {
        "access_token": new_access_token,
        "user": user_to_response(user),
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: UserInDB = Depends(get_current_user),
):
    """Get current authenticated user."""
    return user_to_response(user)


@router.post("/logout")
async def logout(response: Response):
    """Logout user by clearing auth cookies."""
    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}
