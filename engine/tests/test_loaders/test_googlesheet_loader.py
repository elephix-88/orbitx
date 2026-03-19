"""Tests for GoogleSheet loader."""

from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from engine.exceptions import LoaderException
from engine.node.loaders.googlesheet.loader import GoogleSheetLoader


class MockGoogleSheetsConfig:
    """Mock Google Sheets configuration."""

    def __init__(
        self,
        spreadsheet_id: str = "sheet_123",
        worksheet_name: str = "Sheet1",
        connection_id: str = "conn_123",
    ):
        self.spreadsheet_id = spreadsheet_id
        self.worksheet_name = worksheet_name
        self.connection_id = connection_id


class TestGoogleSheetLoader:
    """Tests for GoogleSheetLoader class."""

    def test_init_stores_config(self) -> None:
        """Test that initialization stores the config."""
        config = MockGoogleSheetsConfig()
        loader = GoogleSheetLoader(config)

        assert loader.config == config

    @patch("engine.node.loaders.googlesheet.loader.set_with_dataframe")
    @patch("engine.node.loaders.googlesheet.loader.gspread")
    @patch("engine.node.loaders.googlesheet.loader.build_connection_credentials")
    def test_load_success(
        self,
        mock_build_creds: MagicMock,
        mock_gspread: MagicMock,
        mock_set_dataframe: MagicMock,
    ) -> None:
        """Test successful data loading to Google Sheets."""
        mock_creds = MagicMock()
        mock_build_creds.return_value = mock_creds

        mock_gc = MagicMock()
        mock_gspread.authorize.return_value = mock_gc

        mock_sh = MagicMock()
        mock_gc.open_by_key.return_value = mock_sh

        mock_ws = MagicMock()
        mock_sh.worksheet.return_value = mock_ws

        config = MockGoogleSheetsConfig()
        loader = GoogleSheetLoader(config)

        df = pd.DataFrame({"col1": [1, 2], "col2": ["a", "b"]})
        loader.load(df)

        mock_build_creds.assert_called_once_with(config.connection_id)
        mock_gspread.authorize.assert_called_once_with(mock_creds)
        mock_gc.open_by_key.assert_called_once_with(config.spreadsheet_id)
        mock_sh.worksheet.assert_called_once_with(config.worksheet_name)
        mock_set_dataframe.assert_called_once_with(mock_ws, df)

    @patch("engine.node.loaders.googlesheet.loader.build_connection_credentials")
    def test_load_raises_loader_exception_on_credentials_error(
        self, mock_build_creds: MagicMock
    ) -> None:
        """Test that load raises LoaderException when credentials fail."""
        mock_build_creds.side_effect = Exception("Invalid credentials")

        config = MockGoogleSheetsConfig()
        loader = GoogleSheetLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})

        with pytest.raises(LoaderException) as exc_info:
            loader.load(df)

        assert "Failed to load data to Google Sheet" in str(exc_info.value)
        assert exc_info.value.destination_type == "google_sheets"
        assert exc_info.value.destination_table == config.worksheet_name

    @patch("engine.node.loaders.googlesheet.loader.gspread")
    @patch("engine.node.loaders.googlesheet.loader.build_connection_credentials")
    def test_load_raises_loader_exception_on_spreadsheet_not_found(
        self, mock_build_creds: MagicMock, mock_gspread: MagicMock
    ) -> None:
        """Test that load raises LoaderException when spreadsheet not found."""
        mock_build_creds.return_value = MagicMock()

        mock_gc = MagicMock()
        mock_gspread.authorize.return_value = mock_gc
        mock_gc.open_by_key.side_effect = Exception("Spreadsheet not found")

        config = MockGoogleSheetsConfig()
        loader = GoogleSheetLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})

        with pytest.raises(LoaderException) as exc_info:
            loader.load(df)

        assert "Failed to load data to Google Sheet" in str(exc_info.value)
        assert exc_info.value.details["spreadsheet_id"] == config.spreadsheet_id

    @patch("engine.node.loaders.googlesheet.loader.gspread")
    @patch("engine.node.loaders.googlesheet.loader.build_connection_credentials")
    def test_load_raises_loader_exception_on_worksheet_not_found(
        self, mock_build_creds: MagicMock, mock_gspread: MagicMock
    ) -> None:
        """Test that load raises LoaderException when worksheet not found."""
        mock_build_creds.return_value = MagicMock()

        mock_gc = MagicMock()
        mock_gspread.authorize.return_value = mock_gc

        mock_sh = MagicMock()
        mock_gc.open_by_key.return_value = mock_sh
        mock_sh.worksheet.side_effect = Exception("Worksheet not found")

        config = MockGoogleSheetsConfig()
        loader = GoogleSheetLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})

        with pytest.raises(LoaderException) as exc_info:
            loader.load(df)

        assert "Failed to load data to Google Sheet" in str(exc_info.value)

    @patch("engine.node.loaders.googlesheet.loader.set_with_dataframe")
    @patch("engine.node.loaders.googlesheet.loader.gspread")
    @patch("engine.node.loaders.googlesheet.loader.build_connection_credentials")
    def test_load_raises_loader_exception_on_write_error(
        self,
        mock_build_creds: MagicMock,
        mock_gspread: MagicMock,
        mock_set_dataframe: MagicMock,
    ) -> None:
        """Test that load raises LoaderException when writing fails."""
        mock_build_creds.return_value = MagicMock()

        mock_gc = MagicMock()
        mock_gspread.authorize.return_value = mock_gc

        mock_sh = MagicMock()
        mock_gc.open_by_key.return_value = mock_sh

        mock_ws = MagicMock()
        mock_sh.worksheet.return_value = mock_ws

        mock_set_dataframe.side_effect = Exception("Write error")

        config = MockGoogleSheetsConfig()
        loader = GoogleSheetLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})

        with pytest.raises(LoaderException) as exc_info:
            loader.load(df)

        assert "Failed to load data to Google Sheet" in str(exc_info.value)
