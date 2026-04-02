"""Tests for pin_service and pin API endpoints."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from server.models.pin import (
    ColumnInfo,
    PinnedDataMap,
    PinnedNodeSummary,
)

WORKFLOW_ID = "workflow_abc"
NODE_INSTANCE_ID = 3
USER_ID = "test_user_id_123"

SAMPLE_COLUMNS = [
    {"name": "campaign_name", "data_type": "string"},
    {"name": "impressions", "data_type": "integer"},
]

SAMPLE_DATA = [
    {"campaign_name": "Campaign A", "impressions": 1000},
    {"campaign_name": "Campaign B", "impressions": 2000},
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_mock_collection(
    find_result: list[dict] | None = None,
    delete_count: int = 1,
) -> MagicMock:
    """Build a mock Motor collection."""
    collection = MagicMock()

    # update_one (upsert)
    update_result = MagicMock()
    collection.update_one = AsyncMock(return_value=update_result)

    # delete_one
    delete_result = MagicMock()
    delete_result.deleted_count = delete_count
    collection.delete_one = AsyncMock(return_value=delete_result)

    # find → to_list
    cursor = MagicMock()
    cursor.to_list = AsyncMock(return_value=find_result or [])
    collection.find = MagicMock(return_value=cursor)

    return collection


# ---------------------------------------------------------------------------
# pin_node tests
# ---------------------------------------------------------------------------


class TestPinNode:
    @pytest.fixture
    def mock_collection(self):
        collection = make_mock_collection()
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=collection)
        with patch("server.services.pin_service.database", mock_db):
            yield collection

    @pytest.fixture
    def mock_settings(self):
        with patch("server.services.pin_service.settings") as mock:
            mock.pinned_data_collection = "pinned_node_data"
            yield mock

    @pytest.mark.asyncio
    async def test_pin_node_upserts_document(self, mock_collection, mock_settings):
        """pin_node calls update_one with upsert=True."""
        from server.services.pin_service import pin_node

        columns = [ColumnInfo(name="impressions", data_type="integer")]
        await pin_node(WORKFLOW_ID, NODE_INSTANCE_ID, USER_ID, SAMPLE_DATA, columns)

        mock_collection.update_one.assert_awaited_once()
        call_args = mock_collection.update_one.call_args
        assert call_args[1]["upsert"] is True
        filter_doc = call_args[0][0]
        assert filter_doc["workflow_id"] == WORKFLOW_ID
        assert filter_doc["node_instance_id"] == NODE_INSTANCE_ID
        assert filter_doc["user_id"] == USER_ID

    @pytest.mark.asyncio
    async def test_pin_node_truncates_to_1000_rows(
        self, mock_collection, mock_settings
    ):
        """pin_node truncates data to 1000 rows."""
        from server.services.pin_service import pin_node

        large_data = [{"row": i} for i in range(1500)]
        columns = [ColumnInfo(name="row", data_type="integer")]
        await pin_node(WORKFLOW_ID, NODE_INSTANCE_ID, USER_ID, large_data, columns)

        call_args = mock_collection.update_one.call_args
        set_payload = call_args[0][1]["$set"]
        assert len(set_payload["data"]) == 1000

    @pytest.mark.asyncio
    async def test_pin_node_stores_all_rows_when_under_limit(
        self, mock_collection, mock_settings
    ):
        """pin_node stores all rows when count is below 1000."""
        from server.services.pin_service import pin_node

        columns = [ColumnInfo(name="campaign_name", data_type="string")]
        await pin_node(WORKFLOW_ID, NODE_INSTANCE_ID, USER_ID, SAMPLE_DATA, columns)

        call_args = mock_collection.update_one.call_args
        set_payload = call_args[0][1]["$set"]
        assert len(set_payload["data"]) == len(SAMPLE_DATA)

    @pytest.mark.asyncio
    async def test_pin_node_serialises_columns(self, mock_collection, mock_settings):
        """pin_node serialises ColumnInfo objects to dicts."""
        from server.services.pin_service import pin_node

        columns = [
            ColumnInfo(name="campaign_name", data_type="string"),
            ColumnInfo(name="impressions", data_type="integer"),
        ]
        await pin_node(WORKFLOW_ID, NODE_INSTANCE_ID, USER_ID, SAMPLE_DATA, columns)

        call_args = mock_collection.update_one.call_args
        stored_columns = call_args[0][1]["$set"]["columns"]
        assert stored_columns == [
            {"name": "campaign_name", "data_type": "string"},
            {"name": "impressions", "data_type": "integer"},
        ]


# ---------------------------------------------------------------------------
# unpin_node tests
# ---------------------------------------------------------------------------


class TestUnpinNode:
    @pytest.fixture
    def mock_collection_with_pin(self):
        collection = make_mock_collection(delete_count=1)
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=collection)
        with patch("server.services.pin_service.database", mock_db):
            yield collection

    @pytest.fixture
    def mock_collection_without_pin(self):
        collection = make_mock_collection(delete_count=0)
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=collection)
        with patch("server.services.pin_service.database", mock_db):
            yield collection

    @pytest.fixture
    def mock_settings(self):
        with patch("server.services.pin_service.settings") as mock:
            mock.pinned_data_collection = "pinned_node_data"
            yield mock

    @pytest.mark.asyncio
    async def test_unpin_node_returns_true_when_pin_exists(
        self, mock_collection_with_pin, mock_settings
    ):
        """unpin_node returns True when a document was deleted."""
        from server.services.pin_service import unpin_node

        result = await unpin_node(WORKFLOW_ID, NODE_INSTANCE_ID, USER_ID)
        assert result is True

    @pytest.mark.asyncio
    async def test_unpin_node_returns_false_when_no_pin(
        self, mock_collection_without_pin, mock_settings
    ):
        """unpin_node returns False when no document matched."""
        from server.services.pin_service import unpin_node

        result = await unpin_node(WORKFLOW_ID, NODE_INSTANCE_ID, USER_ID)
        assert result is False

    @pytest.mark.asyncio
    async def test_unpin_node_passes_correct_filter(
        self, mock_collection_with_pin, mock_settings
    ):
        """unpin_node queries by workflow_id, node_instance_id, and user_id."""
        from server.services.pin_service import unpin_node

        await unpin_node(WORKFLOW_ID, NODE_INSTANCE_ID, USER_ID)

        call_args = mock_collection_with_pin.delete_one.call_args
        filter_doc = call_args[0][0]
        assert filter_doc["workflow_id"] == WORKFLOW_ID
        assert filter_doc["node_instance_id"] == NODE_INSTANCE_ID
        assert filter_doc["user_id"] == USER_ID


# ---------------------------------------------------------------------------
# get_all_pinned_data tests
# ---------------------------------------------------------------------------


class TestGetAllPinnedData:
    @pytest.fixture
    def mock_settings(self):
        with patch("server.services.pin_service.settings") as mock:
            mock.pinned_data_collection = "pinned_node_data"
            yield mock

    def make_db_document(
        self, node_instance_id: int, pinned_at: float = 1234567890.0
    ) -> dict:
        return {
            "workflow_id": WORKFLOW_ID,
            "node_instance_id": node_instance_id,
            "user_id": USER_ID,
            "data": SAMPLE_DATA,
            "columns": SAMPLE_COLUMNS,
            "pinned_at": pinned_at,
        }

    @pytest.mark.asyncio
    async def test_returns_empty_map_when_no_pins(self, mock_settings):
        """get_all_pinned_data returns PinnedDataMap with empty dict."""
        collection = make_mock_collection(find_result=[])
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=collection)
        with patch("server.services.pin_service.database", mock_db):
            from server.services.pin_service import get_all_pinned_data

            result = await get_all_pinned_data(WORKFLOW_ID, USER_ID)

        assert isinstance(result, PinnedDataMap)
        assert result.pinned == {}

    @pytest.mark.asyncio
    async def test_returns_map_keyed_by_node_instance_id_as_string(self, mock_settings):
        """get_all_pinned_data keys results by str(node_instance_id)."""
        documents = [
            self.make_db_document(node_instance_id=2),
            self.make_db_document(node_instance_id=5),
        ]
        collection = make_mock_collection(find_result=documents)
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=collection)
        with patch("server.services.pin_service.database", mock_db):
            from server.services.pin_service import get_all_pinned_data

            result = await get_all_pinned_data(WORKFLOW_ID, USER_ID)

        assert "2" in result.pinned
        assert "5" in result.pinned
        assert isinstance(result.pinned["2"], PinnedNodeSummary)

    @pytest.mark.asyncio
    async def test_summary_contains_data_columns_pinned_at(self, mock_settings):
        """PinnedNodeSummary includes data, columns, and pinned_at."""
        pinned_at = 9999999.0
        documents = [self.make_db_document(node_instance_id=3, pinned_at=pinned_at)]
        collection = make_mock_collection(find_result=documents)
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=collection)
        with patch("server.services.pin_service.database", mock_db):
            from server.services.pin_service import get_all_pinned_data

            result = await get_all_pinned_data(WORKFLOW_ID, USER_ID)

        summary = result.pinned["3"]
        assert summary.data == SAMPLE_DATA
        assert summary.pinned_at == pinned_at
        assert len(summary.columns) == 2
        assert summary.columns[0].name == "campaign_name"

    @pytest.mark.asyncio
    async def test_queries_by_workflow_id_and_user_id(self, mock_settings):
        """get_all_pinned_data filters by both workflow_id and user_id."""
        collection = make_mock_collection(find_result=[])
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=collection)
        with patch("server.services.pin_service.database", mock_db):
            from server.services.pin_service import get_all_pinned_data

            await get_all_pinned_data(WORKFLOW_ID, USER_ID)

        collection.find.assert_called_once_with(
            {"workflow_id": WORKFLOW_ID, "user_id": USER_ID}
        )


# ---------------------------------------------------------------------------
# Pin API endpoint tests (integration via TestClient)
# ---------------------------------------------------------------------------


class TestPinEndpoints:
    @pytest.fixture
    def mock_pin_service(self):
        """Patch all three pin_service functions at the API layer."""
        with (
            patch(
                "server.api.workflow.pin_node",
                new_callable=AsyncMock,
            ) as mock_pin,
            patch(
                "server.api.workflow.unpin_node",
                new_callable=AsyncMock,
            ) as mock_unpin,
            patch(
                "server.api.workflow.get_all_pinned_data",
                new_callable=AsyncMock,
            ) as mock_get,
        ):
            mock_unpin.return_value = True
            mock_get.return_value = PinnedDataMap(pinned={})
            yield mock_pin, mock_unpin, mock_get

    @pytest.mark.unit
    def test_pin_node_endpoint_returns_200(self, client: TestClient, mock_pin_service):
        """PUT .../pin returns 200 and success=True."""
        mock_pin, _, _ = mock_pin_service
        mock_pin.return_value = None

        payload = {"data": SAMPLE_DATA, "columns": SAMPLE_COLUMNS}
        response = client.put(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/pin",
            json=payload,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True
        mock_pin.assert_awaited_once()

    @pytest.mark.unit
    def test_pin_node_endpoint_requires_auth(
        self, unauthenticated_client: TestClient, mock_pin_service
    ):
        """PUT .../pin returns 401 when not authenticated."""
        payload = {"data": SAMPLE_DATA, "columns": SAMPLE_COLUMNS}
        response = unauthenticated_client.put(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/pin",
            json=payload,
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.unit
    def test_unpin_node_endpoint_returns_200(
        self, client: TestClient, mock_pin_service
    ):
        """DELETE .../pin returns 200 and success=True when pin exists."""
        _, mock_unpin, _ = mock_pin_service
        mock_unpin.return_value = True

        response = client.delete(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/pin"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True
        mock_unpin.assert_awaited_once()

    @pytest.mark.unit
    def test_unpin_node_endpoint_returns_404_when_no_pin(
        self, client: TestClient, mock_pin_service
    ):
        """DELETE .../pin returns 404 when no pin exists."""
        _, mock_unpin, _ = mock_pin_service
        mock_unpin.return_value = False

        response = client.delete(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/pin"
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert str(NODE_INSTANCE_ID) in response.json()["detail"]

    @pytest.mark.unit
    def test_unpin_node_endpoint_requires_auth(
        self, unauthenticated_client: TestClient, mock_pin_service
    ):
        """DELETE .../pin returns 401 when not authenticated."""
        response = unauthenticated_client.delete(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/pin"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.unit
    def test_get_pinned_data_endpoint_returns_200(
        self, client: TestClient, mock_pin_service
    ):
        """GET .../pinned-data returns 200 with PinnedDataMap."""
        _, _, mock_get = mock_pin_service
        mock_get.return_value = PinnedDataMap(
            pinned={
                "3": PinnedNodeSummary(
                    data=SAMPLE_DATA,
                    columns=[ColumnInfo(**col) for col in SAMPLE_COLUMNS],
                    pinned_at=1234567890.0,
                )
            }
        )

        response = client.get(f"/api/workflows/{WORKFLOW_ID}/pinned-data")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert "pinned" in body
        assert "3" in body["pinned"]
        assert body["pinned"]["3"]["data"] == SAMPLE_DATA

    @pytest.mark.unit
    def test_get_pinned_data_endpoint_returns_empty_map(
        self, client: TestClient, mock_pin_service
    ):
        """GET .../pinned-data returns empty pinned dict when no pins exist."""
        _, _, mock_get = mock_pin_service
        mock_get.return_value = PinnedDataMap(pinned={})

        response = client.get(f"/api/workflows/{WORKFLOW_ID}/pinned-data")

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["pinned"] == {}

    @pytest.mark.unit
    def test_get_pinned_data_endpoint_requires_auth(
        self, unauthenticated_client: TestClient, mock_pin_service
    ):
        """GET .../pinned-data returns 401 when not authenticated."""
        response = unauthenticated_client.get(
            f"/api/workflows/{WORKFLOW_ID}/pinned-data"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
