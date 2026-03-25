"""Connection utilities for loading and validating service connections."""

from typing import TypeVar

from pydantic import BaseModel

from engine.configs.config import settings
from engine.exceptions import ConnectionException
from common.database.mongodb import get_mongodb
from common.model.connection import ConnectionItem as Connection

T = TypeVar("T", bound=BaseModel)


async def get_connection_token(
    connection_id: str,
    service_name: str,
    token_model: type[T],
) -> T:
    """Load connection from MongoDB and validate token.

    Args:
        connection_id: The connection ID to look up
        service_name: Service name for error messages
        token_model: Pydantic model class to validate the token params

    Returns:
        Validated token model instance

    Raises:
        ConnectionException: If connection not found or params missing
    """
    mongodb = get_mongodb()
    connection_info = await mongodb.get_document(
        settings.connections_collection, {"_id": connection_id}, Connection
    )
    if not connection_info or not connection_info.params:
        raise ConnectionException(
            f"Connection info not found for connection_id: {connection_id}",
            service_name=service_name,
            connection_id=connection_id,
        )

    return token_model(**connection_info.params)
