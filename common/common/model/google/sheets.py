from enum import StrEnum
from typing import Any

from pydantic import BaseModel, model_validator

from common.model.common import BaseConnectedDestinationConfig


class GoogleSheetsAction(StrEnum):
    APPEND = "append"
    OVERWRITE = "overwrite"
    NEW_WORKSHEET = "new_worksheet"
    NEW_SPREADSHEET = "new_spreadsheet"


LEGACY_INSERT_MODE_TO_ACTION = {
    "append": GoogleSheetsAction.OVERWRITE,
    "truncate": GoogleSheetsAction.OVERWRITE,
    "overwrite": GoogleSheetsAction.OVERWRITE,
    "upsert": GoogleSheetsAction.OVERWRITE,
}


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
    action: GoogleSheetsAction = GoogleSheetsAction.APPEND
    spreadsheet_id: str = ""
    worksheet_name: str = ""
    new_spreadsheet_name: str = ""
    new_worksheet_name: str = "Sheet1"

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_insert_mode(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        if data.get("action"):
            return data
        legacy = (
            data.get("insert_mode")
            or data.get("write_mode")
            or data.get("writeMode")
        )
        if legacy:
            mapped = LEGACY_INSERT_MODE_TO_ACTION.get(str(legacy).lower())
            if mapped:
                data["action"] = mapped.value
        return data

    @model_validator(mode="after")
    def check_required_fields_per_action(self) -> "GoogleSheetsDestinationConfig":
        if self.action in (GoogleSheetsAction.APPEND, GoogleSheetsAction.OVERWRITE):
            if not self.spreadsheet_id:
                raise ValueError(
                    f"spreadsheet_id is required when action is '{self.action.value}'"
                )
            if not self.worksheet_name:
                raise ValueError(
                    f"worksheet_name is required when action is '{self.action.value}'"
                )
        elif self.action == GoogleSheetsAction.NEW_WORKSHEET:
            if not self.spreadsheet_id:
                raise ValueError(
                    "spreadsheet_id is required when action is 'new_worksheet'"
                )
            if not self.worksheet_name:
                raise ValueError(
                    "worksheet_name is required when action is 'new_worksheet'"
                )
        elif self.action == GoogleSheetsAction.NEW_SPREADSHEET:
            if not self.new_spreadsheet_name:
                raise ValueError(
                    "new_spreadsheet_name is required when action is 'new_spreadsheet'"
                )
            if not self.new_worksheet_name:
                raise ValueError(
                    "new_worksheet_name is required when action is 'new_spreadsheet'"
                )
        return self
