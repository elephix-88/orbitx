import asyncio
from datetime import UTC, datetime

import gspread
import pandas as pd
from google.oauth2.credentials import Credentials
from gspread.exceptions import APIError, WorksheetNotFound
from loguru import logger

from common.model.google.sheets import (
    GoogleSheetsAction,
    GoogleSheetsDestinationConfig,
)
from engine.configs.config import settings
from engine.exceptions import LoaderException
from engine.interfaces.node import Loader
from engine.services.google.auth import build_connection_credentials

TEMPLATE_TOKEN_MARKER = "{{"
AUTO_SUFFIX_TOKEN = "{{datetime}}"


def dataframe_to_rows(data: pd.DataFrame) -> tuple[list[str], list[list[str]]]:
    headers = list(data.columns)
    rows = data.astype(object).fillna("").astype(str).values.tolist()
    return headers, rows


def build_template_context(
    execution_id: str | None, execution_datetime: datetime | None
) -> dict[str, str]:
    moment = execution_datetime or datetime.now(UTC)
    return {
        "{{date}}": moment.strftime("%Y-%m-%d"),
        "{{datetime}}": moment.strftime("%Y-%m-%d_%H-%M-%S"),
        "{{timestamp}}": str(int(moment.timestamp())),
        "{{run_id}}": execution_id or "",
    }


def resolve_name(raw: str, context: dict[str, str]) -> str:
    if TEMPLATE_TOKEN_MARKER not in raw:
        raw = f"{raw}_{AUTO_SUFFIX_TOKEN}"
    resolved = raw
    for token, value in context.items():
        resolved = resolved.replace(token, value)
    return resolved


class GoogleSheetLoader(Loader):
    def __init__(self, config: GoogleSheetsDestinationConfig):
        self.config = config

    async def load(self, data: pd.DataFrame) -> None:
        try:
            credentials = await build_connection_credentials(self.config.connection_id)
            await asyncio.to_thread(self.load_sync, credentials, data)
            logger.success(
                f"Successfully loaded data to Google Sheet with action "
                f"'{self.config.action.value}'"
            )
        except Exception as ex:
            raise LoaderException(
                f"Failed to load data to Google Sheet: {ex}",
                destination_type=settings.services.google_sheet,
                destination_table=self.config.worksheet_name
                or self.config.new_worksheet_name,
                details={
                    "action": self.config.action.value,
                    "spreadsheet_id": self.config.spreadsheet_id,
                    "new_spreadsheet_name": self.config.new_spreadsheet_name,
                    "connection_id": self.config.connection_id,
                },
            ) from ex

    def load_sync(self, credentials: Credentials, data: pd.DataFrame) -> None:
        client = gspread.authorize(credentials)
        action = self.config.action

        if action == GoogleSheetsAction.APPEND:
            self.append_to_worksheet(client, data)
        elif action == GoogleSheetsAction.OVERWRITE:
            self.overwrite_worksheet(client, data)
        elif action == GoogleSheetsAction.NEW_WORKSHEET:
            self.create_worksheet_and_write(client, data)
        elif action == GoogleSheetsAction.NEW_SPREADSHEET:
            self.create_spreadsheet_and_write(client, data)

    def template_context(self) -> dict[str, str]:
        return build_template_context(self.execution_id, self.execution_datetime)

    def append_to_worksheet(self, client: gspread.Client, data: pd.DataFrame) -> None:
        spreadsheet = client.open_by_key(self.config.spreadsheet_id)
        worksheet = spreadsheet.worksheet(self.config.worksheet_name)
        if data.empty:
            return
        headers, rows = dataframe_to_rows(data)
        existing = worksheet.get_all_values()
        if not existing:
            worksheet.update([headers] + rows, value_input_option="RAW")
        else:
            worksheet.append_rows(rows, value_input_option="RAW")

    def overwrite_worksheet(self, client: gspread.Client, data: pd.DataFrame) -> None:
        spreadsheet = client.open_by_key(self.config.spreadsheet_id)
        worksheet = spreadsheet.worksheet(self.config.worksheet_name)
        worksheet.clear()
        if data.empty:
            return
        headers, rows = dataframe_to_rows(data)
        worksheet.update([headers] + rows, value_input_option="RAW")

    def create_worksheet_and_write(
        self, client: gspread.Client, data: pd.DataFrame
    ) -> None:
        spreadsheet = client.open_by_key(self.config.spreadsheet_id)
        worksheet_name = resolve_name(
            self.config.worksheet_name, self.template_context()
        )

        try:
            spreadsheet.worksheet(worksheet_name)
        except WorksheetNotFound:
            pass
        else:
            raise ValueError(
                f"Worksheet '{worksheet_name}' already exists in "
                f"spreadsheet {self.config.spreadsheet_id}"
            )

        row_count = max(len(data) + 1, 100)
        column_count = max(len(data.columns), 26)
        worksheet = spreadsheet.add_worksheet(
            title=worksheet_name,
            rows=row_count,
            cols=column_count,
        )
        logger.info(
            f"Created worksheet '{worksheet_name}' in spreadsheet "
            f"{self.config.spreadsheet_id}"
        )
        if data.empty:
            return
        headers, rows = dataframe_to_rows(data)
        worksheet.update([headers] + rows, value_input_option="RAW")

    def create_spreadsheet_and_write(
        self, client: gspread.Client, data: pd.DataFrame
    ) -> None:
        context = self.template_context()
        spreadsheet_name = resolve_name(self.config.new_spreadsheet_name, context)
        worksheet_name = resolve_name(self.config.new_worksheet_name, context)

        try:
            spreadsheet = client.create(spreadsheet_name)
        except APIError as ex:
            if getattr(ex.response, "status_code", None) == 403:
                raise PermissionError(
                    "Your Google Sheets connection is missing permission to "
                    "create new files. Please reconnect the connection to "
                    "grant the new scope."
                ) from ex
            raise
        worksheet = spreadsheet.sheet1
        if worksheet.title != worksheet_name:
            worksheet.update_title(worksheet_name)
        if not data.empty:
            headers, rows = dataframe_to_rows(data)
            worksheet.update([headers] + rows, value_input_option="RAW")
        logger.info(
            f"Created spreadsheet '{spreadsheet_name}' "
            f"(id={spreadsheet.id}) at {spreadsheet.url}"
        )
