"""Tests for step_run service and step-run API endpoint."""
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest
from fastapi import status
from fastapi.testclient import TestClient
from pydantic import BaseModel

from server.models.pin import ColumnInfo, PinnedDataMap, PinnedNodeSummary

# ---------------------------------------------------------------------------
# Mock the engine package before any server.services.step_run import.
# The engine package is not installed in the server test environment.
# We only need the public interface: SingleNodeResult and execute_single_node.
# ---------------------------------------------------------------------------


class _MockColumnInfo(BaseModel):
    name: str
    data_type: str


class _MockSingleNodeResult(BaseModel):
    data: list[dict]
    columns: list
    row_count: int
    node_output: object | None = None
    error_message: str | None = None
    traceback: str | None = None


_mock_executor_module = MagicMock()
_mock_executor_module.SingleNodeResult = _MockSingleNodeResult
_mock_executor_module.execute_single_node = AsyncMock()

sys.modules.setdefault("engine", MagicMock())
sys.modules.setdefault("engine.engine", MagicMock())
sys.modules.setdefault("engine.engine.services", MagicMock())
sys.modules["engine.engine.services.single_node_executor"] = _mock_executor_module

WORKFLOW_ID = "workflow_step_run_test"
NODE_INSTANCE_ID = 5
USER_ID = "test_user_id_123"

SAMPLE_ROWS = [
    {"campaign": "Alpha", "impressions": 100},
    {"campaign": "Beta", "impressions": 200},
]

