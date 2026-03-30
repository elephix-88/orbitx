from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from common.model.user import UserInDB
from common.model.workflow import JobIdRequest, WorkflowData
from server.services.workflow import (
    create_new_workflow,
    delete_workflow,
    execute_workflow,
    get_all_workflows,
    get_workflow_builder,
    update_workflow,
)

MOCK_USER = UserInDB(
    id="test_user_id_123",
    email="test@example.com",
    name="Test User",
    picture="https://example.com/avatar.png",
    role="user",
    is_active=True,
)


@pytest.fixture
def mock_mongodb():
    with patch("server.services.workflow.get_mongodb") as mock:
        yield mock.return_value


@pytest.fixture
def mock_dagster_client():
    with patch("server.services.workflow.dagster_client") as mock:
        yield mock


@pytest.fixture
def mock_settings():
    with patch("server.services.workflow.settings") as mock:
        mock.workflow_collection = "workflows"
        yield mock


@pytest.fixture
def mock_user_context():
    with patch("server.services.workflow.get_current_user") as mock:
        mock.return_value = MOCK_USER
        yield mock


@pytest.fixture
def valid_workflow_data():
    return {
        "_id": "123",
        "user_id": "test_user_id_123",
        "job_name": "Test Job",
        "status": "ACTIVE",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "schedule_expression": "* * * * *",
        "nodes": [],
        "connections": [],
    }


class TestGetWorkflows:
    async def test_returns_all_user_workflows(
        self, mock_mongodb, mock_settings, mock_user_context, valid_workflow_data
    ):
        data1 = valid_workflow_data.copy()
        data1["_id"] = "1"
        data2 = valid_workflow_data.copy()
        data2["_id"] = "2"
        mock_mongodb.get_all_documents.return_value = [data1, data2]

        result = await get_all_workflows()

        assert len(result) == 2
        assert result[0].id == "1"
        assert result[1].id == "2"

    async def test_get_builder_success(
        self, mock_mongodb, mock_settings, mock_user_context, valid_workflow_data
    ):
        request = JobIdRequest(_id="123")
        mock_mongodb.get_document.return_value = WorkflowData(**valid_workflow_data)

        result = await get_workflow_builder(request)

        assert result.id == "123"

    async def test_get_builder_missing_id(self, mock_user_context):
        request = JobIdRequest(_id="")
        with pytest.raises(HTTPException) as exc:
            await get_workflow_builder(request)
        assert exc.value.status_code == 400

    async def test_get_builder_not_found(
        self, mock_mongodb, mock_settings, mock_user_context
    ):
        request = JobIdRequest(_id="123")
        mock_mongodb.get_document.return_value = None

        with pytest.raises(HTTPException) as exc:
            await get_workflow_builder(request)
        assert exc.value.status_code == 404


class TestUpdateWorkflow:
    async def test_success(
        self, mock_mongodb, mock_dagster_client, mock_settings,
        mock_user_context, valid_workflow_data
    ):
        workflow = WorkflowData(**valid_workflow_data)
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 1
        mock_mongodb.update_document.return_value = mock_update_result

        result = await update_workflow(workflow)

        assert result is True
        mock_mongodb.update_document.assert_called_once()
        mock_dagster_client.reload_code_location.assert_called_once()

    async def test_missing_id(self, mock_user_context, valid_workflow_data):
        data = valid_workflow_data.copy()
        del data["_id"]
        workflow = WorkflowData(**data)
        workflow.id = None

        with pytest.raises(HTTPException) as exc:
            await update_workflow(workflow)
        assert exc.value.status_code == 400

    async def test_not_found(
        self, mock_mongodb, mock_settings, mock_user_context, valid_workflow_data
    ):
        workflow = WorkflowData(**valid_workflow_data)
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 0
        mock_mongodb.update_document.return_value = mock_update_result

        with pytest.raises(HTTPException) as exc:
            await update_workflow(workflow)
        assert exc.value.status_code == 404


class TestDeleteWorkflow:
    async def test_success(
        self, mock_mongodb, mock_dagster_client, mock_settings,
        mock_user_context, valid_workflow_data
    ):
        mock_mongodb.get_document.return_value = WorkflowData(**valid_workflow_data)
        mock_mongodb.delete_document.return_value = True

        result = await delete_workflow("123")

        assert result is True
        mock_dagster_client.reload_code_location.assert_called_once()
        mock_mongodb.delete_document.assert_called_once()

    async def test_missing_id(self, mock_user_context):
        assert await delete_workflow("") is False

    async def test_not_found(
        self, mock_mongodb, mock_settings, mock_user_context
    ):
        mock_mongodb.get_document.return_value = None

        result = await delete_workflow("123")

        assert result is False


class TestCreateWorkflow:
    async def test_success(
        self, mock_mongodb, mock_dagster_client, mock_settings,
        mock_user_context, valid_workflow_data
    ):
        workflow = WorkflowData(**valid_workflow_data)
        workflow.id = None
        mock_mongodb.insert_document.return_value = "new_id_123"

        result = await create_new_workflow(workflow)

        assert result.id == "new_id_123"
        mock_dagster_client.reload_code_location.assert_called_once()


class TestExecuteWorkflow:
    async def test_success(
        self, mock_mongodb, mock_dagster_client, mock_settings,
        mock_user_context, valid_workflow_data
    ):
        mock_mongodb.get_document.return_value = WorkflowData(**valid_workflow_data)
        mock_dagster_client.launch_run.return_value = "run_abc123"

        result = await execute_workflow("job_123")

        assert result is True
        mock_dagster_client.launch_run.assert_called_once()

    async def test_dagster_failure(
        self, mock_mongodb, mock_dagster_client, mock_settings,
        mock_user_context, valid_workflow_data
    ):
        mock_mongodb.get_document.return_value = WorkflowData(**valid_workflow_data)
        mock_dagster_client.launch_run.return_value = None

        with pytest.raises(HTTPException) as exc:
            await execute_workflow("job_123")
        assert exc.value.status_code == 500

    async def test_not_found(
        self, mock_mongodb, mock_dagster_client, mock_settings, mock_user_context
    ):
        mock_mongodb.get_document.return_value = None

        with pytest.raises(HTTPException) as exc:
            await execute_workflow("job_123")
        assert exc.value.status_code == 404

    async def test_missing_id(self, mock_user_context):
        with pytest.raises(HTTPException) as exc:
            await execute_workflow("")
        assert exc.value.status_code == 400
