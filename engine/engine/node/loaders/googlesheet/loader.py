import asyncio

import gspread
import pandas as pd
from gspread_dataframe import set_with_dataframe
from loguru import logger

from common.model.google.sheets import GoogleSheetsDestinationConfig
from engine.configs.config import settings
from engine.exceptions import LoaderException
from engine.interfaces.node import Loader
from engine.services.google.auth import build_connection_credentials


class GoogleSheetLoader(Loader):
    def __init__(self, config: GoogleSheetsDestinationConfig):
        self.config = config

    async def load(self, data: pd.DataFrame) -> None:
        try:
            creds = await build_connection_credentials(self.config.connection_id)

            def _sync_load() -> None:
                gc = gspread.authorize(creds)
                sh = gc.open_by_key(self.config.spreadsheet_id)
                ws = sh.worksheet(self.config.worksheet_name)
                set_with_dataframe(ws, data)

            await asyncio.to_thread(_sync_load)
            logger.success(
                f"Successfully loaded data to Google Sheet {self.config.worksheet_name}"
            )
        except Exception as ex:
            raise LoaderException(
                f"Failed to load data to Google Sheet: {ex}",
                destination_type=settings.services.google_sheet,
                destination_table=self.config.worksheet_name,
                details={
                    "spreadsheet_id": self.config.spreadsheet_id,
                    "connection_id": self.config.connection_id,
                },
            ) from ex
