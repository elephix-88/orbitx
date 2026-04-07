from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from common.model.connection import ConnectionItem
from server.services.exceptions import ConnectionNotFoundError
from server.services.google.ads import (
    _get_google_ads_accounts_sync,
    get_google_ads_fields,
)
from server.services.google.sheets import (
    _get_google_sheets_spreadsheets_sync,
    _get_google_sheets_worksheets_sync,
    validate_google_sheets_connection,
)


@pytest.fixture
def mock_mongodb():
    with patch("server.services.google.sheets.mongodb_client") as mock:
        yield mock


@pytest.fixture
def mock_mongodb_ads():
    with patch("server.services.google.ads.mongodb_client") as mock:
        yield mock


@pytest.fixture
def mock_settings():
    with patch("server.services.google.sheets.settings") as mock_sheets, patch(
        "server.services.google.ads.settings"
    ) as mock_ads:
        # Configure sheets settings
        mock_sheets.connection_collection = "connections"
        mock_sheets.google_oauth_sheets_scope = "sheets_scope"
        mock_sheets.google_oauth_drive_scope = "drive_scope"
        mock_sheets.google_oauth_client_id = "client_id"
        mock_sheets.google_oauth_client_secret = "client_secret"
        mock_sheets.google_oauth_token_url = "https://oauth2.googleapis.com/token"
        # Configure ads settings
        mock_ads.connection_collection = "connections"
        mock_ads.google_ads_developer_token = "dev_token"
        mock_ads.google_fields = "google_fields"
        mock_ads.google_oauth_client_id = "client_id"
        mock_ads.google_oauth_client_secret = "client_secret"
        yield mock_sheets


@pytest.fixture
def mock_drive_service():
    with patch("server.services.google.sheets.build") as mock_build:
        mock_service = MagicMock()
        mock_build.return_value = mock_service
        yield mock_service


@pytest.fixture
def mock_google_ads_client():
    with patch("server.services.google.ads.GoogleAdsClient") as mock_client:
        yield mock_client


class TestGoogleSheetsService:
    def test_get_spreadsheets_success(
        self, mock_mongodb, mock_settings, mock_drive_service
    ):
        # Arrange
        mock_mongodb.get_document.return_value = ConnectionItem(
            _id="conn1",
            user_id="test_user_id_123",
            service_name="google_sheets",
            connection_name="My Sheets",
            params={"access_token": "at", "refresh_token": "rt", "scope": "scope"},
            connection_type="source",
            created_at=datetime.now(),
        )

        mock_files = {
            "files": [
                {
                    "id": "s1",
                    "name": "Sheet 1",
                    "webViewLink": "url1",
                    "mimeType": "application/vnd.google-apps.spreadsheet",
                },
                {"id": "s2", "name": "Sheet 2", "webViewLink": "url2"},
            ]
        }
        mock_drive_service.files.return_value.list.return_value.execute.return_value = (
            mock_files
        )

        # Act - use sync version directly for testing
        result = _get_google_sheets_spreadsheets_sync("conn1", "test_user_id_123")

        # Assert
        assert len(result) == 2
        assert result[0].id == "s1"
        assert result[1].name == "Sheet 2"
        mock_mongodb.get_document.assert_called_once()

    def test_get_spreadsheets_connection_not_found(self, mock_mongodb, mock_settings):
        mock_mongodb.get_document.return_value = None
        with pytest.raises(ConnectionNotFoundError):
            _get_google_sheets_spreadsheets_sync("conn1", "test_user_id_123")

    def test_get_spreadsheets_error(self, mock_mongodb, mock_settings):
        mock_mongodb.get_document.side_effect = Exception("DB Error")
        with pytest.raises(Exception, match="DB Error"):
            _get_google_sheets_spreadsheets_sync("conn1", "test_user_id_123")

    def test_get_worksheets_success(
        self, mock_mongodb, mock_settings, mock_drive_service
    ):
        # Arrange
        mock_mongodb.get_document.return_value = ConnectionItem(
            _id="conn1",
            user_id="test_user_id_123",
            service_name="google_sheets",
            connection_name="My Sheets",
            params={"access_token": "at", "refresh_token": "rt", "scope": "scope"},
            connection_type="source",
            created_at=datetime.now(),
        )

        mock_spreadsheet = {
            "properties": {"title": "My Sheet", "createdTime": "2024-01-01"},
            "sheets": [
                {"properties": {"sheetId": 1, "title": "Tab 1", "index": 0}},
                {"properties": {"sheetId": 2, "title": "Tab 2", "index": 1}},
            ],
        }
        # Note: get_google_sheets_worksheets uses 'sheets' service, not 'drive'
        # But we mocked 'build' globally in fixture, so it returns same mock_service
        # We need to adjust mock for sheets().get().execute()
        sheets_mock = mock_drive_service.spreadsheets.return_value
        sheets_mock.get.return_value.execute.return_value = (
            mock_spreadsheet
        )

        # Act - use sync version directly for testing
        result = _get_google_sheets_worksheets_sync(
            "conn1", "sheet_id_1", "test_user_id_123"
        )

        # Assert
        assert result.spreadsheet_id == "sheet_id_1"
        assert result.name == "My Sheet"
        assert len(result.worksheets) == 2
        assert result.worksheets[0].title == "Tab 1"

    def test_get_worksheets_connection_not_found(self, mock_mongodb, mock_settings):
        mock_mongodb.get_document.return_value = None
        with pytest.raises(ConnectionNotFoundError):
            _get_google_sheets_worksheets_sync(
                "conn1", "sheet_id_1", "test_user_id_123"
            )

    @pytest.mark.asyncio
    async def test_validate_connection_success(
        self, mock_mongodb, mock_settings, mock_drive_service
    ):
        # Arrange
        mock_mongodb.get_document.return_value = ConnectionItem(
            _id="conn1",
            user_id="test_user_id_123",
            service_name="google_sheets",
            connection_name="My Sheets",
            params={"access_token": "at", "refresh_token": "rt", "scope": "scope"},
            connection_type="source",
            created_at=datetime.now(),
        )
        mock_drive_service.files.return_value.list.return_value.execute.return_value = {
            "files": []
        }

        # Act
        result = await validate_google_sheets_connection("conn1", "test_user_id_123")

        # Assert
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_connection_failure(self, mock_mongodb, mock_settings):
        mock_mongodb.get_document.return_value = None
        result = await validate_google_sheets_connection("conn1", "test_user_id_123")
        assert result is False


