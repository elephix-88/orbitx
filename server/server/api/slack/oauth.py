from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from loguru import logger

from common.model.connection import ConnectionNamePayload
from common.model.user import UserInDB
from server.configs.config import settings
from server.middleware import limiter
from server.models.slack import SlackAuthorizeResponse, SlackChannelsResponse
from server.services.auth.context import get_current_user
from server.services.auth.dependencies import get_current_user as get_current_user_dep
from server.services.exceptions import ConnectionNotFoundError, ExternalAPIError
from server.services.slack.channels import list_slack_channels
from server.services.slack.oauth import (
    build_slack_oauth_url,
    save_slack_connection_to_mongo,
)
from server.services.utils import generate_uuid

router = APIRouter(prefix="/api/slack", tags=["slack"])


@router.post("/authorize", response_model=SlackAuthorizeResponse)
@limiter.limit(settings.rate_limit_auth)
async def authorize_slack(
    request: Request,
    payload: ConnectionNamePayload,
) -> SlackAuthorizeResponse:
    """Generate a Slack OAuth authorization URL."""
    user = get_current_user()
    connection_id = generate_uuid()

    oauth_url = build_slack_oauth_url(
        connection_id=connection_id,
        connection_name=payload.connection_name,
        user_id=user.id,
    )

    return SlackAuthorizeResponse(oauth_url=oauth_url)


@router.get("/callback")
async def slack_oauth_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    """Handle the Slack OAuth callback, exchange code for token, store connection."""
    if error:
        logger.warning(f"Slack OAuth declined by user: {error}")
        redirect_url = (
            f"{settings.frontend_oauth_success_url}?provider=slack&error={error}"
        )
        return RedirectResponse(url=redirect_url)

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state")

    try:
        await save_slack_connection_to_mongo(code=code, state=state)
        redirect_url = f"{settings.frontend_oauth_success_url}?provider=slack"
        return RedirectResponse(url=redirect_url)
    except Exception as error:
        logger.error(f"Slack OAuth callback failed: {error}")
        error_url = (
            f"{settings.frontend_oauth_success_url}"
            "?provider=slack&error=Authentication+failed"
        )
        return RedirectResponse(url=error_url)


@router.get("/channels", response_model=SlackChannelsResponse)
async def list_channels_endpoint(
    connection_id: str = Query(..., description="Slack connection ID"),
    _current_user: UserInDB = Depends(get_current_user_dep),
) -> SlackChannelsResponse:
    """List Slack channels the bot can post to."""
    try:
        channels = await list_slack_channels(connection_id)
        return SlackChannelsResponse(channels=channels)
    except ConnectionNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ExternalAPIError as error:
        raise HTTPException(status_code=502, detail=error.message) from error
