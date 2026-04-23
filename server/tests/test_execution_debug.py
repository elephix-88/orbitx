"""Tests for execution_debug service and execution history debug endpoints."""
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient

WORKFLOW_ID = "wf_debug_001"
EXECUTION_ID = "exec_debug_abc"
USER_ID = "test_user_id_123"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_execution_document(
    execution_id: str = EXECUTION_ID,
    workflow_id: str = WORKFLOW_ID,
    exec_status: str = "SUCCESS",
    steps: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "_id": "mongo_doc_id_001",
        "execution_id": execution_id,
        "workflow_id": workflow_id,
        "workflow_name": "My Pipeline",
        "status": exec_status,
        "triggered_by": "manual",
        "start_time": 1_700_000_000.0,
        "end_time": 1_700_000_060.0,
        "duration": 60.0,
        "steps": steps or {},
        "total_nodes": 2,
        "successful_nodes": 2,
        "failed_nodes": 0,
    }


def make_failed_step(node_id: str = "google_ads_node") -> dict[str, Any]:
    return {
        "node_instance_id": "1",
        "node_id": node_id,
        "node_type": "extractor",
        "status": "FAILED",
        "output_rows": None,
    }


def make_success_step(
    node_instance_id: str = "1",
    node_id: str = "google_ads_node",
    output_rows: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "node_instance_id": node_instance_id,
        "node_id": node_id,
        "node_type": "extractor",
        "status": "SUCCESS",
        "output_rows": output_rows or [{"campaign": "Summer", "clicks": 100}],
    }


# ---------------------------------------------------------------------------
# extract_failed_node
# ---------------------------------------------------------------------------


class TestExtractFailedNode:
    def test_returns_node_id_of_first_failed_step(self):
        from server.services.execution.debug import extract_failed_node

        document = make_execution_document(
            steps={
                "step_1": make_success_step(node_id="facebook_node"),
                "step_2": make_failed_step(node_id="bigquery_loader"),
            }
        )
        assert extract_failed_node(document) == "bigquery_loader"

    def test_returns_none_when_all_steps_succeed(self):
        from server.services.execution.debug import extract_failed_node

        document = make_execution_document(
            steps={"step_1": make_success_step()}
        )
        assert extract_failed_node(document) is None

    def test_returns_none_for_empty_steps(self):
        from server.services.execution.debug import extract_failed_node

        document = make_execution_document(steps={})
        assert extract_failed_node(document) is None

    def test_returns_first_failed_node_when_multiple_fail(self):
        from server.services.execution.debug import extract_failed_node

        document = make_execution_document(
            steps={
                "step_1": make_failed_step(node_id="node_a"),
                "step_2": make_failed_step(node_id="node_b"),
            }
        )
        assert extract_failed_node(document) == "node_a"


# ---------------------------------------------------------------------------
# document_to_execution_summary
# ---------------------------------------------------------------------------


class TestDocumentToExecutionSummary:
    def test_maps_all_fields_correctly(self):
        from server.services.execution.debug import document_to_execution_summary

        document = make_execution_document(exec_status="SUCCESS")
        summary = document_to_execution_summary(document)

        assert summary.execution_id == EXECUTION_ID
        assert summary.status == "SUCCESS"
        assert summary.start_time == 1_700_000_000.0
        assert summary.end_time == 1_700_000_060.0
        assert summary.duration == 60.0
        assert summary.triggered_by == "manual"

    def test_failed_node_is_none_when_no_failure(self):
        from server.services.execution.debug import document_to_execution_summary

        document = make_execution_document(steps={"step_1": make_success_step()})
        summary = document_to_execution_summary(document)
        assert summary.failed_node is None

    def test_failed_node_is_populated_when_step_failed(self):
        from server.services.execution.debug import document_to_execution_summary

        document = make_execution_document(
            exec_status="FAILED",
            steps={"step_1": make_failed_step(node_id="facebook_ads")},
        )
        summary = document_to_execution_summary(document)
        assert summary.failed_node == "facebook_ads"

    def test_end_time_is_none_for_running_execution(self):
        from server.services.execution.debug import document_to_execution_summary

        document = {
            "execution_id": EXECUTION_ID,
            "status": "RUNNING",
            "start_time": 1_700_000_000.0,
            "triggered_by": "schedule",
        }
        summary = document_to_execution_summary(document)
        assert summary.end_time is None
        assert summary.duration is None


