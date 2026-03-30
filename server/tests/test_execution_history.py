"""Tests for execution_history service module."""
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest
from bson import ObjectId

from common.model.user import UserInDB

# Mock user for tests
_MOCK_USER = UserInDB(
    id="test_user_id_123",
    email="test@example.com",
    name="Test User",
    role="user",
    is_active=True,
)


class TestGetDashboardStats:
    """Tests for get_dashboard_stats function."""

    @pytest.fixture
    def mock_mongodb(self):
        """Mock MongoDB client."""
        with patch("server.services.execution_history.mongodb_client") as mock:
            yield mock

    @pytest.fixture
    def mock_settings(self):
        """Mock settings."""
        with patch("server.services.execution_history.settings") as mock:
            mock.workflow_collection = "workflows"
            mock.execution_history_collection = "execution_history"
            yield mock

    @pytest.fixture
    def sample_workflows(self):
        """Sample workflow data."""
        return [
            MagicMock(id="workflow_1", job_name="Workflow One"),
            MagicMock(id="workflow_2", job_name="Workflow Two"),
        ]

    @pytest.fixture
    def sample_aggregation_result(self):
        """Sample aggregation pipeline result."""
        return [
            {
                "stats": [
                    {
                        "_id": None,
                        "total": 100,
                        "successful": 85,
                        "failed": 10,
                        "running": 5,
                        "total_duration": 5000,
                        "duration_count": 95,
                    }
                ],
                "by_workflow": [
                    {"_id": "workflow_1", "count": 60, "successful": 55},
                    {"_id": "workflow_2", "count": 40, "successful": 30},
                ],
                "recent": [
                    {
                        "_id": ObjectId(),
                        "workflow_id": "workflow_1",
                        "status": "SUCCESS",
                        "start_time": datetime.now(UTC),
                        "duration": 50,
                    },
                    {
                        "_id": ObjectId(),
                        "workflow_id": "workflow_2",
                        "status": "FAILED",
                        "start_time": datetime.now(UTC),
                        "duration": 30,
                    },
                ],
            }
        ]

    def test_get_dashboard_stats_success(
        self, mock_mongodb, mock_settings, sample_workflows, sample_aggregation_result
    ):
        """Test successful dashboard stats retrieval."""
        from server.services.execution_history import get_dashboard_stats

        mock_mongodb.get_all_documents.return_value = sample_workflows
        mock_mongodb.aggregate.return_value = sample_aggregation_result

        result = get_dashboard_stats(user_id="test_user_id_123")

        assert result["total_executions"] == 100
        assert result["successful_executions"] == 85
        assert result["failed_executions"] == 10
        assert result["running_executions"] == 5
        assert result["success_rate"] == 85  # 85/100 * 100
        assert result["avg_duration"] == pytest.approx(5000 / 95, rel=1e-2)
        assert len(result["recent_executions"]) == 2
        assert "workflow_1" in result["executions_by_workflow"]
        assert "workflow_2" in result["executions_by_workflow"]

    def test_get_dashboard_stats_no_workflows(self, mock_mongodb, mock_settings):
        """Test dashboard stats when user has no workflows."""
        from server.services.execution_history import get_dashboard_stats

        mock_mongodb.get_all_documents.return_value = []

        result = get_dashboard_stats(user_id="test_user_id_123")

        assert result["total_executions"] == 0
        assert result["successful_executions"] == 0
        assert result["failed_executions"] == 0
        assert result["running_executions"] == 0
        assert result["success_rate"] == 0
        assert result["avg_duration"] == 0
        assert result["recent_executions"] == []
        assert result["executions_by_workflow"] == {}

    def test_get_dashboard_stats_no_executions(
        self, mock_mongodb, mock_settings, sample_workflows
    ):
        """Test dashboard stats when workflows have no executions."""
        from server.services.execution_history import get_dashboard_stats

        mock_mongodb.get_all_documents.return_value = sample_workflows
        mock_mongodb.aggregate.return_value = []

        result = get_dashboard_stats(user_id="test_user_id_123")

        assert result["total_executions"] == 0
        assert result["recent_executions"] == []
        assert result["executions_by_workflow"] == {}

    def test_get_dashboard_stats_empty_stats(
        self, mock_mongodb, mock_settings, sample_workflows
    ):
        """Test dashboard stats when aggregation returns empty stats."""
        from server.services.execution_history import get_dashboard_stats

        mock_mongodb.get_all_documents.return_value = sample_workflows
        mock_mongodb.aggregate.return_value = [
            {
                "stats": [],  # Empty stats
                "by_workflow": [],
                "recent": [],
            }
        ]

        result = get_dashboard_stats(user_id="test_user_id_123")

        assert result["total_executions"] == 0
        assert result["success_rate"] == 0
        assert result["avg_duration"] == 0

    def test_get_dashboard_stats_with_workflow_ids(
        self, mock_mongodb, mock_settings, sample_aggregation_result
    ):
        """Test dashboard stats with specific workflow IDs."""
        from server.services.execution_history import get_dashboard_stats

        mock_mongodb.get_all_documents.return_value = [
            MagicMock(id="workflow_1", job_name="Workflow One"),
        ]
        mock_mongodb.aggregate.return_value = sample_aggregation_result

        get_dashboard_stats(
            user_id="test_user_id_123",
            workflow_ids=["workflow_1"],
        )

        # Should query with specific workflow IDs
        mock_mongodb.get_all_documents.assert_called_once()
        call_args = mock_mongodb.get_all_documents.call_args
        assert call_args[1]["query"]["_id"]["$in"] == ["workflow_1"]

    def test_get_dashboard_stats_with_workflow_ids_and_names(
        self, mock_mongodb, mock_settings, sample_aggregation_result
    ):
        """Test dashboard stats when both IDs and names are provided."""
        from server.services.execution_history import get_dashboard_stats

        mock_mongodb.aggregate.return_value = sample_aggregation_result

        result = get_dashboard_stats(
            user_id="test_user_id_123",
            workflow_ids=["workflow_1", "workflow_2"],
            workflow_names={"workflow_1": "Workflow One", "workflow_2": "Workflow Two"},
        )

        # Should NOT query workflows from DB when both IDs and names provided
        mock_mongodb.get_all_documents.assert_not_called()
        assert result["total_executions"] == 100

    def test_get_dashboard_stats_zero_division_protection(
        self, mock_mongodb, mock_settings, sample_workflows
    ):
        """Test that zero division is handled properly."""
        from server.services.execution_history import get_dashboard_stats

        mock_mongodb.get_all_documents.return_value = sample_workflows
        mock_mongodb.aggregate.return_value = [
            {
                "stats": [
                    {
                        "_id": None,
                        "total": 0,  # Zero total
                        "successful": 0,
                        "failed": 0,
                        "running": 0,
                        "total_duration": 0,
                        "duration_count": 0,  # Zero duration count
                    }
                ],
                "by_workflow": [],
                "recent": [],
            }
        ]

        result = get_dashboard_stats(user_id="test_user_id_123")

        assert result["success_rate"] == 0  # Should not divide by zero
        assert result["avg_duration"] == 0  # Should not divide by zero

    def test_get_dashboard_stats_workflow_names_in_recent(
        self, mock_mongodb, mock_settings, sample_workflows
    ):
        """Test that workflow names are added to recent executions."""
        from server.services.execution_history import get_dashboard_stats

        mock_mongodb.get_all_documents.return_value = sample_workflows
        mock_mongodb.aggregate.return_value = [
            {
                "stats": [
                    {
                        "_id": None,
                        "total": 1,
                        "successful": 1,
                        "failed": 0,
                        "running": 0,
                        "total_duration": 50,
                        "duration_count": 1,
                    }
                ],
                "by_workflow": [{"_id": "workflow_1", "count": 1, "successful": 1}],
                "recent": [
                    {
                        "_id": ObjectId(),
                        "workflow_id": "workflow_1",
                        "status": "SUCCESS",
                    }
                ],
            }
        ]

        result = get_dashboard_stats(user_id="test_user_id_123")

        assert result["recent_executions"][0]["workflow_name"] == "Workflow One"


