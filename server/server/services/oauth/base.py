"""
Base OAuth service with common patterns for all OAuth providers.

This module extracts common OAuth logic to reduce code duplication
between Google and Facebook OAuth implementations.
"""
import urllib.parse
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from loguru import logger

from common.database.mongodb import database, find_one
from common.model.connection import (
    ConnectionItem,
    ConnectionKey,
    ConnectionStatus,
    ServiceName,
)
from server.configs.config import settings
from server.services.oauth.utils import make_state


class BaseOAuthService(ABC):
    """Base class for OAuth services with common functionality."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider name (e.g., 'google', 'facebook')."""
        ...

    @property
    @abstractmethod
    def auth_url(self) -> str:
        """Return the OAuth authorization URL."""
        ...

    @property
    @abstractmethod
    def client_id(self) -> str:
        """Return the OAuth client ID."""
        ...

    @property
    @abstractmethod
    def redirect_uri(self) -> str:
        """Return the OAuth redirect URI."""
        ...

    @abstractmethod
    def get_scope_string(self, scope: str | list[str]) -> str:
        """Format scope for the provider (space-separated or comma-separated)."""
        ...

    @abstractmethod
    def get_additional_params(self) -> dict[str, str]:
        """Return provider-specific OAuth parameters."""
        ...

    def build_oauth_url(
        self,
        scope: str | list[str],
        connection_type: str,
        connection_id: str,
        service_name: str,
        connection_name: str,
        user_id: str | None = None,
    ) -> str:
        """Build the OAuth authorization URL."""
        state = make_state(
            connection_type, connection_id, service_name, connection_name, user_id
        )
        scope_str = self.get_scope_string(scope)

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": scope_str,
            "state": state,
            "response_type": "code",
            **self.get_additional_params(),
        }

        return f"{self.auth_url}?{urllib.parse.urlencode(params)}"


async def save_connection_to_mongo(
    connection: ConnectionKey,
    params: Any,
    params_class: type,
) -> None:
    """
    Save OAuth connection to MongoDB.

    Args:
        connection: Connection metadata (id, user_id, name, type, service)
        params: Connection parameters (tokens, etc.)
        params_class: Pydantic model class for the params
    """
    if connection.service_name not in [c.value for c in ServiceName]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid service_name: {connection.service_name}",
        )

    # Validate params through the model
    validated_params = params_class(**params.model_dump())
    now = datetime.now()

    connection_item = ConnectionItem(
        _id=connection.connection_id,
        user_id=connection.user_id,
        connection_name=connection.connection_name,
        service_name=connection.service_name,
        connection_type=connection.connection_type,
        created_at=now,
        status=ConnectionStatus.CONNECTED.value,
        params=validated_params.model_dump(),
    )

    doc = connection_item.model_dump(by_alias=True, exclude_none=True)
    if "_id" not in doc:
        raise ValueError("ConnectionItem must have an _id before inserting")
    await database[settings.connection_collection].insert_one(doc)

    logger.info(
        "OAuth connection saved",
        connection_id=connection.connection_id,
        service_name=connection.service_name,
        user_id=connection.user_id,
    )


async def get_connection_with_ownership(
    connection_id: str,
    user_id: str,
    model_cls: type = ConnectionItem,
) -> ConnectionItem | None:
    """
    Get a connection with ownership verification.

    Args:
        connection_id: The connection ID to fetch
        user_id: The user ID that must own the connection
        model_cls: Optional model class to cast the result

    Returns:
        ConnectionItem if found and owned by user, None otherwise
    """
    return await find_one(
        settings.connection_collection,
        {"_id": connection_id, "user_id": user_id},
        model_cls,
    )