# ---------------------------------------------------------------------------
# verify_workflow_ownership
# ---------------------------------------------------------------------------


class TestVerifyWorkflowOwnership:
    @pytest.fixture
    def mock_database(self):
        mock_collection = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_collection)
        with patch("common.database.mongodb.database", mock_db):
            yield mock_collection

    @pytest.mark.asyncio
    async def test_returns_workflow_when_found(self, mock_database):
        from server.services.workflow.utils import get_user_workflow

        workflow_doc = {
            "_id": WORKFLOW_ID,
            "user_id": USER_ID,
            "job_name": "My Pipeline",
            "nodes": [],
            "connections": [],
            "status": "ACTIVE",
            "schedule_expression": "0 0 * * *",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }
        mock_database.find_one = AsyncMock(return_value=workflow_doc)

        result = await get_user_workflow(WORKFLOW_ID, USER_ID)
        assert result.id == WORKFLOW_ID

    @pytest.mark.asyncio
    async def test_raises_workflow_not_found_error_when_absent(self, mock_database):
        from server.services.exceptions import WorkflowNotFoundError
        from server.services.workflow.utils import get_user_workflow

        mock_database.find_one = AsyncMock(return_value=None)

        with pytest.raises(WorkflowNotFoundError):
            await get_user_workflow(WORKFLOW_ID, USER_ID)


# ---------------------------------------------------------------------------
# get_execution_summaries
# ---------------------------------------------------------------------------


class TestGetExecutionSummaries:
    @pytest.fixture
    def mock_verify(self):
        with patch(
            "server.services.execution.debug.get_user_workflow",
            new_callable=AsyncMock,
        ) as mock:
            mock.return_value = MagicMock()
            yield mock

    @pytest.fixture
    def mock_database(self):
        mock_collection = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_collection)
        with patch("server.services.execution.debug.database", mock_db):
            yield mock_collection

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_workflow_not_found(self):
        from server.services.exceptions import WorkflowNotFoundError
        from server.services.execution.debug import get_execution_summaries

        with patch(
            "server.services.execution.debug.get_user_workflow",
            new_callable=AsyncMock,
            side_effect=WorkflowNotFoundError(WORKFLOW_ID),
        ):
            result = await get_execution_summaries(WORKFLOW_ID, USER_ID)
            assert result == []

    @pytest.mark.asyncio
    async def test_returns_summaries_sorted_newest_first(
        self, mock_verify, mock_database
    ):
        from server.services.execution.debug import get_execution_summaries

        doc_old = make_execution_document(
            execution_id="exec_old", exec_status="SUCCESS"
        )
        doc_old["start_time"] = 1_700_000_000.0
        doc_new = make_execution_document(
            execution_id="exec_new", exec_status="FAILED"
        )
        doc_new["start_time"] = 1_700_001_000.0

        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = mock_cursor
        mock_cursor.limit.return_value = mock_cursor
        mock_cursor.to_list = AsyncMock(return_value=[doc_new, doc_old])
        mock_database.find.return_value = mock_cursor

        result = await get_execution_summaries(WORKFLOW_ID, USER_ID)

        assert len(result) == 2
        assert result[0].execution_id == "exec_new"
        assert result[1].execution_id == "exec_old"

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_executions(
        self, mock_verify, mock_database
    ):
        from server.services.execution.debug import get_execution_summaries

        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = mock_cursor
        mock_cursor.limit.return_value = mock_cursor
        mock_cursor.to_list = AsyncMock(return_value=[])
        mock_database.find.return_value = mock_cursor

        result = await get_execution_summaries(WORKFLOW_ID, USER_ID)
        assert result == []


# ---------------------------------------------------------------------------
# get_execution_detail
# ---------------------------------------------------------------------------


