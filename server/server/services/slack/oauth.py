import urllib.parse
from datetime import datetime

import httpx
from loguru import logger
from pydantic import BaseModel

from common.database.mongodb import database
from common.model.connection import ConnectionItem, ConnectionStatus, ConnectionType
from server.configs.config import settings
from server.services.exceptions import ExternalAPIError
from server.services.oauth.utils import make_state, verify_state

SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access"
SLACK_SCOPES = "chat:write,channels:read,groups:read"


class SlackTokenResponse(BaseModel):
    access_token: str
    token_type: str
    team: dict[str, str] = {}
    bot_user_id: str = ""


def build_slack_oauth_url(
    connection_id: str,
    connection_name: str,
    user_id: str,
) -> str:
    """Build the Slack OAuth authorization URL."""
    state = make_state(
        connection_type=ConnectionType.DESTINATION.value,
        connection_id=connection_id,
        service_name="Slack",
        connection_name=connection_name,
        user_id=user_id,
    )

    params = {
        "client_id": settings.slack_client_id,
        "redirect_uri": settings.slack_redirect_uri,
        "scope": SLACK_SCOPES,
        "state": state,
    }

    return f"{SLACK_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"


async def exchange_code_for_token(code: str) -> SlackTokenResponse:
    """Exchange an OAuth code for a Slack bot token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            SLACK_TOKEN_URL,
            data={
                "client_id": settings.slack_client_id,
                "client_secret": settings.slack_client_secret,
                "redirect_uri": settings.slack_redirect_uri,
                "code": code,
            },
        )
        response.raise_for_status()
        data = response.json()

    if not data.get("ok"):
        error = data.get("error", "unknown_error")
        logger.error(f"Slack token exchange failed: {error}")
        raise ExternalAPIError("Slack", f"Token exchange failed: {error}")

    return SlackTokenResponse(
        access_token=data["access_token"],
        token_type=data.get("token_type", "bot"),
        team=data.get("team", {}),
        bot_user_id=data.get("bot_user_id", ""),
    )


async def save_slack_connection_to_mongo(code: str, state: str) -> str:
    """Exchange code, verify state, and persist the Slack connection.

    Returns the connection ID.
    """
    verified = verify_state(state)
    connection_id = verified["connection_id"]
    user_id = verified["user_id"]
    connection_name = verified["connection_name"]

    token_data = await exchange_code_for_token(code)

    bot_token = token_data.access_token
    team = token_data.team
    team_name = team.get("name", "")

    connection_item = ConnectionItem(
        _id=connection_id,
        user_id=user_id,
        connection_name=connection_name,
        service_name="Slack",
        connection_type=ConnectionType.DESTINATION.value,
        created_at=datetime.now(),
        status=ConnectionStatus.CONNECTED.value,
        params={
            "bot_token": bot_token,
            "team_id": team.get("id", ""),
            "team_name": team_name,
        },
    )

    doc = connection_item.model_dump(by_alias=True, exclude_none=True)
    if "_id" not in doc:
        raise ValueError("ConnectionItem must have an _id before inserting")
    await database[settings.connection_collection].insert_one(doc)

    logger.info(
        f"Slack connection saved: connection_id={connection_id} "
        f"team={team_name} user={user_id}"
    )
    return connection_id
