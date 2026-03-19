from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from common.model.connection import (
    ConnectionNamePayload,
    ConnectionType,
    OAuthLoginResponse,
    ServiceName,
)
from common.model.google.sheets import (
    GoogleSheetsFile,
    GoogleSheetsSpreadsheet,
)
from common.model.user import UserInDB
from server.configs.config import settings
from server.services.auth.dependencies import get_current_user
from server.services.exceptions import OrbitXError
from server.services.google.oauth import build_google_oauth_url
from server.services.google.sheets import (
    get_google_sheets_spreadsheets,
    get_google_sheets_worksheets,
    validate_google_sheets_connection,
)
from server.services.utils import generate_uuid

router = APIRouter(prefix="/api/google/sheets", tags=["google_sheets"])


@router.post("/login")
async def login_google_sheets(
    payload: ConnectionNamePayload,
    user: UserInDB = Depends(get_current_user),
):
    connection_id = generate_uuid()
    # Combine Sheets and Drive scopes for full functionality
    combined_scope = (
        f"{settings.google_oauth_sheets_scope} {settings.google_oauth_drive_scope}"
    )
    oauth_url = build_google_oauth_url(
        scope=combined_scope,
        connection_type=ConnectionType.DESTINATION.value,
        connection_id=connection_id,
        service_name=ServiceName.GOOGLE_SHEET.value,
        connection_name=payload.connection_name,
        user_id=user.id,
    )
    logger.info(f"Generated Google OAuth URL for Sheets: {oauth_url}")
    return OAuthLoginResponse(
        oauth_url=oauth_url,
        connection_id=connection_id,
        message="Redirect user to this URL to authorize Google Sheets",
    )


@router.get("/spreadsheets", response_model=list[GoogleSheetsFile])
async def get_spreadsheets_endpoint(
    connection_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    """Retrieves a list of Google Sheets spreadsheets accessible with a given connection_id."""
    try:
        return await get_google_sheets_spreadsheets(connection_id, current_user.id)
    except OrbitXError as e:
        logger.error(f"Error fetching spreadsheets: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/spreadsheets/{spreadsheet_id}", response_model=GoogleSheetsSpreadsheet)
async def get_spreadsheet_details_endpoint(
    connection_id: str,
    spreadsheet_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    """Retrieves detailed information about a specific spreadsheet including its worksheets."""
    try:
        return await get_google_sheets_worksheets(
            connection_id, spreadsheet_id, current_user.id
        )
    except OrbitXError as e:
        logger.error(f"Error fetching spreadsheet details: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/validate", response_model=dict)
async def validate_connection_endpoint(
    connection_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    """Validates that a Google Sheets connection is working."""
    try:
        is_valid = await validate_google_sheets_connection(
            connection_id, current_user.id
        )
        return {
            "connection_id": connection_id,
            "is_valid": is_valid,
            "message": "Connection is valid"
            if is_valid
            else "Connection validation failed",
        }
    except OrbitXError as e:
        logger.error(f"Error validating connection: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
