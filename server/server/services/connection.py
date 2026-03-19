"""
Connection service with multi-tenancy support.
All operations automatically use the current user from context.
"""

from common.database import get_mongodb
from common.model.connection import ConnectionItem
from server.configs.config import settings
from server.services.auth.context import get_current_user


async def get_all_connections() -> list[ConnectionItem]:
    """Get all connections owned by the current user."""
    user = get_current_user()
    docs = await get_mongodb().get_all_documents(
        collection_name=settings.connection_collection,
        query={"user_id": user.id},
    )
    return [ConnectionItem(**d) for d in docs]


async def get_connection(connection_id: str) -> ConnectionItem | None:
    """Get a specific connection with ownership verification."""
    user = get_current_user()
    return await get_mongodb().get_document(
        collection_name=settings.connection_collection,
        query={"_id": connection_id, "user_id": user.id},
        model_cls=ConnectionItem,
    )


async def delete_connection(connection_id: str) -> bool:
    """Delete a connection with ownership verification."""
    user = get_current_user()
    return await get_mongodb().delete_document(
        collection_name=settings.connection_collection,
        query={"_id": connection_id, "user_id": user.id},
    )