class TestGetExecutionDetail:
    @pytest.fixture
    def mock_verify(self):
        with patch(
            "server.services.execution.debug.get_user_workflow",
            new_callable=AsyncMock,
        ) as mock:
            mock.return_value = MagicMock()
            yield mock

    @pytest.fixture
    def mock_database(self):
        mock_collection = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_collection)
        with patch("common.database.mongodb.database", mock_db):
            yield mock_collection

    @pytest.mark.asyncio
    async def test_raises_value_error_when_execution_not_found(
        self, mock_verify, mock_database
    ):
        from server.services.execution.debug import get_execution_detail

        mock_database.find_one = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match=EXECUTION_ID):
            await get_execution_detail(WORKFLOW_ID, EXECUTION_ID, USER_ID)

    @pytest.mark.asyncio
    async def test_returns_execution_history_with_normalised_id(
        self, mock_verify, mock_database
    ):
        from server.services.execution.debug import get_execution_detail

        document = make_execution_document()
        mock_database.find_one = AsyncMock(return_value=document)

        result = await get_execution_detail(WORKFLOW_ID, EXECUTION_ID, USER_ID)

        assert result.execution_id == EXECUTION_ID
        assert result.workflow_id == WORKFLOW_ID
        assert isinstance(result.id, str)

    @pytest.mark.asyncio
    async def test_verifies_ownership_before_fetching(
        self, mock_verify, mock_database
    ):
        from server.services.execution.debug import get_execution_detail

        document = make_execution_document()
        mock_database.find_one = AsyncMock(return_value=document)

        await get_execution_detail(WORKFLOW_ID, EXECUTION_ID, USER_ID)

        mock_verify.assert_awaited_once_with(WORKFLOW_ID, USER_ID)


# ---------------------------------------------------------------------------
# retry_execution
# ---------------------------------------------------------------------------


class TestRetryExecution:
    @pytest.fixture
    def mock_verify(self):
        mock_workflow = MagicMock()
        mock_workflow.job_name = "My Pipeline"
        with patch(
            "server.services.execution.debug.get_user_workflow",
            new_callable=AsyncMock,
            return_value=mock_workflow,
        ) as mock:
            yield mock

    @pytest.fixture
    def mock_prefect(self):
        with patch("server.services.execution.debug.prefect_client") as mock:
            mock.launch_run = AsyncMock(return_value="run_retry_001")
            yield mock

    @pytest.mark.asyncio
    async def test_launches_prefect_run_on_success(self, mock_verify, mock_prefect):
        from server.services.execution.debug import retry_execution

        result = await retry_execution(WORKFLOW_ID, EXECUTION_ID, USER_ID)

        mock_prefect.launch_run.assert_awaited_once()
        assert result.execution_id == "run_retry_001"

    @pytest.mark.asyncio
    async def test_launch_passes_workflow_id_and_user_id(
        self, mock_verify, mock_prefect
    ):
        from server.services.execution.debug import retry_execution

        await retry_execution(WORKFLOW_ID, EXECUTION_ID, USER_ID)

        call_kwargs = mock_prefect.launch_run.call_args.kwargs
        assert call_kwargs["workflow_id"] == WORKFLOW_ID
        assert call_kwargs["user_id"] == USER_ID

    @pytest.mark.asyncio
    async def test_raises_when_workflow_not_owned(self, mock_prefect):
        from server.services.exceptions import WorkflowNotFoundError
        from server.services.execution.debug import retry_execution

        with patch(
            "server.services.execution.debug.get_user_workflow",
            new_callable=AsyncMock,
            side_effect=WorkflowNotFoundError(WORKFLOW_ID),
        ), pytest.raises(WorkflowNotFoundError):
            await retry_execution(WORKFLOW_ID, EXECUTION_ID, USER_ID)


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------


