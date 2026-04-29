"""
Connection service with multi-tenancy support.
All operations automatically use the current user from context.
"""

from common.database.mongodb import database, find_many, find_one
from common.model.connection import ConnectionItem
from server.configs.config import settings
from server.services.auth.context import get_current_user


async def get_all_connections() -> list[ConnectionItem]:
    """Get all connections owned by the current user."""
    user = get_current_user()
    return await find_many(
        settings.connection_collection, {"user_id": user.id}, ConnectionItem
    )


async def get_connection(connection_id: str) -> ConnectionItem | None:
    """Get a specific connection with ownership verification."""
    user = get_current_user()
    return await find_one(
        settings.connection_collection,
        {"_id": connection_id, "user_id": user.id},
        ConnectionItem,
    )


async def delete_connection(connection_id: str) -> bool:
    """Delete a connection with ownership verification."""
    user = get_current_user()
    result = await database[settings.connection_collection].delete_one(
        {"_id": connection_id, "user_id": user.id}
    )
    return result.deleted_count > 0