class TestGetExecutionHistoryByWorkflow:
    """Tests for get_execution_history_by_workflow function."""

    @pytest.fixture
    def mock_mongodb(self):
        """Mock MongoDB client."""
        with patch("server.services.execution_history.mongodb_client") as mock:
            yield mock

    @pytest.fixture
    def mock_settings(self):
        """Mock settings."""
        with patch("server.services.execution_history.settings") as mock:
            mock.workflow_collection = "workflows"
            mock.execution_history_collection = "execution_history"
            yield mock

    @pytest.fixture
    def mock_user_context(self):
        """Mock the user context."""
        with patch("server.services.execution_history.get_current_user") as mock:
            mock.return_value = _MOCK_USER
            yield mock

    @pytest.fixture
    def sample_workflow(self):
        """Sample workflow document."""
        return MagicMock(
            id="workflow_123",
            job_name="Test Workflow",
            user_id="test_user_id_123",
        )

    @pytest.fixture
    def sample_execution_history(self):
        """Sample execution history documents."""
        return [
            {
                "_id": str(ObjectId()),
                "workflow_id": "workflow_123",
                "status": "SUCCESS",
                "start_time": datetime.now(UTC).isoformat(),
                "end_time": datetime.now(UTC).isoformat(),
                "duration": 120,
                "output": {"rows_processed": 1000},
            },
            {
                "_id": str(ObjectId()),
                "workflow_id": "workflow_123",
                "status": "FAILED",
                "start_time": datetime.now(UTC).isoformat(),
                "error": "Connection timeout",
            },
        ]

    def test_get_execution_history_by_workflow_success(
        self,
        mock_mongodb,
        mock_settings,
        mock_user_context,
        sample_workflow,
        sample_execution_history,
    ):
        """Test successful execution history retrieval."""
        from server.services.execution_history import get_execution_history_by_workflow

        mock_mongodb.get_document.return_value = sample_workflow
        mock_mongodb.get_all_documents.return_value = sample_execution_history

        result = get_execution_history_by_workflow("workflow_123")

        assert len(result) == 2
        assert result[0]["status"] == "SUCCESS"
        assert result[1]["status"] == "FAILED"
        mock_mongodb.get_document.assert_called_once()
        mock_mongodb.get_all_documents.assert_called_once()

    def test_get_execution_history_by_workflow_not_found(
        self, mock_mongodb, mock_settings, mock_user_context
    ):
        """Test execution history when workflow not found."""
        from server.services.execution_history import get_execution_history_by_workflow

        mock_mongodb.get_document.return_value = None

        result = get_execution_history_by_workflow("nonexistent_workflow")

        assert result == []
        # Should not query execution history if workflow not found
        mock_mongodb.get_all_documents.assert_not_called()

    def test_get_execution_history_by_workflow_ownership_check(
        self, mock_mongodb, mock_settings, mock_user_context
    ):
        """Test that ownership is verified when getting execution history."""
        from server.services.execution_history import get_execution_history_by_workflow

        mock_mongodb.get_document.return_value = None  # Workflow not owned by user

        result = get_execution_history_by_workflow("other_users_workflow")

        assert result == []
        # Verify the query included user_id for ownership
        call_args = mock_mongodb.get_document.call_args
        assert call_args[1]["query"]["user_id"] == "test_user_id_123"

    def test_get_execution_history_by_workflow_empty_history(
        self, mock_mongodb, mock_settings, mock_user_context, sample_workflow
    ):
        """Test execution history when workflow has no executions."""
        from server.services.execution_history import get_execution_history_by_workflow

        mock_mongodb.get_document.return_value = sample_workflow
        mock_mongodb.get_all_documents.return_value = []

        result = get_execution_history_by_workflow("workflow_123")

        assert result == []

    def test_get_execution_history_by_workflow_preserves_output(
        self, mock_mongodb, mock_settings, mock_user_context, sample_workflow
    ):
        """Test that execution history preserves nested output data."""
        from server.services.execution_history import get_execution_history_by_workflow

        execution_with_output = [
            {
                "_id": str(ObjectId()),
                "workflow_id": "workflow_123",
                "status": "SUCCESS",
                "output": {
                    "rows_processed": 1000,
                    "files_created": ["file1.csv", "file2.csv"],
                    "nested": {"key": "value"},
                },
            }
        ]
        mock_mongodb.get_document.return_value = sample_workflow
        mock_mongodb.get_all_documents.return_value = execution_with_output

        result = get_execution_history_by_workflow("workflow_123")

        assert result[0]["output"]["rows_processed"] == 1000
        assert result[0]["output"]["files_created"] == ["file1.csv", "file2.csv"]
        assert result[0]["output"]["nested"]["key"] == "value"

    def test_get_execution_history_by_workflow_uses_raw_dicts(
        self, mock_mongodb, mock_settings, mock_user_context, sample_workflow
    ):
        """Test that execution history returns raw dicts (not Pydantic models)."""
        from server.services.execution_history import get_execution_history_by_workflow

        mock_mongodb.get_document.return_value = sample_workflow

        get_execution_history_by_workflow("workflow_123")

        # Verify model_cls=None is passed to get raw dicts
        call_args = mock_mongodb.get_all_documents.call_args
        assert call_args[1]["model_cls"] is None
