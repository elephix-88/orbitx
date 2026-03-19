from pydantic import BaseModel

from common.model.common import BaseConnectedDestinationConfig


class GoogleSheetsWorksheet(BaseModel):
    sheet_id: int
    title: str
    index: int
    sheet_type: str
    grid_properties: dict | None = None


class GoogleSheetsSpreadsheet(BaseModel):
    spreadsheet_id: str
    name: str
    spreadsheet_url: str
    created_time: str | None = None
    modified_time: str | None = None
    worksheets: list[GoogleSheetsWorksheet] = []


class GoogleSheetsFile(BaseModel):
    id: str
    name: str
    web_view_link: str
    created_time: str | None = None
    modified_time: str | None = None
    mime_type: str = "application/vnd.google-apps.spreadsheet"


class GoogleSheetsDestinationConfig(BaseConnectedDestinationConfig):
    spreadsheet_id: str
    worksheet_name: str
    range: str
