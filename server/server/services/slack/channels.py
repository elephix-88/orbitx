import httpx
from loguru import logger

from common.database.mongodb import find_one
from common.model.connection import ConnectionItem
from server.configs.config import settings
from server.models.slack import SlackChannel
from server.services.auth.context import get_current_user
from server.services.exceptions import ConnectionNotFoundError, ExternalAPIError


async def list_slack_channels(connection_id: str) -> list[SlackChannel]:
    """List Slack channels the bot can post to, using the stored connection token."""
    user = get_current_user()

    connection = await find_one(
        settings.connection_collection,
        {"_id": connection_id, "user_id": user.id},
        ConnectionItem,
    )

    if connection is None:
        raise ConnectionNotFoundError(connection_id)

    bot_token = connection.params.get("bot_token")
    if not bot_token:
        raise ConnectionNotFoundError(connection_id)

    channels: list[SlackChannel] = []
    cursor = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            params: dict = {
                "types": "public_channel,private_channel",
                "exclude_archived": "true",
                "limit": 200,
            }
            if cursor:
                params["cursor"] = cursor

            response = await client.get(
                "https://slack.com/api/conversations.list",
                headers={"Authorization": f"Bearer {bot_token}"},
                params=params,
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("ok"):
                error = data.get("error", "unknown_error")
                logger.error(f"Slack conversations.list failed: {error}")
                raise ExternalAPIError(
                    "Slack",
                    f"conversations.list returned error: {error}",
                )

            for channel in data.get("channels", []):
                channels.append(SlackChannel(id=channel["id"], name=channel["name"]))

            next_cursor = data.get("response_metadata", {}).get("next_cursor")
            if not next_cursor:
                break
            cursor = next_cursor

    logger.info(
        f"Retrieved {len(channels)} Slack channels for connection {connection_id}"
    )
    return channels
