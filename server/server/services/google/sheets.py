import asyncio

from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from loguru import logger

from common.database import get_mongodb
from common.model.connection import ConnectionItem
from common.model.google.sheets import (
    GoogleSheetsFile,
    GoogleSheetsSpreadsheet,
    GoogleSheetsWorksheet,
)
from common.model.token import GoogleConnectionParams
from server.configs.config import settings
from server.services.exceptions import (
    ConnectionAuthError,
    ConnectionNotFoundError,
    ExternalAPIError,
)


def _build_credentials(connection: ConnectionItem) -> Credentials:
    """Build Google OAuth credentials from a connection item."""
    params = GoogleConnectionParams(**connection.params)
    scopes = [settings.google_oauth_sheets_scope, settings.google_oauth_drive_scope]
    return Credentials(
        token=params.access_token,
        refresh_token=params.refresh_token,
        token_uri=settings.google_oauth_token_url,
        client_id=settings.google_oauth_client_id,
        client_secret=settings.google_oauth_client_secret,
        scopes=scopes,
    )


def _get_google_sheets_spreadsheets_sync(
    connection: ConnectionItem,
) -> list[GoogleSheetsFile]:
    """
    Synchronous implementation - fetches Google Sheets spreadsheets.
    Uses Google Drive API to list spreadsheets.
    """
    credentials = _build_credentials(connection)
    drive_service = build("drive", "v3", credentials=credentials)

    query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    results = (
        drive_service.files()
        .list(
            q=query,
            pageSize=50,
            fields="files(id,name,webViewLink,createdTime,modifiedTime,mimeType)",
            orderBy="modifiedTime desc",
        )
        .execute()
    )

    files = results.get("files", [])

    spreadsheets = []
    for file in files:
        spreadsheet = GoogleSheetsFile(
            id=file["id"],
            name=file["name"],
            web_view_link=file["webViewLink"],
            created_time=file.get("createdTime"),
            modified_time=file.get("modifiedTime"),
            mime_type=file.get("mimeType", "application/vnd.google-apps.spreadsheet"),
        )
        spreadsheets.append(spreadsheet)

    logger.info(
        f"Found {len(spreadsheets)} spreadsheets for connection {connection.id}"
    )
    return spreadsheets


async def get_google_sheets_spreadsheets(
    connection_id: str, user_id: str
) -> list[GoogleSheetsFile]:
    """
    Returns a list of Google Sheets spreadsheets accessible with the given connection_id.
    Verifies user ownership of the connection.
    Runs blocking Google API calls in a thread pool.
    """
    connection = await get_mongodb().get_document(
        collection_name=settings.connection_collection,
        query={"_id": connection_id, "user_id": user_id},
        model_cls=ConnectionItem,
    )
    if not connection:
        logger.error(f"Connection not found for id={connection_id}")
        raise ConnectionNotFoundError(connection_id)

    try:
        return await asyncio.to_thread(
            _get_google_sheets_spreadsheets_sync, connection
        )
    except (ConnectionNotFoundError, ConnectionAuthError, ExternalAPIError):
        raise
    except RefreshError as e:
        logger.error(f"Token refresh failed for connection {connection_id}: {e}")
        raise ConnectionAuthError(connection_id, "Token expired or revoked")
    except HttpError as e:
        logger.error(f"Google Sheets API error: {e}")
        raise ExternalAPIError(
            "Google Sheets", str(e), e.resp.status if e.resp else None
        )


def _get_google_sheets_worksheets_sync(
    connection: ConnectionItem, spreadsheet_id: str,
) -> GoogleSheetsSpreadsheet:
    """
    Synchronous implementation - fetches spreadsheet details including worksheets.
    """
    credentials = _build_credentials(connection)
    sheets_service = build("sheets", "v4", credentials=credentials)

    spreadsheet = (
        sheets_service.spreadsheets()
        .get(spreadsheetId=spreadsheet_id, fields="properties,sheets.properties")
        .execute()
    )

    properties = spreadsheet.get("properties", {})
    spreadsheet_name = properties.get("title", "Untitled Spreadsheet")
    spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"

    worksheets = []
    sheets = spreadsheet.get("sheets", [])

    for sheet in sheets:
        sheet_props = sheet.get("properties", {})
        worksheet = GoogleSheetsWorksheet(
            sheet_id=sheet_props.get("sheetId", 0),
            title=sheet_props.get("title", "Untitled Sheet"),
            index=sheet_props.get("index", 0),
            sheet_type=sheet_props.get("sheetType", "GRID"),
            grid_properties=sheet_props.get("gridProperties"),
        )
        worksheets.append(worksheet)

    result = GoogleSheetsSpreadsheet(
        spreadsheet_id=spreadsheet_id,
        name=spreadsheet_name,
        spreadsheet_url=spreadsheet_url,
        created_time=properties.get("createdTime"),
        modified_time=properties.get("modifiedTime"),
        worksheets=worksheets,
    )

    logger.info(
        f"Found spreadsheet '{spreadsheet_name}' with {len(worksheets)} worksheets"
    )
    return result


async def get_google_sheets_worksheets(
    connection_id: str, spreadsheet_id: str, user_id: str
) -> GoogleSheetsSpreadsheet:
    """
    Returns detailed information about a specific spreadsheet including its worksheets.
    Verifies user ownership of the connection.
    Runs blocking Google API calls in a thread pool.
    """
    connection = await get_mongodb().get_document(
        collection_name=settings.connection_collection,
        query={"_id": connection_id, "user_id": user_id},
        model_cls=ConnectionItem,
    )
    if not connection:
        logger.error(f"Connection not found for id={connection_id}")
        raise ConnectionNotFoundError(connection_id)

    try:
        return await asyncio.to_thread(
            _get_google_sheets_worksheets_sync, connection, spreadsheet_id
        )
    except (ConnectionNotFoundError, ConnectionAuthError, ExternalAPIError):
        raise
    except RefreshError as e:
        logger.error(f"Token refresh failed for connection {connection_id}: {e}")
        raise ConnectionAuthError(connection_id, "Token expired or revoked")
    except HttpError as e:
        logger.error(f"Google Sheets API error: {e}")
        raise ExternalAPIError(
            "Google Sheets", str(e), e.resp.status if e.resp else None
        )


async def validate_google_sheets_connection(connection_id: str, user_id: str) -> bool:
    """
    Validates that a Google Sheets connection is working by making a simple API call.
    Verifies user ownership of the connection.
    """
    try:
        await get_google_sheets_spreadsheets(connection_id, user_id)
        return True
    except (ConnectionNotFoundError, ConnectionAuthError, ExternalAPIError) as e:
        logger.error(f"Google Sheets connection validation failed: {e}")
        return False
