"""Unit tests for Google Cloud Scheduler service."""

from unittest.mock import MagicMock, patch

import pytest
from google.api_core import exceptions
from google.cloud import scheduler_v1

from server.services.google.scheduler import SchedulerService, scheduler_service


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    with patch("server.services.google.scheduler.settings") as mock:
        mock.google_cloud_scheduler_enabled = True
        mock.google_cloud_project_id = "test-project"
        mock.google_cloud_location = "us-central1"
        mock.google_cloud_job_name = "test-job"
        mock.google_cloud_project_number = "123456789"
        mock.google_cloud_scheduler_timezone = "UTC"
        mock.google_cloud_service_account_email = "test@example.com"
        yield mock


@pytest.fixture
def mock_scheduler_client():
    """Mock Cloud Scheduler client."""
    with patch("server.services.google.scheduler.scheduler_v1.CloudSchedulerClient") as mock:
        yield mock


class TestSchedulerService:
    """Test cases for SchedulerService class."""

    def test_init_enabled(self, mock_settings, mock_scheduler_client):
        """Test initialization when scheduler is enabled."""
        service = SchedulerService()

        assert service.enabled is True
        assert service.project_id == "test-project"
        assert service.location == "us-central1"
        assert service.cloud_run_job_name == "test-job"
        mock_scheduler_client.assert_called_once()

    def test_init_disabled(self, mock_settings, mock_scheduler_client):
        """Test initialization when scheduler is disabled."""
        mock_settings.google_cloud_scheduler_enabled = False
        service = SchedulerService()

        assert service.enabled is False

    def test_get_job_path(self, mock_settings, mock_scheduler_client):
        """Test job path generation."""
        service = SchedulerService()
        job_path = service._get_job_path("test_job_123")

        expected = (
            "projects/test-project/locations/us-central1/jobs/workflow-test-job-123"
        )
        assert job_path == expected

    def test_get_job_path_sanitization(self, mock_settings, mock_scheduler_client):
        """Test job path sanitization for special characters."""
        service = SchedulerService()
        job_path = service._get_job_path("Test Job_With Spaces")

        assert "workflow-test-job-with-spaces" in job_path

    def test_create_workflow_schedule_success(
        self, mock_settings, mock_scheduler_client
    ):
        """Test successful workflow schedule creation."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        mock_job = MagicMock()
        mock_job.name = "projects/test-project/locations/us-central1/jobs/workflow-test"
        mock_client_instance.create_job.return_value = mock_job

        service = SchedulerService()
        result = service.create_workflow_schedule(
            job_id="test_workflow",
            job_name="Test Workflow",
            schedule_expression="0 0 * * *",
        )

        assert result is True
        mock_client_instance.create_job.assert_called_once()

    def test_create_workflow_schedule_disabled(
        self, mock_settings, mock_scheduler_client
    ):
        """Test workflow schedule creation when scheduler is disabled."""
        mock_settings.google_cloud_scheduler_enabled = False
        service = SchedulerService()

        result = service.create_workflow_schedule(
            job_id="test_workflow",
            job_name="Test Workflow",
            schedule_expression="0 0 * * *",
        )

        assert result is False

    def test_create_workflow_schedule_empty_expression(
        self, mock_settings, mock_scheduler_client
    ):
        """Test workflow schedule creation with empty schedule expression."""
        service = SchedulerService()

        result = service.create_workflow_schedule(
            job_id="test_workflow", job_name="Test Workflow", schedule_expression=""
        )

        assert result is False

    def test_create_workflow_schedule_already_exists(
        self, mock_settings, mock_scheduler_client
    ):
        """Test workflow schedule creation when job already exists - should raise exception."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        # Create raises AlreadyExists
        mock_client_instance.create_job.side_effect = exceptions.AlreadyExists(
            "Job exists"
        )

        service = SchedulerService()

        # Should raise the exception
        with pytest.raises(exceptions.AlreadyExists):
            service.create_workflow_schedule(
                job_id="test_workflow",
                job_name="Test Workflow",
                schedule_expression="0 0 * * *",
            )

    def test_update_workflow_schedule_success(
        self, mock_settings, mock_scheduler_client
    ):
        """Test successful workflow schedule update."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        # Mock existing job
        mock_existing_job = MagicMock()
        mock_client_instance.get_job.return_value = mock_existing_job

        # Mock update
        mock_updated_job = MagicMock()
        mock_updated_job.name = (
            "projects/test-project/locations/us-central1/jobs/workflow-test"
        )
        mock_client_instance.update_job.return_value = mock_updated_job

        service = SchedulerService()
        result = service.update_workflow_schedule(
            job_id="test_workflow",
            job_name="Test Workflow",
            schedule_expression="0 12 * * *",
        )

        assert result is True
        mock_client_instance.update_job.assert_called_once()

    def test_update_workflow_schedule_not_found(
        self, mock_settings, mock_scheduler_client
    ):
        """Test workflow schedule update when job doesn't exist."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        # Mock job not found
        mock_client_instance.get_job.side_effect = exceptions.NotFound("Job not found")

        # Mock successful creation
        mock_new_job = MagicMock()
        mock_new_job.name = (
            "projects/test-project/locations/us-central1/jobs/workflow-test"
        )
        mock_client_instance.create_job.return_value = mock_new_job

        service = SchedulerService()
        result = service.update_workflow_schedule(
            job_id="test_workflow",
            job_name="Test Workflow",
            schedule_expression="0 12 * * *",
        )

        # Should create a new job
        assert result is True
        mock_client_instance.create_job.assert_called_once()

    def test_update_workflow_schedule_empty_expression(
        self, mock_settings, mock_scheduler_client
    ):
        """Test workflow schedule update with empty expression deletes the job."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        service = SchedulerService()
        service.update_workflow_schedule(
            job_id="test_workflow", job_name="Test Workflow", schedule_expression=""
        )

        # Should attempt to delete
        mock_client_instance.delete_job.assert_called_once()

    def test_delete_workflow_schedule_success(
        self, mock_settings, mock_scheduler_client
    ):
        """Test successful workflow schedule deletion."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        service = SchedulerService()
        result = service.delete_workflow_schedule(job_id="test_workflow")

        assert result is True
        mock_client_instance.delete_job.assert_called_once()

    def test_delete_workflow_schedule_not_found(
        self, mock_settings, mock_scheduler_client
    ):
        """Test workflow schedule deletion when job doesn't exist."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        mock_client_instance.delete_job.side_effect = exceptions.NotFound(
            "Job not found"
        )

        service = SchedulerService()
        result = service.delete_workflow_schedule(job_id="test_workflow")

        # Should still return True (idempotent)
        assert result is True

    def test_pause_workflow_schedule_success(
        self, mock_settings, mock_scheduler_client
    ):
        """Test successful workflow schedule pause."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        mock_paused_job = MagicMock()
        mock_paused_job.name = (
            "projects/test-project/locations/us-central1/jobs/workflow-test"
        )
        mock_client_instance.pause_job.return_value = mock_paused_job

        service = SchedulerService()
        result = service.pause_workflow_schedule(job_id="test_workflow")

        assert result is True
        mock_client_instance.pause_job.assert_called_once()

    def test_resume_workflow_schedule_success(
        self, mock_settings, mock_scheduler_client
    ):
        """Test successful workflow schedule resume."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        mock_resumed_job = MagicMock()
        mock_resumed_job.name = (
            "projects/test-project/locations/us-central1/jobs/workflow-test"
        )
        mock_client_instance.resume_job.return_value = mock_resumed_job

        service = SchedulerService()
        result = service.resume_workflow_schedule(job_id="test_workflow")

        assert result is True
        mock_client_instance.resume_job.assert_called_once()

    def test_get_workflow_schedule_success(self, mock_settings, mock_scheduler_client):
        """Test successful workflow schedule retrieval."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        mock_job = MagicMock(spec=scheduler_v1.Job)
        mock_job.name = "projects/test-project/locations/us-central1/jobs/workflow-test"
        mock_job.schedule = "0 0 * * *"
        mock_client_instance.get_job.return_value = mock_job

        service = SchedulerService()
        result = service.get_workflow_schedule(job_id="test_workflow")

        assert result is not None
        assert (
            result.name
            == "projects/test-project/locations/us-central1/jobs/workflow-test"
        )
        assert result.schedule == "0 0 * * *"

    def test_get_workflow_schedule_not_found(
        self, mock_settings, mock_scheduler_client
    ):
        """Test workflow schedule retrieval when job doesn't exist."""
        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        mock_client_instance.get_job.side_effect = exceptions.NotFound("Job not found")

        service = SchedulerService()
        result = service.get_workflow_schedule(job_id="test_workflow")

        assert result is None

    def test_singleton_instance(self):
        """Test that scheduler_service is properly instantiated."""
        assert scheduler_service is not None
        assert isinstance(scheduler_service, SchedulerService)


