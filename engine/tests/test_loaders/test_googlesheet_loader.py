"""Tests for GoogleSheet loader."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest
from gspread.exceptions import APIError, WorksheetNotFound

from common.model.google.sheets import (
    GoogleSheetsAction,
    GoogleSheetsDestinationConfig,
)
from engine.exceptions import LoaderException
from engine.node.loaders.googlesheet.loader import (
    GoogleSheetLoader,
    build_template_context,
    resolve_name,
)

FIXED_MOMENT = datetime(2026, 4, 20, 14, 30, 0, tzinfo=UTC)


def loader_with_context(config: GoogleSheetsDestinationConfig) -> GoogleSheetLoader:
    loader = GoogleSheetLoader(config)
    loader.set_execution_context("exec-123", FIXED_MOMENT)
    return loader


def make_config(**overrides) -> GoogleSheetsDestinationConfig:
    defaults = {
        "connection_id": "conn_123",
        "action": GoogleSheetsAction.APPEND,
        "spreadsheet_id": "sheet_123",
        "worksheet_name": "Sheet1",
    }
    defaults.update(overrides)
    return GoogleSheetsDestinationConfig(**defaults)


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_append_to_empty_worksheet_writes_headers(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client
    worksheet = MagicMock()
    worksheet.get_all_values.return_value = []
    client.open_by_key.return_value.worksheet.return_value = worksheet

    config = make_config(action=GoogleSheetsAction.APPEND)
    df = pd.DataFrame({"col1": [1, 2], "col2": ["a", "b"]})

    await loader_with_context(config).load(df)

    worksheet.update.assert_called_once_with(
        [["col1", "col2"], ["1", "a"], ["2", "b"]], value_input_option="RAW"
    )
    worksheet.append_rows.assert_not_called()
    worksheet.clear.assert_not_called()


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_append_to_existing_worksheet_appends_rows(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client
    worksheet = MagicMock()
    worksheet.get_all_values.return_value = [["col1", "col2"], ["x", "y"]]
    client.open_by_key.return_value.worksheet.return_value = worksheet

    config = make_config(action=GoogleSheetsAction.APPEND)
    df = pd.DataFrame({"col1": [1], "col2": ["a"]})

    await loader_with_context(config).load(df)

    worksheet.append_rows.assert_called_once_with(
        [["1", "a"]], value_input_option="RAW"
    )
    worksheet.clear.assert_not_called()


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_overwrite_clears_and_writes(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client
    worksheet = MagicMock()
    client.open_by_key.return_value.worksheet.return_value = worksheet

    config = make_config(action=GoogleSheetsAction.OVERWRITE)
    df = pd.DataFrame({"col1": [1], "col2": ["a"]})

    await loader_with_context(config).load(df)

    worksheet.clear.assert_called_once()
    worksheet.update.assert_called_once_with(
        [["col1", "col2"], ["1", "a"]], value_input_option="RAW"
    )


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_overwrite_empty_dataframe_clears_and_skips_update(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client
    worksheet = MagicMock()
    client.open_by_key.return_value.worksheet.return_value = worksheet

    config = make_config(action=GoogleSheetsAction.OVERWRITE)

    await GoogleSheetLoader(config).load(pd.DataFrame())

    worksheet.clear.assert_called_once()
    worksheet.update.assert_not_called()


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_new_worksheet_creates_and_writes(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client
    spreadsheet = client.open_by_key.return_value
    spreadsheet.worksheet.side_effect = WorksheetNotFound("not found")
    new_worksheet = MagicMock()
    spreadsheet.add_worksheet.return_value = new_worksheet

    config = make_config(
        action=GoogleSheetsAction.NEW_WORKSHEET,
        worksheet_name="NewTab",
    )
    df = pd.DataFrame({"col1": [1], "col2": ["a"]})

    await loader_with_context(config).load(df)

    spreadsheet.add_worksheet.assert_called_once()
    kwargs = spreadsheet.add_worksheet.call_args.kwargs
    assert kwargs["title"] == "NewTab_2026-04-20_14-30-00"
    new_worksheet.update.assert_called_once_with(
        [["col1", "col2"], ["1", "a"]], value_input_option="RAW"
    )


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_new_worksheet_fails_when_name_exists(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client
    spreadsheet = client.open_by_key.return_value
    spreadsheet.worksheet.return_value = MagicMock()

    config = make_config(
        action=GoogleSheetsAction.NEW_WORKSHEET,
        worksheet_name="Existing",
    )

    with pytest.raises(LoaderException) as exc_info:
        await loader_with_context(config).load(pd.DataFrame({"a": [1]}))
    assert "already exists" in str(exc_info.value)


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_new_spreadsheet_creates_and_writes(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client
    spreadsheet = MagicMock()
    spreadsheet.id = "new_id"
    spreadsheet.url = "https://example.com"
    worksheet = MagicMock()
    worksheet.title = "Sheet1"
    spreadsheet.sheet1 = worksheet
    client.create.return_value = spreadsheet

    config = make_config(
        action=GoogleSheetsAction.NEW_SPREADSHEET,
        spreadsheet_id="",
        worksheet_name="",
        new_spreadsheet_name="My Report",
        new_worksheet_name="Data",
    )
    df = pd.DataFrame({"col1": [1], "col2": ["a"]})

    await loader_with_context(config).load(df)

    client.create.assert_called_once_with("My Report_2026-04-20_14-30-00")
    worksheet.update_title.assert_called_once_with("Data_2026-04-20_14-30-00")
    worksheet.update.assert_called_once_with(
        [["col1", "col2"], ["1", "a"]], value_input_option="RAW"
    )


@pytest.mark.asyncio
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_load_wraps_errors_in_loader_exception(
    mock_build_creds: AsyncMock,
) -> None:
    mock_build_creds.side_effect = Exception("boom")

    config = make_config()
    with pytest.raises(LoaderException) as exc_info:
        await GoogleSheetLoader(config).load(pd.DataFrame({"a": [1]}))

    assert "Failed to load data to Google Sheet" in str(exc_info.value)
    assert exc_info.value.destination_type == "google_sheet"
    assert exc_info.value.details["action"] == "append"


def test_config_rejects_missing_spreadsheet_id_for_append() -> None:
    with pytest.raises(ValueError, match="spreadsheet_id"):
        GoogleSheetsDestinationConfig(
            connection_id="c",
            action=GoogleSheetsAction.APPEND,
            worksheet_name="s",
        )


def test_config_rejects_missing_name_for_new_spreadsheet() -> None:
    with pytest.raises(ValueError, match="new_spreadsheet_name"):
        GoogleSheetsDestinationConfig(
            connection_id="c",
            action=GoogleSheetsAction.NEW_SPREADSHEET,
        )


def test_config_migrates_legacy_insert_mode_truncate() -> None:
    config = GoogleSheetsDestinationConfig(
        connection_id="c",
        spreadsheet_id="s",
        worksheet_name="w",
        insert_mode="truncate",
    )
    assert config.action == GoogleSheetsAction.OVERWRITE


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_new_spreadsheet_403_raises_reconnect_message(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client

    response = MagicMock()
    response.status_code = 403
    response.json.return_value = {}
    response.text = "forbidden"
    client.create.side_effect = APIError(response)

    config = make_config(
        action=GoogleSheetsAction.NEW_SPREADSHEET,
        spreadsheet_id="",
        worksheet_name="",
        new_spreadsheet_name="My Report_{{date}}",
        new_worksheet_name="Sheet1",
    )

    with pytest.raises(LoaderException) as exc_info:
        await loader_with_context(config).load(pd.DataFrame({"a": [1]}))
    assert "reconnect" in str(exc_info.value).lower()


def test_config_migrates_legacy_insert_mode_append() -> None:
    config = GoogleSheetsDestinationConfig(
        connection_id="c",
        spreadsheet_id="s",
        worksheet_name="w",
        insert_mode="append",
    )
    assert config.action == GoogleSheetsAction.OVERWRITE


def test_build_template_context_produces_all_tokens() -> None:
    context = build_template_context("run-9", FIXED_MOMENT)
    assert context == {
        "{{date}}": "2026-04-20",
        "{{datetime}}": "2026-04-20_14-30-00",
        "{{timestamp}}": str(int(FIXED_MOMENT.timestamp())),
        "{{run_id}}": "run-9",
    }


def test_resolve_name_substitutes_tokens() -> None:
    context = build_template_context("run-9", FIXED_MOMENT)
    assert resolve_name("Report_{{date}}", context) == "Report_2026-04-20"
    assert (
        resolve_name("{{run_id}}_{{datetime}}", context)
        == "run-9_2026-04-20_14-30-00"
    )


def test_resolve_name_adds_auto_suffix_when_no_token() -> None:
    context = build_template_context("run-9", FIXED_MOMENT)
    assert resolve_name("Report", context) == "Report_2026-04-20_14-30-00"


def test_resolve_name_keeps_name_when_token_present() -> None:
    context = build_template_context("run-9", FIXED_MOMENT)
    assert resolve_name("Report_{{date}}", context) == "Report_2026-04-20"


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_new_worksheet_honors_user_token(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client
    spreadsheet = client.open_by_key.return_value
    spreadsheet.worksheet.side_effect = WorksheetNotFound("not found")
    spreadsheet.add_worksheet.return_value = MagicMock()

    config = make_config(
        action=GoogleSheetsAction.NEW_WORKSHEET,
        worksheet_name="Daily_{{date}}",
    )

    await loader_with_context(config).load(pd.DataFrame({"a": [1]}))

    kwargs = spreadsheet.add_worksheet.call_args.kwargs
    assert kwargs["title"] == "Daily_2026-04-20"


@pytest.mark.asyncio
@patch("engine.node.loaders.googlesheet.loader.gspread")
@patch(
    "engine.node.loaders.googlesheet.loader.build_connection_credentials",
    new_callable=AsyncMock,
)
async def test_new_spreadsheet_honors_user_token(
    mock_build_creds: AsyncMock, mock_gspread: MagicMock
) -> None:
    mock_build_creds.return_value = MagicMock()
    client = MagicMock()
    mock_gspread.authorize.return_value = client
    spreadsheet = MagicMock()
    spreadsheet.id = "id"
    spreadsheet.url = "url"
    worksheet = MagicMock()
    worksheet.title = "Sheet1"
    spreadsheet.sheet1 = worksheet
    client.create.return_value = spreadsheet

    config = make_config(
        action=GoogleSheetsAction.NEW_SPREADSHEET,
        spreadsheet_id="",
        worksheet_name="",
        new_spreadsheet_name="Report_{{date}}",
        new_worksheet_name="Sheet1",
    )

    await loader_with_context(config).load(pd.DataFrame({"a": [1]}))

    client.create.assert_called_once_with("Report_2026-04-20")
    worksheet.update_title.assert_called_once_with("Sheet1_2026-04-20_14-30-00")
