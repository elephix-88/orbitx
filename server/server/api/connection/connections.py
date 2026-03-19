from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from common.model.connection import ConnectionItem, DeleteConnectionResponse
from common.model.user import UserInDB
from server.services.auth.dependencies import get_current_user
from server.services.connection import delete_connection as delete_connection_service
from server.services.connection import get_all_connections
from server.services.connection import get_connection as get_connection_service
from server.services.exceptions import OrbitXError

router = APIRouter()


@router.get("/api/connections", response_model=list[ConnectionItem])
async def list_connections(
    _current_user: UserInDB = Depends(get_current_user),
):
    """List all connections owned by the current user."""
    return await get_all_connections()


@router.get("/api/connections/{connection_id}", response_model=ConnectionItem)
async def get_connection(
    connection_id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> ConnectionItem:
    """Get a specific connection with ownership verification."""
    connection = await get_connection_service(connection_id)
    if connection is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    return connection


@router.delete(
    "/api/connections/{connection_id}", response_model=DeleteConnectionResponse
)
async def delete_connection(
    connection_id: str,
    _current_user: UserInDB = Depends(get_current_user),
):
    """Delete a connection with ownership verification."""
    try:
        deleted = await delete_connection_service(connection_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Connection not found")
        return DeleteConnectionResponse(success=True)
    except OrbitXError as e:
        logger.error(f"Error deleting connection {connection_id}: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