class TestGoogleAdsService:
    def test_get_google_ads_fields(self, mock_mongodb_ads, mock_settings):
        with patch("server.services.google.ads.mongodb_client") as mock_db:
            mock_db.get_all_documents.return_value = [
                {
                    "name": "field1",
                    "category": "cat1",
                    "data_type": "string",
                    "field": "field1",
                    "is_primary_key": False,
                    "source": {"base": "customer", "select": "customer.id"},
                    "is_metric": False,
                },
                {
                    "name": "field2",
                    "category": "cat2",
                    "data_type": "int",
                    "field": "field2",
                    "is_primary_key": False,
                    "source": {"base": "campaign", "select": "campaign.id"},
                    "is_metric": True,
                },
            ]

            result = get_google_ads_fields()

            assert len(result) == 2
            assert result[0].field == "field1"

    def test_get_google_ads_accounts_success(
        self, mock_mongodb_ads, mock_settings, mock_google_ads_client
    ):
        # Arrange
        mock_mongodb_ads.get_document.return_value = ConnectionItem(
            _id="conn1",
            user_id="test_user_id_123",
            service_name="google_ads",
            connection_name="My Ads",
            params={"access_token": "at", "refresh_token": "rt", "scope": "scope"},
            connection_type="source",
            created_at=datetime.now(),
        )

        mock_client_instance = MagicMock()
        mock_google_ads_client.load_from_dict.return_value = mock_client_instance

        # Mock CustomerService
        mock_customer_service = MagicMock()
        mock_customer_service.list_accessible_customers.return_value.resource_names = [
            "customers/123",
            "customers/456",
        ]

        # Mock GoogleAdsService
        mock_ga_service = MagicMock()

        def search_side_effect(customer_id, query):
            row = MagicMock()
            row.customer.resource_name = f"customers/{customer_id}"
            row.customer.id = int(customer_id)
            row.customer.descriptive_name = f"Account {customer_id}"
            return [row]

        mock_ga_service.search.side_effect = search_side_effect

        mock_client_instance.get_service.side_effect = (
            lambda name: mock_customer_service
            if name == "CustomerService"
            else mock_ga_service
        )

        # Act - use sync version directly for testing
        result = _get_google_ads_accounts_sync("conn1", "test_user_id_123")

        # Assert
        assert len(result) == 2
        assert result[0].id == "123"
        assert result[0].descriptive_name == "Account 123"
        assert result[1].id == "456"

    def test_get_google_ads_accounts_connection_not_found(
        self, mock_mongodb_ads, mock_settings
    ):
        mock_mongodb_ads.get_document.return_value = None
        with pytest.raises(ConnectionNotFoundError):
            _get_google_ads_accounts_sync("conn1", "test_user_id_123")

    def test_get_google_ads_accounts_api_exception(
        self, mock_mongodb_ads, mock_settings, mock_google_ads_client
    ):
        # Arrange
        mock_mongodb_ads.get_document.return_value = ConnectionItem(
            _id="conn1",
            user_id="test_user_id_123",
            service_name="google_ads",
            connection_name="My Ads",
            params={"access_token": "at", "refresh_token": "rt", "scope": "scope"},
            connection_type="source",
            created_at=datetime.now(),
        )

        mock_client_instance = MagicMock()
        mock_google_ads_client.load_from_dict.return_value = mock_client_instance

        mock_customer_service = MagicMock()
        mock_customer_service.list_accessible_customers.return_value.resource_names = [
            "customers/123"
        ]

        mock_ga_service = MagicMock()

        # Let's try to mock the exception class in the module
        with patch(
            "server.services.google.ads.GoogleAdsException", Exception
        ):  # Patch it to be normal Exception for test simplicity
            mock_ga_service.search.side_effect = Exception("API Error")
            mock_client_instance.get_service.side_effect = (
                lambda name: mock_customer_service
                if name == "CustomerService"
                else mock_ga_service
            )

            result = _get_google_ads_accounts_sync("conn1", "test_user_id_123")

            assert (
                len(result) == 0
            )  # Should catch exception and continue/return empty list
