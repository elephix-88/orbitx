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

# Create a mock user for context
_MOCK_USER = UserInDB(
    id="test_user_id_123",
    email="test@example.com",
    name="Test User",
    picture="https://example.com/avatar.png",
    role="user",
    is_active=True,
)


@pytest.fixture
def mock_mongodb():
    with patch("server.services.workflow.mongodb_client") as mock:
        yield mock


@pytest.fixture
def mock_scheduler_service():
    with patch("server.services.workflow.scheduler_service") as mock:
        yield mock


@pytest.fixture
def mock_settings():
    with patch("server.services.workflow.settings") as mock:
        mock.workflow_collection = "workflows"
        mock.google_cloud_project_id = "test-project"
        mock.google_cloud_location = "us-central1"
        mock.google_cloud_job_name = "test-job"
        yield mock


@pytest.fixture
def mock_user_context():
    """Mock the user context for service functions."""
    with patch("server.services.workflow.get_current_user") as mock:
        mock.return_value = _MOCK_USER
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


class TestWorkflowService:
    def test_get_all_workflows(
        self, mock_mongodb, mock_settings, mock_user_context, valid_workflow_data
    ):
        # Arrange
        data1 = valid_workflow_data.copy()
        data1["_id"] = "1"
        data2 = valid_workflow_data.copy()
        data2["_id"] = "2"

        mock_mongodb.get_all_documents.return_value = [data1, data2]

        # Act
        result = get_all_workflows()

        # Assert
        assert len(result) == 2
        assert result[0].id == "1"
        assert result[1].id == "2"
        mock_mongodb.get_all_documents.assert_called_once()

    def test_get_workflow_builder_success(
        self, mock_mongodb, mock_settings, mock_user_context, valid_workflow_data
    ):
        # Arrange
        request = JobIdRequest(_id="123")
        mock_mongodb.get_document.return_value = WorkflowData(**valid_workflow_data)

        # Act
        result = get_workflow_builder(request)

        # Assert
        assert result.id == "123"
        mock_mongodb.get_document.assert_called_once()

    def test_get_workflow_builder_missing_id(self, mock_user_context):
        # JobIdRequest validates presence of id, but if we pass empty string it might fail validation or logic
        # If we pass None, pydantic raises ValidationError before function call if not optional
        # The function checks `if not request.id`.
        request = JobIdRequest(_id="")
        with pytest.raises(HTTPException) as exc:
            get_workflow_builder(request)
        assert exc.value.status_code == 400

    def test_get_workflow_builder_not_found(
        self, mock_mongodb, mock_settings, mock_user_context
    ):
        request = JobIdRequest(_id="123")
        mock_mongodb.get_document.return_value = None

        with pytest.raises(HTTPException) as exc:
            get_workflow_builder(request)
        assert exc.value.status_code == 404

    def test_update_workflow_success(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        workflow = WorkflowData(**valid_workflow_data)
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 1
        mock_mongodb.update_document.return_value = mock_update_result
        mock_scheduler_service.update_workflow_schedule.return_value = True

        # Act
        result = update_workflow(workflow)

        # Assert
        assert result is True
        mock_mongodb.update_document.assert_called_once()
        mock_scheduler_service.update_workflow_schedule.assert_called_once()

    def test_update_workflow_missing_id(self, mock_user_context, valid_workflow_data):
        data = valid_workflow_data.copy()
        data["_id"] = None  # Pydantic might allow None if optional, or we omit it
        del data["_id"]
        # WorkflowData id is optional (default None) or alias _id
        workflow = WorkflowData(**data)
        # Ensure id is None
        workflow.id = None

        with pytest.raises(HTTPException) as exc:
            update_workflow(workflow)
        assert exc.value.status_code == 400

    def test_update_workflow_not_found(
        self, mock_mongodb, mock_settings, mock_user_context, valid_workflow_data
    ):
        workflow = WorkflowData(**valid_workflow_data)
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 0
        mock_mongodb.update_document.return_value = mock_update_result

        with pytest.raises(HTTPException) as exc:
            update_workflow(workflow)
        assert exc.value.status_code == 404

    def test_update_workflow_scheduler_failure(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        workflow = WorkflowData(**valid_workflow_data)
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 1
        mock_mongodb.update_document.return_value = mock_update_result
        mock_scheduler_service.update_workflow_schedule.return_value = False

        # Act
        result = update_workflow(workflow)

        # Assert
        assert result is True  # Should still return true as DB update succeeded
        mock_scheduler_service.update_workflow_schedule.assert_called_once()

    def test_update_workflow_scheduler_exception(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        workflow = WorkflowData(**valid_workflow_data)
        mock_update_result = MagicMock()
        mock_update_result.matched_count = 1
        mock_mongodb.update_document.return_value = mock_update_result
        mock_scheduler_service.update_workflow_schedule.side_effect = Exception(
            "Scheduler Error"
        )

        # Act
        result = update_workflow(workflow)

        # Assert
        assert result is True

    def test_delete_workflow_success(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        mock_mongodb.get_document.return_value = WorkflowData(**valid_workflow_data)
        mock_scheduler_service.delete_workflow_schedule.return_value = True
        mock_mongodb.delete_document.return_value = True

        # Act
        result = delete_workflow("123")

        # Assert
        assert result is True
        mock_scheduler_service.delete_workflow_schedule.assert_called_once_with(
            job_id="123"
        )
        mock_mongodb.delete_document.assert_called_once()

    def test_delete_workflow_missing_id(self, mock_user_context):
        assert delete_workflow("") is False

    def test_delete_workflow_scheduler_failure(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        mock_mongodb.get_document.return_value = WorkflowData(**valid_workflow_data)
        mock_scheduler_service.delete_workflow_schedule.return_value = False
        mock_mongodb.delete_document.return_value = True

        # Act
        result = delete_workflow("123")

        # Assert
        assert result is True  # Should proceed to delete from DB

    def test_delete_workflow_scheduler_exception(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        mock_mongodb.get_document.return_value = WorkflowData(**valid_workflow_data)
        mock_scheduler_service.delete_workflow_schedule.side_effect = Exception("Error")
        mock_mongodb.delete_document.return_value = True

        # Act
        result = delete_workflow("123")

        # Assert
        assert result is True

    def test_delete_workflow_get_error(
        self, mock_mongodb, mock_settings, mock_user_context
    ):
        # Arrange
        mock_mongodb.get_document.side_effect = Exception("DB Error")
        mock_mongodb.delete_document.return_value = True

        # Act
        result = delete_workflow("123")

        # Assert - when get_document fails, delete_workflow returns False
        assert result is False

    def test_create_new_workflow_success(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        workflow = WorkflowData(**valid_workflow_data)
        # Ensure ID is None to trigger generation (though we pass 123 in valid_workflow_data, let's clear it)
        workflow.id = None

        mock_mongodb.insert_document.return_value = "new_id_123"
        mock_scheduler_service.create_workflow_schedule.return_value = True

        # Act
        result = create_new_workflow(workflow)

        # Assert
        assert result.id == "new_id_123"
        mock_scheduler_service.create_workflow_schedule.assert_called_once()

    def test_create_new_workflow_scheduler_failure(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        workflow = WorkflowData(**valid_workflow_data)
        workflow.id = None
        mock_mongodb.insert_document.return_value = "new_id_123"
        mock_scheduler_service.create_workflow_schedule.return_value = False

        # Act
        result = create_new_workflow(workflow)

        # Assert
        assert result.id == "new_id_123"

    def test_create_new_workflow_scheduler_exception(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        workflow = WorkflowData(**valid_workflow_data)
        workflow.id = None
        mock_mongodb.insert_document.return_value = "new_id_123"
        mock_scheduler_service.create_workflow_schedule.side_effect = Exception("Error")

        # Act
        result = create_new_workflow(workflow)

        # Assert
        assert result.id == "new_id_123"

    def test_execute_workflow_success(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        mock_mongodb.get_document.return_value = valid_workflow_data
        mock_scheduler_service.run_workflow_schedule.return_value = True

        # Act
        result = execute_workflow("job_123")

        # Assert
        assert result is True
        mock_scheduler_service.run_workflow_schedule.assert_called_once_with("job_123")

    def test_execute_workflow_failure(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
        valid_workflow_data,
    ):
        # Arrange
        mock_mongodb.get_document.return_value = valid_workflow_data
        mock_scheduler_service.run_workflow_schedule.side_effect = Exception(
            "Scheduler Error"
        )

        # Act & Assert
        with pytest.raises(HTTPException) as exc:
            execute_workflow("job_123")
        assert exc.value.status_code == 500

    def test_execute_workflow_not_found(
        self,
        mock_mongodb,
        mock_scheduler_service,
        mock_settings,
        mock_user_context,
    ):
        # Arrange
        mock_mongodb.get_document.return_value = None

        # Act & Assert
        with pytest.raises(HTTPException) as exc:
            execute_workflow("job_123")
        assert exc.value.status_code == 404

    def test_execute_workflow_missing_id(self, mock_user_context):
        # Act & Assert
        with pytest.raises(HTTPException) as exc:
            execute_workflow("")
        assert exc.value.status_code == 400