class TestListExecutionSummariesEndpoint:
    @pytest.fixture
    def mock_service(self):
        from server.models.execution_debug import ExecutionSummary

        summaries = [
            ExecutionSummary(
                execution_id="exec_001",
                status="SUCCESS",
                start_time=1_700_001_000.0,
                end_time=1_700_001_060.0,
                duration=60.0,
            ),
            ExecutionSummary(
                execution_id="exec_002",
                status="FAILED",
                start_time=1_700_000_000.0,
                failed_node="google_ads_node",
            ),
        ]
        with patch(
            "server.api.execution_history.get_execution_summaries",
            new_callable=AsyncMock,
            return_value=summaries,
        ) as mock:
            yield mock

    @pytest.mark.unit
    def test_returns_200_with_list_of_summaries(
        self, client: TestClient, mock_service
    ):
        response = client.get(
            f"/api/execution-history/workflow/{WORKFLOW_ID}/executions"
        )
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert isinstance(body, list)
        assert len(body) == 2
        assert body[0]["execution_id"] == "exec_001"

    @pytest.mark.unit
    def test_passes_workflow_id_and_user_id_to_service(
        self, client: TestClient, mock_service
    ):
        client.get(
            f"/api/execution-history/workflow/{WORKFLOW_ID}/executions"
        )
        mock_service.assert_awaited_once_with(WORKFLOW_ID, USER_ID)

    @pytest.mark.unit
    def test_returns_empty_list_when_no_executions(
        self, client: TestClient, mock_service
    ):
        mock_service.return_value = []
        response = client.get(
            f"/api/execution-history/workflow/{WORKFLOW_ID}/executions"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    @pytest.mark.unit
    def test_requires_auth(self, unauthenticated_client: TestClient):
        response = unauthenticated_client.get(
            f"/api/execution-history/workflow/{WORKFLOW_ID}/executions"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGetExecutionDetailEndpoint:
    @pytest.fixture
    def mock_service(self):
        from common.model.execution import ExecutionHistory, Status

        mock_execution = ExecutionHistory(
            _id="mongo_doc_id_001",
            execution_id=EXECUTION_ID,
            workflow_id=WORKFLOW_ID,
            workflow_name="My Pipeline",
            status=Status.SUCCESS,
            triggered_by="manual",
            start_time=1_700_000_000.0,
            end_time=1_700_000_060.0,
            duration=60.0,
            steps={},
            total_nodes=2,
            successful_nodes=2,
            failed_nodes=0,
        )
        with patch(
            "server.api.execution_history.get_execution_detail",
            new_callable=AsyncMock,
            return_value=mock_execution,
        ) as mock:
            yield mock

    @pytest.mark.unit
    def test_returns_200_with_execution_detail(
        self, client: TestClient, mock_service
    ):
        response = client.get(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}"
        )
        assert response.status_code == status.HTTP_200_OK

    @pytest.mark.unit
    def test_passes_ids_and_user_id_to_service(
        self, client: TestClient, mock_service
    ):
        client.get(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}"
        )
        mock_service.assert_awaited_once_with(WORKFLOW_ID, EXECUTION_ID, USER_ID)

    @pytest.mark.unit
    def test_returns_404_when_workflow_not_found(
        self, client: TestClient, mock_service
    ):
        from server.services.exceptions import WorkflowNotFoundError

        mock_service.side_effect = WorkflowNotFoundError(WORKFLOW_ID)

        response = client.get(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.unit
    def test_returns_404_when_execution_not_found(
        self, client: TestClient, mock_service
    ):
        mock_service.side_effect = ValueError(
            f"Execution '{EXECUTION_ID}' not found"
        )

        response = client.get(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.unit
    def test_requires_auth(self, unauthenticated_client: TestClient):
        response = unauthenticated_client.get(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRetryExecutionEndpoint:
    @pytest.fixture
    def mock_service(self):
        from server.models.execution_debug import RetryResponse

        with patch(
            "server.api.execution_history.retry_execution",
            new_callable=AsyncMock,
            return_value=RetryResponse(execution_id="run_retry_001"),
        ) as mock:
            yield mock

    @pytest.mark.unit
    def test_returns_200_with_new_execution_id(
        self, client: TestClient, mock_service
    ):
        response = client.post(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}/retry"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["execution_id"] == "run_retry_001"

    @pytest.mark.unit
    def test_passes_ids_and_user_id_to_service(
        self, client: TestClient, mock_service
    ):
        client.post(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}/retry"
        )
        mock_service.assert_awaited_once_with(WORKFLOW_ID, EXECUTION_ID, USER_ID)

    @pytest.mark.unit
    def test_returns_404_when_workflow_not_found(
        self, client: TestClient, mock_service
    ):
        from server.services.exceptions import WorkflowNotFoundError

        mock_service.side_effect = WorkflowNotFoundError(WORKFLOW_ID)

        response = client.post(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}/retry"
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.unit
    def test_returns_422_when_dagster_launch_fails(
        self, client: TestClient, mock_service
    ):
        mock_service.side_effect = ValueError(
            f"Dagster failed to launch retry run for workflow '{WORKFLOW_ID}'"
        )

        response = client.post(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}/retry"
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.unit
    def test_requires_auth(self, unauthenticated_client: TestClient):
        response = unauthenticated_client.post(
            f"/api/execution-history/workflow/{WORKFLOW_ID}"
            f"/executions/{EXECUTION_ID}/retry"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
