from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from common.model.user import UserInDB
from common.model.workflow import JobIdRequest, WorkflowData
from server.services.workflow.service import (
    create_new_workflow,
    delete_workflow,
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


def make_workflow_doc(**overrides) -> dict:
    base = {
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
    base.update(overrides)
    return base


def make_mock_database(collection: MagicMock) -> MagicMock:
    mock_db = MagicMock()
    mock_db.__getitem__ = MagicMock(return_value=collection)
    return mock_db


@pytest.fixture
def mock_user_context():
    with patch("server.services.workflow.service.get_current_user") as mock:
        mock.return_value = MOCK_USER
        yield mock


@pytest.fixture
def mock_prefect_client():
    with patch("server.services.workflow.service.prefect_client") as mock:
        mock.sync_deployment = AsyncMock()
        mock.delete_deployment = AsyncMock()
        mock.launch_run = AsyncMock(return_value="run_abc123")
        yield mock


class TestGetAllWorkflows:
    @pytest.mark.asyncio
    async def test_returns_all_user_workflows(self, mock_user_context):
        doc1 = make_workflow_doc(_id="1")
        doc2 = make_workflow_doc(_id="2")

        mock_collection = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[doc1, doc2])
        mock_collection.find.return_value = mock_cursor

        mock_db = make_mock_database(mock_collection)
        with patch("common.database.mongodb.database", mock_db):
            result = await get_all_workflows()

        assert len(result) == 2
        assert result[0].id == "1"
        assert result[1].id == "2"

    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_workflows(self, mock_user_context):
        mock_collection = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[])
        mock_collection.find.return_value = mock_cursor

        mock_db = make_mock_database(mock_collection)
        with patch("common.database.mongodb.database", mock_db):
            result = await get_all_workflows()

        assert result == []


class TestGetWorkflowBuilder:
    @pytest.mark.asyncio
    async def test_returns_workflow_when_found(self, mock_user_context):
        doc = make_workflow_doc()
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=doc)

        mock_db = make_mock_database(mock_collection)
        with patch("common.database.mongodb.database", mock_db):
            result = await get_workflow_builder(JobIdRequest(_id="123"))

        assert result.id == "123"

    @pytest.mark.asyncio
    async def test_raises_validation_error_when_id_missing(self, mock_user_context):
        from server.services.exceptions import ValidationError

        with pytest.raises(ValidationError):
            await get_workflow_builder(JobIdRequest(_id=""))

    @pytest.mark.asyncio
    async def test_raises_not_found_when_doc_absent(self, mock_user_context):
        from server.services.exceptions import WorkflowNotFoundError

        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=None)

        mock_db = make_mock_database(mock_collection)
        with patch("common.database.mongodb.database", mock_db), pytest.raises(WorkflowNotFoundError):
            await get_workflow_builder(JobIdRequest(_id="123"))


class TestUpdateWorkflow:
    @pytest.mark.asyncio
    async def test_success(self, mock_user_context, mock_prefect_client):
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 1
        mock_collection = MagicMock()
        mock_collection.update_one = AsyncMock(return_value=mock_update_result)

        workflow = WorkflowData(**make_workflow_doc())

        mock_db = make_mock_database(mock_collection)
        with patch("common.database.mongodb.database", mock_db), patch(
            "server.services.workflow.service.database", mock_db
        ):
            result = await update_workflow(workflow)

        assert result is True
        mock_collection.update_one.assert_awaited_once()
        mock_prefect_client.sync_deployment.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_raises_validation_error_when_id_missing(self, mock_user_context):
        from server.services.exceptions import ValidationError

        doc = make_workflow_doc()
        del doc["_id"]
        workflow = WorkflowData(**doc)
        workflow.id = None

        with pytest.raises(ValidationError):
            await update_workflow(workflow)

    @pytest.mark.asyncio
    async def test_raises_not_found_when_no_match(self, mock_user_context):
        from server.services.exceptions import WorkflowNotFoundError

        mock_update_result = MagicMock()
        mock_update_result.matched_count = 0
        mock_collection = MagicMock()
        mock_collection.update_one = AsyncMock(return_value=mock_update_result)

        workflow = WorkflowData(**make_workflow_doc())

        mock_db = make_mock_database(mock_collection)
        with patch("common.database.mongodb.database", mock_db), patch(
            "server.services.workflow.service.database", mock_db
        ), pytest.raises(WorkflowNotFoundError):
            await update_workflow(workflow)


class TestDeleteWorkflow:
    @pytest.mark.asyncio
    async def test_success(self, mock_user_context, mock_prefect_client):
        doc = make_workflow_doc()
        mock_delete_result = MagicMock()
        mock_delete_result.deleted_count = 1
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=doc)
        mock_collection.delete_one = AsyncMock(return_value=mock_delete_result)

        mock_db = make_mock_database(mock_collection)
        with patch("common.database.mongodb.database", mock_db), patch(
            "server.services.workflow.service.database", mock_db
        ):
            result = await delete_workflow("123")

        assert result is True
        mock_prefect_client.delete_deployment.assert_awaited_once_with("123")

    @pytest.mark.asyncio
    async def test_returns_false_when_id_empty(self, mock_user_context):
        assert await delete_workflow("") is False

    @pytest.mark.asyncio
    async def test_returns_false_when_workflow_not_found(self, mock_user_context):
        mock_collection = MagicMock()
        mock_collection.find_one = AsyncMock(return_value=None)

        mock_db = make_mock_database(mock_collection)
        with patch("common.database.mongodb.database", mock_db), patch(
            "server.services.workflow.service.database", mock_db
        ):
            result = await delete_workflow("123")

        assert result is False


class TestCreateNewWorkflow:
    @pytest.mark.asyncio
    async def test_success(self, mock_user_context, mock_prefect_client):
        mock_collection = MagicMock()
        mock_collection.insert_one = AsyncMock()

        workflow = WorkflowData(**make_workflow_doc())

        mock_db = make_mock_database(mock_collection)
        with patch("common.database.mongodb.database", mock_db), patch(
            "server.services.workflow.service.database", mock_db
        ):
            result = await create_new_workflow(workflow)

        assert result.id is not None
        mock_collection.insert_one.assert_awaited_once()
        mock_prefect_client.sync_deployment.assert_awaited_once()