class TestSchedulerServiceIntegration:
    """Integration tests for scheduler service with workflow operations."""

    @patch("server.services.google.scheduler.scheduler_v1.CloudSchedulerClient")
    @patch("server.services.google.scheduler.settings")
    def test_create_update_delete_workflow_lifecycle(
        self, mock_settings, mock_scheduler_client
    ):
        """Test complete lifecycle: create, update, delete."""
        # Setup mocks
        mock_settings.google_cloud_scheduler_enabled = True
        mock_settings.google_cloud_project_id = "test-project"
        mock_settings.google_cloud_location = "us-central1"
        mock_settings.google_cloud_job_name = "test-job"
        mock_settings.google_cloud_project_number = "123456789"
        mock_settings.google_cloud_scheduler_timezone = "UTC"
        mock_settings.google_cloud_service_account_email = "test@example.com"

        mock_client_instance = MagicMock()
        mock_scheduler_client.return_value = mock_client_instance

        # Mock job responses
        mock_job = MagicMock()
        mock_job.name = "projects/test-project/locations/us-central1/jobs/workflow-test"
        mock_client_instance.create_job.return_value = mock_job
        mock_client_instance.get_job.return_value = mock_job
        mock_client_instance.update_job.return_value = mock_job

        service = SchedulerService()

        # Create
        create_result = service.create_workflow_schedule(
            job_id="test_workflow",
            job_name="Test Workflow",
            schedule_expression="0 0 * * *",
        )
        assert create_result is True

        # Update
        update_result = service.update_workflow_schedule(
            job_id="test_workflow",
            job_name="Test Workflow Updated",
            schedule_expression="0 12 * * *",
        )
        assert update_result is True

        # Delete
        delete_result = service.delete_workflow_schedule(job_id="test_workflow")
        assert delete_result is True

        # Verify call counts
        assert mock_client_instance.create_job.call_count == 1
        assert mock_client_instance.update_job.call_count == 1
        assert mock_client_instance.delete_job.call_count == 1
