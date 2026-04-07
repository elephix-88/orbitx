"""Connection utilities for loading and validating service connections."""

from pydantic import BaseModel

from common.database.mongodb import find_one
from common.model.connection import ConnectionItem as Connection
from engine.configs.config import settings
from engine.exceptions import ConnectionException


async def get_connection_token[T: BaseModel](
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
    connection_info = await find_one(
        settings.connections_collection, connection_id, Connection
    )
    if not connection_info:
        raise ConnectionException(
            f"Connection info not found for connection_id: {connection_id}",
            service_name=service_name,
            connection_id=connection_id,
        )
    if not connection_info.params:
        raise ConnectionException(
            f"Connection info not found for connection_id: {connection_id}",
            service_name=service_name,
            connection_id=connection_id,
        )

    return token_model(**connection_info.params)