SAMPLE_COLUMNS = [
    ColumnInfo(name="campaign", data_type="string"),
    ColumnInfo(name="impressions", data_type="integer"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_workflow(nodes=None, connections=None):
    """Build a lightweight mock WorkflowData."""
    workflow = MagicMock()
    workflow.id = WORKFLOW_ID
    workflow.nodes = nodes or []
    workflow.connections = connections or []
    return workflow


def make_node(
    node_instance_id: int,
    node_id: str = "google_ads",
    node_type: str = "source",
):
    node = MagicMock()
    node.node_instance_id = node_instance_id
    node.node_id = node_id
    node.node_type = node_type
    return node


def make_connection(from_node: int, to_node: int):
    conn = MagicMock()
    conn.from_node = from_node
    conn.to_node = to_node
    return conn


def make_single_node_result(error_message=None):
    return _MockSingleNodeResult(
        data=SAMPLE_ROWS,
        columns=SAMPLE_COLUMNS,
        row_count=len(SAMPLE_ROWS),
        error_message=error_message,
    )


def make_empty_pinned_map():
    return PinnedDataMap(pinned={})


def make_pinned_map_with_node(node_instance_id: int):
    return PinnedDataMap(
        pinned={
            str(node_instance_id): PinnedNodeSummary(
                data=SAMPLE_ROWS,
                columns=SAMPLE_COLUMNS,
                pinned_at=1234567890.0,
            )
        }
    )


# ---------------------------------------------------------------------------
# find_node_by_instance_id
# ---------------------------------------------------------------------------


class TestFindNodeByInstanceId:
    def test_returns_matching_node(self):
        from server.services.step_run import find_node_by_instance_id

        node_a = make_node(1)
        node_b = make_node(2)
        result = find_node_by_instance_id([node_a, node_b], 2)
        assert result is node_b

    def test_returns_none_when_not_found(self):
        from server.services.step_run import find_node_by_instance_id

        nodes = [make_node(1), make_node(3)]
        result = find_node_by_instance_id(nodes, 99)
        assert result is None

    def test_returns_none_for_empty_list(self):
        from server.services.step_run import find_node_by_instance_id

        result = find_node_by_instance_id([], 1)
        assert result is None


# ---------------------------------------------------------------------------
# find_upstream_node_ids
# ---------------------------------------------------------------------------


class TestFindUpstreamNodeIds:
    def test_returns_upstream_ids_for_target(self):
        from server.services.step_run import find_upstream_node_ids

        workflow = make_workflow(
            connections=[
                make_connection(from_node=1, to_node=5),
                make_connection(from_node=2, to_node=5),
                make_connection(from_node=3, to_node=7),
            ]
        )
        result = find_upstream_node_ids(workflow, node_instance_id=5)
        assert sorted(result) == [1, 2]

    def test_returns_empty_for_source_node(self):
        from server.services.step_run import find_upstream_node_ids

        workflow = make_workflow(
            connections=[make_connection(from_node=1, to_node=3)]
        )
        result = find_upstream_node_ids(workflow, node_instance_id=1)
        assert result == []

    def test_returns_empty_when_no_connections(self):
        from server.services.step_run import find_upstream_node_ids

        workflow = make_workflow(connections=[])
        result = find_upstream_node_ids(workflow, node_instance_id=5)
        assert result == []


# ---------------------------------------------------------------------------
# reconstruct_dataframe_from_pin
# ---------------------------------------------------------------------------


class TestReconstructDataframeFromPin:
    def test_builds_dataframe_from_row_dicts(self):
        from server.services.step_run import reconstruct_dataframe_from_pin

        dataframe = reconstruct_dataframe_from_pin(SAMPLE_ROWS)
        assert isinstance(dataframe, pd.DataFrame)
        assert list(dataframe.columns) == ["campaign", "impressions"]
        assert len(dataframe) == len(SAMPLE_ROWS)

    def test_returns_empty_dataframe_for_empty_list(self):
        from server.services.step_run import reconstruct_dataframe_from_pin

        dataframe = reconstruct_dataframe_from_pin([])
        assert isinstance(dataframe, pd.DataFrame)
        assert len(dataframe) == 0


# ---------------------------------------------------------------------------
# resolve_upstream_dataframe
# ---------------------------------------------------------------------------


class TestResolveUpstreamDataframe:
    @pytest.mark.asyncio
    async def test_returns_none_when_no_upstream(self):
        from server.services.step_run import resolve_upstream_dataframe

        workflow = make_workflow()
        result = await resolve_upstream_dataframe(workflow, [], pinned_map={})
        assert result is None

    @pytest.mark.asyncio
    async def test_uses_pinned_data_when_available(self):
        from server.services.step_run import resolve_upstream_dataframe

        upstream_node = make_node(1)
        workflow = make_workflow(nodes=[upstream_node])
        pinned_map = make_pinned_map_with_node(1).pinned

        result = await resolve_upstream_dataframe(workflow, [1], pinned_map=pinned_map)

        assert isinstance(result, pd.DataFrame)
        assert len(result) == len(SAMPLE_ROWS)

    @pytest.mark.asyncio
    async def test_executes_live_when_not_pinned(self):
        from server.services.step_run import resolve_upstream_dataframe

        upstream_node = make_node(1)
        workflow = make_workflow(nodes=[upstream_node])
        live_result = make_single_node_result()

        with patch(
            "server.services.step_run.execute_single_node",
            new=AsyncMock(return_value=live_result),
        ) as mock_execute:
            result = await resolve_upstream_dataframe(workflow, [1], pinned_map={})

        mock_execute.assert_awaited_once_with(upstream_node, upstream_data=None)
        assert isinstance(result, pd.DataFrame)
        assert len(result) == len(SAMPLE_ROWS)

    @pytest.mark.asyncio
    async def test_skips_missing_upstream_node(self):
        """A connection references a node_instance_id that is not in workflow.nodes."""
        from server.services.step_run import resolve_upstream_dataframe

        workflow = make_workflow(nodes=[])  # node 99 does not exist
        result = await resolve_upstream_dataframe(workflow, [99], pinned_map={})

        assert isinstance(result, pd.DataFrame)
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_concatenates_multiple_upstream_frames(self):
        from server.services.step_run import resolve_upstream_dataframe

        node_a = make_node(1)
        node_b = make_node(2)
        workflow = make_workflow(nodes=[node_a, node_b])

        pinned_map = {
            "1": PinnedNodeSummary(
                data=[{"col": "a"}],
                columns=[ColumnInfo(name="col", data_type="string")],
                pinned_at=1.0,
            ),
            "2": PinnedNodeSummary(
                data=[{"col": "b"}, {"col": "c"}],
                columns=[ColumnInfo(name="col", data_type="string")],
                pinned_at=2.0,
            ),
        }

        result = await resolve_upstream_dataframe(
            workflow, [1, 2], pinned_map=pinned_map
        )

        assert isinstance(result, pd.DataFrame)
        assert len(result) == 3

    @pytest.mark.asyncio
    async def test_returns_empty_dataframe_when_live_execution_fails(self):
        from server.services.step_run import resolve_upstream_dataframe

        upstream_node = make_node(1)
        workflow = make_workflow(nodes=[upstream_node])
        failed_result = make_single_node_result(error_message="Connection refused")

        with patch(
            "server.services.step_run.execute_single_node",
            new=AsyncMock(return_value=failed_result),
        ):
            result = await resolve_upstream_dataframe(workflow, [1], pinned_map={})

        assert isinstance(result, pd.DataFrame)
        assert len(result) == 0


# ---------------------------------------------------------------------------
# step_run_node (service function)
# ---------------------------------------------------------------------------


class TestStepRunNode:
    @pytest.fixture
    def mock_load_workflow(self):
        with patch(
            "server.services.step_run.load_workflow_for_user",
            new_callable=AsyncMock,
        ) as mock:
            yield mock

    @pytest.fixture
    def mock_get_pinned(self):
        with patch(
            "server.services.step_run.get_all_pinned_data",
            new_callable=AsyncMock,
            return_value=make_empty_pinned_map(),
        ) as mock:
            yield mock

    @pytest.fixture
    def mock_execute(self):
        with patch(
            "server.services.step_run.execute_single_node",
            new_callable=AsyncMock,
            return_value=make_single_node_result(),
        ) as mock:
            yield mock

    @pytest.fixture
    def mock_pin(self):
        with patch(
            "server.services.step_run.pin_node",
            new_callable=AsyncMock,
        ) as mock:
            yield mock

    @pytest.mark.asyncio
    async def test_raises_workflow_not_found_error(self, mock_load_workflow):
        from server.services.exceptions import WorkflowNotFoundError
        from server.services.step_run import step_run_node

        mock_load_workflow.side_effect = WorkflowNotFoundError(WORKFLOW_ID)

        with pytest.raises(WorkflowNotFoundError):
            await step_run_node(WORKFLOW_ID, NODE_INSTANCE_ID, False, USER_ID)

    @pytest.mark.asyncio
    async def test_raises_value_error_when_node_not_found(
        self, mock_load_workflow, mock_get_pinned
    ):
        from server.services.step_run import step_run_node

        workflow = make_workflow(nodes=[make_node(1)])  # target is 5, not in list
        mock_load_workflow.return_value = workflow

        with pytest.raises(ValueError, match="Node 5 not found"):
            await step_run_node(WORKFLOW_ID, NODE_INSTANCE_ID, False, USER_ID)

    @pytest.mark.asyncio
    async def test_calls_execute_single_node_with_target(
        self, mock_load_workflow, mock_get_pinned, mock_execute, mock_pin
    ):
        from server.services.step_run import step_run_node

        target_node = make_node(NODE_INSTANCE_ID, node_type="source")
        workflow = make_workflow(nodes=[target_node], connections=[])
        mock_load_workflow.return_value = workflow

        result = await step_run_node(WORKFLOW_ID, NODE_INSTANCE_ID, False, USER_ID)

        mock_execute.assert_awaited_once_with(target_node, upstream_data=None)
        assert result.data == SAMPLE_ROWS

    @pytest.mark.asyncio
    async def test_does_not_pin_when_auto_pin_false(
        self, mock_load_workflow, mock_get_pinned, mock_execute, mock_pin
    ):
        from server.services.step_run import step_run_node

        target_node = make_node(NODE_INSTANCE_ID, node_type="source")
        workflow = make_workflow(nodes=[target_node], connections=[])
        mock_load_workflow.return_value = workflow

        await step_run_node(
            WORKFLOW_ID, NODE_INSTANCE_ID,
            auto_pin=False, user_id=USER_ID,
        )

        mock_pin.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_pins_result_when_auto_pin_true_and_success(
        self, mock_load_workflow, mock_get_pinned, mock_execute, mock_pin
    ):
        from server.services.step_run import step_run_node

        target_node = make_node(NODE_INSTANCE_ID, node_type="source")
        workflow = make_workflow(nodes=[target_node], connections=[])
        mock_load_workflow.return_value = workflow

        await step_run_node(
            WORKFLOW_ID, NODE_INSTANCE_ID,
            auto_pin=True, user_id=USER_ID,
        )

        mock_pin.assert_awaited_once()
        call_kwargs = mock_pin.call_args.kwargs
        assert call_kwargs["workflow_id"] == WORKFLOW_ID
        assert call_kwargs["node_instance_id"] == NODE_INSTANCE_ID
        assert call_kwargs["user_id"] == USER_ID
        assert call_kwargs["data"] == SAMPLE_ROWS

    @pytest.mark.asyncio
    async def test_does_not_pin_when_execution_failed(
        self, mock_load_workflow, mock_get_pinned, mock_execute, mock_pin
    ):
        from server.services.step_run import step_run_node

        target_node = make_node(NODE_INSTANCE_ID, node_type="source")
        workflow = make_workflow(nodes=[target_node], connections=[])
        mock_load_workflow.return_value = workflow
        mock_execute.return_value = make_single_node_result(error_message="Timeout")

        await step_run_node(
            WORKFLOW_ID, NODE_INSTANCE_ID,
            auto_pin=True, user_id=USER_ID,
        )

        mock_pin.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_passes_upstream_dataframe_to_transform_node(
        self, mock_load_workflow, mock_get_pinned, mock_execute, mock_pin
    ):
        from server.services.step_run import step_run_node

        source_node = make_node(1, node_type="source")
        transform_node = make_node(NODE_INSTANCE_ID, node_type="transform")
        workflow = make_workflow(
            nodes=[source_node, transform_node],
            connections=[make_connection(from_node=1, to_node=NODE_INSTANCE_ID)],
        )
        mock_load_workflow.return_value = workflow
        mock_get_pinned.return_value = make_pinned_map_with_node(1)

        await step_run_node(
            WORKFLOW_ID, NODE_INSTANCE_ID,
            auto_pin=False, user_id=USER_ID,
        )

        call_args = mock_execute.call_args
        assert call_args.args[0] is transform_node
        upstream_df = call_args.kwargs["upstream_data"]
        assert isinstance(upstream_df, pd.DataFrame)
        assert len(upstream_df) == len(SAMPLE_ROWS)


# ---------------------------------------------------------------------------
# Step-run API endpoint tests (integration via TestClient)
# ---------------------------------------------------------------------------


class TestStepRunEndpoint:
    @pytest.fixture
    def mock_step_run_service(self):
        with patch(
            "server.api.workflow.step_run_node",
            new_callable=AsyncMock,
            return_value=make_single_node_result(),
        ) as mock:
            yield mock

    @pytest.mark.unit
    def test_step_run_returns_200_with_result(
        self, client: TestClient, mock_step_run_service
    ):
        """POST .../step-run returns 200 with SingleNodeResult fields."""
        response = client.post(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/step-run",
            json={"auto_pin": False},
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["data"] == SAMPLE_ROWS
        assert body["row_count"] == len(SAMPLE_ROWS)
        assert body["error_message"] is None

    @pytest.mark.unit
    def test_step_run_passes_auto_pin_to_service(
        self, client: TestClient, mock_step_run_service
    ):
        """auto_pin=True is forwarded to step_run_node."""
        client.post(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/step-run",
            json={"auto_pin": True},
        )
        call_kwargs = mock_step_run_service.call_args.kwargs
        assert call_kwargs["auto_pin"] is True

    @pytest.mark.unit
    def test_step_run_defaults_auto_pin_to_false(
        self, client: TestClient, mock_step_run_service
    ):
        """auto_pin defaults to False when omitted from request body."""
        client.post(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/step-run",
            json={},
        )
        call_kwargs = mock_step_run_service.call_args.kwargs
        assert call_kwargs["auto_pin"] is False

    @pytest.mark.unit
    def test_step_run_returns_200_on_execution_error(
        self, client: TestClient, mock_step_run_service
    ):
        """Execution errors return 200 with error_message populated, not a 500."""
        mock_step_run_service.return_value = make_single_node_result(
            error_message="Extractor failed: timeout"
        )

        response = client.post(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/step-run",
            json={"auto_pin": False},
        )

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["error_message"] == "Extractor failed: timeout"
        assert body["data"] == []

    @pytest.mark.unit
    def test_step_run_returns_404_for_missing_workflow(
        self, client: TestClient, mock_step_run_service
    ):
        """WorkflowNotFoundError surfaces as HTTP 404."""
        from server.services.exceptions import WorkflowNotFoundError

        mock_step_run_service.side_effect = WorkflowNotFoundError(WORKFLOW_ID)

        response = client.post(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/step-run",
            json={"auto_pin": False},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.unit
    def test_step_run_returns_404_for_missing_node(
        self, client: TestClient, mock_step_run_service
    ):
        """ValueError (node not found in workflow) surfaces as HTTP 404."""
        mock_step_run_service.side_effect = ValueError(
            f"Node {NODE_INSTANCE_ID} not found in workflow {WORKFLOW_ID}"
        )

        response = client.post(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/step-run",
            json={"auto_pin": False},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert str(NODE_INSTANCE_ID) in response.json()["detail"]

    @pytest.mark.unit
    def test_step_run_requires_auth(self, unauthenticated_client: TestClient):
        """POST .../step-run returns 401 when not authenticated."""
        response = unauthenticated_client.post(
            f"/api/workflows/{WORKFLOW_ID}/nodes/{NODE_INSTANCE_ID}/step-run",
            json={"auto_pin": False},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
