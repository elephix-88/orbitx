"""Tests for error_workflow service and trigger-error API endpoint."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from common.model.error_trigger import ErrorPayload

WORKFLOW_ID = "error_wf_001"
CALLER_WORKFLOW_ID = "failed_wf_002"
USER_ID = "test_user_id_123"

SAMPLE_ERROR_PAYLOAD = ErrorPayload(
    workflow_id=CALLER_WORKFLOW_ID,
    workflow_name="My Pipeline",
    execution_id="exec_abc123",
    failed_node="google_ads_node",
    error_message="Connection timeout after 30s",
    timestamp=1_700_000_000.0,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_workflow(
    workflow_id: str = WORKFLOW_ID,
    node_ids: list[str] | None = None,
    error_workflow_id: str | None = None,
) -> MagicMock:
    workflow = MagicMock()
    workflow.id = workflow_id
    workflow.job_name = f"Workflow {workflow_id}"
    workflow.error_workflow_id = error_workflow_id

    nodes = []
    for nid in (node_ids or []):
        node = MagicMock()
        node.node_id = nid
        nodes.append(node)
    workflow.nodes = nodes

    return workflow


def make_trigger_request(
    error_payload: ErrorPayload = SAMPLE_ERROR_PAYLOAD,
    caller_workflow_id: str = CALLER_WORKFLOW_ID,
) -> dict:
    return {
        "error_payload": error_payload.model_dump(),
        "caller_workflow_id": caller_workflow_id,
    }


# ---------------------------------------------------------------------------
# workflow_has_error_trigger_node
# ---------------------------------------------------------------------------


class TestWorkflowHasErrorTriggerNode:
    def test_returns_true_when_node_present(self):
        from server.services.error_workflow import workflow_has_error_trigger_node

        workflow = make_workflow(node_ids=["google_ads", "error_trigger", "bigquery"])
        assert workflow_has_error_trigger_node(workflow) is True

    def test_returns_false_when_node_absent(self):
        from server.services.error_workflow import workflow_has_error_trigger_node

        workflow = make_workflow(node_ids=["google_ads", "bigquery"])
        assert workflow_has_error_trigger_node(workflow) is False

    def test_returns_false_for_empty_nodes(self):
        from server.services.error_workflow import workflow_has_error_trigger_node

        workflow = make_workflow(node_ids=[])
        assert workflow_has_error_trigger_node(workflow) is False


# ---------------------------------------------------------------------------
# serialise_error_payload_as_tags
# ---------------------------------------------------------------------------


class TestSerialiseErrorPayloadAsTags:
    def test_returns_dict_with_error_payload_key(self):
        from server.services.error_workflow import (
            ERROR_PAYLOAD_TAG_KEY,
            serialise_error_payload_as_tags,
        )

        tags = serialise_error_payload_as_tags(SAMPLE_ERROR_PAYLOAD)
        assert ERROR_PAYLOAD_TAG_KEY in tags

    def test_value_is_json_string(self):
        import json

        from server.services.error_workflow import serialise_error_payload_as_tags

        tags = serialise_error_payload_as_tags(SAMPLE_ERROR_PAYLOAD)
        tag_value = list(tags.values())[0]
        parsed = json.loads(tag_value)
        assert parsed["execution_id"] == SAMPLE_ERROR_PAYLOAD.execution_id
        assert parsed["error_message"] == SAMPLE_ERROR_PAYLOAD.error_message

    def test_all_values_are_strings(self):
        from server.services.error_workflow import serialise_error_payload_as_tags

        tags = serialise_error_payload_as_tags(SAMPLE_ERROR_PAYLOAD)
        for value in tags.values():
            assert isinstance(value, str)


# ---------------------------------------------------------------------------
# trigger_error_workflow (service)
# ---------------------------------------------------------------------------


class TestTriggerErrorWorkflow:
    @pytest.fixture
    def mock_load_workflow(self):
        with patch(
            "server.services.error_workflow.load_workflow",
            new_callable=AsyncMock,
        ) as mock:
            yield mock

    @pytest.fixture
    def mock_dagster(self):
        with patch(
            "server.services.error_workflow.dagster_client"
        ) as mock:
            mock.launch_run.return_value = "run_dagster_001"
            yield mock

    def make_service_request(self):
        from server.models.error_workflow import TriggerErrorRequest

        return TriggerErrorRequest(
            error_payload=SAMPLE_ERROR_PAYLOAD,
            caller_workflow_id=CALLER_WORKFLOW_ID,
        )

    @pytest.mark.asyncio
    async def test_raises_when_error_workflow_not_found(self, mock_load_workflow):
        from server.services.error_workflow import trigger_error_workflow
        from server.services.exceptions import WorkflowNotFoundError

        mock_load_workflow.return_value = None
        request = self.make_service_request()

        with pytest.raises(WorkflowNotFoundError):
            await trigger_error_workflow(WORKFLOW_ID, request, USER_ID)

    @pytest.mark.asyncio
    async def test_raises_when_error_workflow_has_no_error_trigger_node(
        self, mock_load_workflow, mock_dagster
    ):
        from server.services.error_workflow import trigger_error_workflow

        error_workflow = make_workflow(
            workflow_id=WORKFLOW_ID, node_ids=["google_ads", "bigquery"]
        )
        caller_workflow = make_workflow(
            workflow_id=CALLER_WORKFLOW_ID,
            node_ids=["facebook_ads"],
            error_workflow_id=None,
        )
        mock_load_workflow.side_effect = [error_workflow, caller_workflow]

        request = self.make_service_request()

        with pytest.raises(ValueError, match="no error_trigger node"):
            await trigger_error_workflow(WORKFLOW_ID, request, USER_ID)

    @pytest.mark.asyncio
    async def test_raises_when_caller_workflow_not_found(self, mock_load_workflow):
        from server.services.error_workflow import trigger_error_workflow
        from server.services.exceptions import WorkflowNotFoundError

        error_workflow = make_workflow(
            workflow_id=WORKFLOW_ID, node_ids=["error_trigger"]
        )
        mock_load_workflow.side_effect = [error_workflow, None]

        request = self.make_service_request()

        with pytest.raises(WorkflowNotFoundError):
            await trigger_error_workflow(WORKFLOW_ID, request, USER_ID)

    @pytest.mark.asyncio
    async def test_raises_loop_prevention_when_caller_has_error_workflow_id(
        self, mock_load_workflow, mock_dagster
    ):
        from server.services.error_workflow import trigger_error_workflow

        error_workflow = make_workflow(
            workflow_id=WORKFLOW_ID, node_ids=["error_trigger"]
        )
        # caller itself has error_workflow_id set → it is an error-handling workflow
        caller_workflow = make_workflow(
            workflow_id=CALLER_WORKFLOW_ID,
            node_ids=["google_ads"],
            error_workflow_id="some_other_error_wf",
        )
        mock_load_workflow.side_effect = [error_workflow, caller_workflow]

        request = self.make_service_request()

        with pytest.raises(ValueError, match="Loop prevention"):
            await trigger_error_workflow(WORKFLOW_ID, request, USER_ID)

    @pytest.mark.asyncio
    async def test_launches_dagster_run_on_success(
        self, mock_load_workflow, mock_dagster
    ):
        from server.services.error_workflow import trigger_error_workflow

        error_workflow = make_workflow(
            workflow_id=WORKFLOW_ID, node_ids=["error_trigger"]
        )
        caller_workflow = make_workflow(
            workflow_id=CALLER_WORKFLOW_ID,
            node_ids=["google_ads"],
            error_workflow_id=None,
        )
        mock_load_workflow.side_effect = [error_workflow, caller_workflow]

        request = self.make_service_request()
        result = await trigger_error_workflow(WORKFLOW_ID, request, USER_ID)

        mock_dagster.launch_run.assert_called_once()
        call_kwargs = mock_dagster.launch_run.call_args.kwargs
        assert call_kwargs["workflow_id"] == WORKFLOW_ID
        assert call_kwargs["user_id"] == USER_ID
        assert "error_payload" in call_kwargs["extra_tags"]

        assert result.triggered is True
        assert result.execution_id == "run_dagster_001"

    @pytest.mark.asyncio
    async def test_returns_triggered_false_when_dagster_launch_fails(
        self, mock_load_workflow, mock_dagster
    ):
        from server.services.error_workflow import trigger_error_workflow

        error_workflow = make_workflow(
            workflow_id=WORKFLOW_ID, node_ids=["error_trigger"]
        )
        caller_workflow = make_workflow(
            workflow_id=CALLER_WORKFLOW_ID,
            node_ids=["google_ads"],
            error_workflow_id=None,
        )
        mock_load_workflow.side_effect = [error_workflow, caller_workflow]
        mock_dagster.launch_run.return_value = None  # Dagster unavailable

        request = self.make_service_request()
        result = await trigger_error_workflow(WORKFLOW_ID, request, USER_ID)

        assert result.triggered is False
        assert result.execution_id is None

    @pytest.mark.asyncio
    async def test_passes_error_payload_in_extra_tags(
        self, mock_load_workflow, mock_dagster
    ):
        import json

        from server.services.error_workflow import (
            ERROR_PAYLOAD_TAG_KEY,
            trigger_error_workflow,
        )

        error_workflow = make_workflow(
            workflow_id=WORKFLOW_ID, node_ids=["error_trigger"]
        )
        caller_workflow = make_workflow(
            workflow_id=CALLER_WORKFLOW_ID,
            node_ids=["google_ads"],
            error_workflow_id=None,
        )
        mock_load_workflow.side_effect = [error_workflow, caller_workflow]

        request = self.make_service_request()
        await trigger_error_workflow(WORKFLOW_ID, request, USER_ID)

        extra_tags = mock_dagster.launch_run.call_args.kwargs["extra_tags"]
        payload_json = extra_tags[ERROR_PAYLOAD_TAG_KEY]
        parsed = json.loads(payload_json)
        assert parsed["execution_id"] == SAMPLE_ERROR_PAYLOAD.execution_id
        assert parsed["error_message"] == SAMPLE_ERROR_PAYLOAD.error_message

    @pytest.mark.asyncio
    async def test_loads_both_workflows_with_user_id(
        self, mock_load_workflow, mock_dagster
    ):
        from server.services.error_workflow import trigger_error_workflow

        error_workflow = make_workflow(
            workflow_id=WORKFLOW_ID, node_ids=["error_trigger"]
        )
        caller_workflow = make_workflow(
            workflow_id=CALLER_WORKFLOW_ID,
            node_ids=["google_ads"],
            error_workflow_id=None,
        )
        mock_load_workflow.side_effect = [error_workflow, caller_workflow]

        request = self.make_service_request()
        await trigger_error_workflow(WORKFLOW_ID, request, USER_ID)

        assert mock_load_workflow.await_count == 2
        first_call = mock_load_workflow.await_args_list[0]
        second_call = mock_load_workflow.await_args_list[1]
        assert first_call.args == (WORKFLOW_ID, USER_ID)
        assert second_call.args == (CALLER_WORKFLOW_ID, USER_ID)


# ---------------------------------------------------------------------------
# dagster_client.launch_run extra_tags
# ---------------------------------------------------------------------------


class TestLaunchRunExtraTags:
    def test_extra_tags_merged_into_run_tags(self):
        with patch(
            "server.services.dagster_client.get_dagster_client"
        ) as mock_get_client:
            mock_client = MagicMock()
            mock_client.submit_job_execution.return_value = "run_001"
            mock_get_client.return_value = mock_client

            from server.services.dagster_client import launch_run

            launch_run(
                workflow_id="wf_1",
                workflow_name="My Workflow",
                run_type="all",
                user_id="user_1",
                extra_tags={"error_payload": '{"key": "value"}'},
            )

            call_kwargs = mock_client.submit_job_execution.call_args.kwargs
            tags = call_kwargs["tags"]
            assert tags["workflow_id"] == "wf_1"
            assert tags["user_id"] == "user_1"
            assert tags["error_payload"] == '{"key": "value"}'

    def test_no_extra_tags_leaves_base_tags_unchanged(self):
        with patch(
            "server.services.dagster_client.get_dagster_client"
        ) as mock_get_client:
            mock_client = MagicMock()
            mock_client.submit_job_execution.return_value = "run_002"
            mock_get_client.return_value = mock_client

            from server.services.dagster_client import launch_run

            launch_run(
                workflow_id="wf_2",
                workflow_name="Another Workflow",
                run_type="all",
                user_id="user_2",
            )

            call_kwargs = mock_client.submit_job_execution.call_args.kwargs
            tags = call_kwargs["tags"]
            assert set(tags.keys()) == {"workflow_id", "user_id", "run_type"}


# ---------------------------------------------------------------------------
# trigger-error API endpoint tests (integration via TestClient)
# ---------------------------------------------------------------------------


class TestTriggerErrorEndpoint:
    @pytest.fixture
    def mock_service(self):
        from server.models.error_workflow import TriggerErrorResponse

        with patch(
            "server.api.workflow.trigger_error_workflow",
            new_callable=AsyncMock,
            return_value=TriggerErrorResponse(
                triggered=True, execution_id="run_dagster_001"
            ),
        ) as mock:
            yield mock

    @pytest.mark.unit
    def test_endpoint_returns_200_with_triggered_true(
        self, client: TestClient, mock_service
    ):
        response = client.post(
            f"/api/workflows/{WORKFLOW_ID}/trigger-error",
            json=make_trigger_request(),
        )
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["triggered"] is True
        assert body["execution_id"] == "run_dagster_001"

    @pytest.mark.unit
    def test_endpoint_passes_workflow_id_and_user_id(
        self, client: TestClient, mock_service
    ):
        client.post(
            f"/api/workflows/{WORKFLOW_ID}/trigger-error",
            json=make_trigger_request(),
        )
        call_kwargs = mock_service.call_args.kwargs
        assert call_kwargs["workflow_id"] == WORKFLOW_ID
        assert call_kwargs["user_id"] == USER_ID

    @pytest.mark.unit
    def test_endpoint_returns_404_for_missing_workflow(
        self, client: TestClient, mock_service
    ):
        from server.services.exceptions import WorkflowNotFoundError

        mock_service.side_effect = WorkflowNotFoundError(WORKFLOW_ID)

        response = client.post(
            f"/api/workflows/{WORKFLOW_ID}/trigger-error",
            json=make_trigger_request(),
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.unit
    def test_endpoint_returns_400_for_no_error_trigger_node(
        self, client: TestClient, mock_service
    ):
        mock_service.side_effect = ValueError("no error_trigger node")

        response = client.post(
            f"/api/workflows/{WORKFLOW_ID}/trigger-error",
            json=make_trigger_request(),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "no error_trigger node" in response.json()["detail"]

    @pytest.mark.unit
    def test_endpoint_returns_400_for_loop_prevention(
        self, client: TestClient, mock_service
    ):
        mock_service.side_effect = ValueError("Loop prevention:")

        response = client.post(
            f"/api/workflows/{WORKFLOW_ID}/trigger-error",
            json=make_trigger_request(),
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.unit
    def test_endpoint_returns_200_with_triggered_false_when_dagster_down(
        self, client: TestClient, mock_service
    ):
        from server.models.error_workflow import TriggerErrorResponse

        mock_service.return_value = TriggerErrorResponse(
            triggered=False, execution_id=None
        )

        response = client.post(
            f"/api/workflows/{WORKFLOW_ID}/trigger-error",
            json=make_trigger_request(),
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["triggered"] is False

    @pytest.mark.unit
    def test_endpoint_requires_auth(self, unauthenticated_client: TestClient):
        response = unauthenticated_client.post(
            f"/api/workflows/{WORKFLOW_ID}/trigger-error",
            json=make_trigger_request(),
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
