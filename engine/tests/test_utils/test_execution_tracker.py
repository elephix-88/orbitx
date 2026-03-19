"""Tests for ExecutionTracker."""

from unittest.mock import MagicMock, patch

import pytest

import engine.utils.logger as logger_mod
from engine.utils.logger import ExecutionTracker, Unit


class TestExecutionTrackerBasic:
    """Tests for basic ExecutionTracker functionality."""

    def test_init_without_db_tracking(self) -> None:
        """Test initialization without database tracking."""
        tracker = ExecutionTracker(label="Test Job")

        assert tracker.label == "Test Job"
        assert tracker.track_in_db is False
        assert tracker.start_time is None
        assert tracker.end_time is None

    def test_init_with_db_tracking_missing_params(self) -> None:
        """Test that DB tracking is disabled when required params are missing."""
        tracker = ExecutionTracker(
            label="Test Job",
            track_in_db=True,
            # Missing workflow_id and workflow_name
        )

        assert tracker.track_in_db is False

    def test_start_sets_start_time(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that start() sets start_time."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )

        tracker = ExecutionTracker(label="Test Job")
        tracker.start()

        assert tracker.start_time == 100.0

    def test_stop_sets_end_time(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that stop() sets end_time."""
        call_count = 0

        def mock_perf_counter() -> float:
            nonlocal call_count
            call_count += 1
            return 100.0 if call_count == 1 else 110.0

        monkeypatch.setattr(logger_mod.time, "perf_counter", mock_perf_counter)

        tracker = ExecutionTracker(label="Test Job")
        tracker.start()
        tracker.stop()

        assert tracker.end_time == 110.0

    def test_elapsed_time_property(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test elapsed_time calculation."""
        call_count = 0

        def mock_perf_counter() -> float:
            nonlocal call_count
            call_count += 1
            return 100.0 if call_count == 1 else 105.0

        monkeypatch.setattr(logger_mod.time, "perf_counter", mock_perf_counter)

        tracker = ExecutionTracker(label="Test Job")
        tracker.start()
        tracker.stop()

        assert tracker.elapsed_time == 5.0

    def test_elapsed_time_before_start(self) -> None:
        """Test elapsed_time returns 0 before start."""
        tracker = ExecutionTracker(label="Test Job")

        assert tracker.elapsed_time == 0.0

    def test_context_manager_success(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test context manager with successful execution."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )

        with ExecutionTracker(label="Test Job") as tracker:
            assert tracker.start_time == 100.0

        assert tracker.end_time == 100.0

    def test_context_manager_with_exception(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test context manager with exception."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )

        with pytest.raises(ValueError):
            with ExecutionTracker(label="Test Job") as tracker:
                raise ValueError("Test error")

        # Should still set end_time even on exception
        assert tracker.end_time == 100.0


class TestExecutionTrackerTimeUnits:
    """Tests for time unit formatting in ExecutionTracker."""

    def test_seconds_format(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that short durations use seconds."""
        call_count = 0

        def mock_perf_counter() -> float:
            nonlocal call_count
            call_count += 1
            return 0.0 if call_count == 1 else 30.0  # 30 seconds

        monkeypatch.setattr(logger_mod.time, "perf_counter", mock_perf_counter)

        tracker = ExecutionTracker(label="Test Job")
        tracker.start()
        tracker.stop()

        # Duration should be calculated in seconds
        assert tracker.elapsed_time == 30.0

    def test_minutes_format(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that durations >= 60s are handled."""
        call_count = 0

        def mock_perf_counter() -> float:
            nonlocal call_count
            call_count += 1
            return 0.0 if call_count == 1 else 120.0  # 2 minutes

        monkeypatch.setattr(logger_mod.time, "perf_counter", mock_perf_counter)

        tracker = ExecutionTracker(label="Test Job")
        tracker.start()
        tracker.stop()

        assert tracker.elapsed_time == 120.0

    def test_hours_format(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that durations >= 3600s are handled."""
        call_count = 0

        def mock_perf_counter() -> float:
            nonlocal call_count
            call_count += 1
            return 0.0 if call_count == 1 else 7200.0  # 2 hours

        monkeypatch.setattr(logger_mod.time, "perf_counter", mock_perf_counter)

        tracker = ExecutionTracker(label="Test Job")
        tracker.start()
        tracker.stop()

        assert tracker.elapsed_time == 7200.0


class TestUnit:
    """Tests for Unit enum."""

    def test_unit_values(self) -> None:
        """Test Unit enum values."""
        assert Unit.SECOND.value == "second"
        assert Unit.MINUTE.value == "minute"
        assert Unit.HOUR.value == "hour"


class TestExecutionTrackerWithMongoDB:
    """Tests for ExecutionTracker with MongoDB tracking."""

    @patch("engine.utils.logger.get_mongodb")
    def test_init_with_db_tracking(self, mock_mongodb: MagicMock) -> None:
        """Test initialization with database tracking enabled."""
        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            triggered_by="manual",
            track_in_db=True,
        )

        assert tracker.track_in_db is True
        assert tracker.workflow_id == "wf_123"
        assert tracker.workflow_name == "Test Workflow"
        assert tracker.triggered_by == "manual"

    @patch("engine.utils.logger.get_mongodb")
    def test_start_creates_execution_record(
        self, mock_mongodb: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test that start() creates an execution record in MongoDB."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )
        monkeypatch.setattr(logger_mod.time, "time", MagicMock(return_value=1000.0))

        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            track_in_db=True,
        )

        execution_id = tracker.start()

        assert execution_id is not None
        assert execution_id.startswith("exec_")
        mock_mongodb.insert_document.assert_called_once()

    @patch("engine.utils.logger.get_mongodb")
    def test_start_node_updates_execution_record(
        self, mock_mongodb: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test that start_node() updates the execution record."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )
        monkeypatch.setattr(logger_mod.time, "time", MagicMock(return_value=1000.0))

        mock_execution = MagicMock()
        mock_execution.steps = {}
        mock_execution.total_nodes = 0
        mock_mongodb.get_document.return_value = mock_execution

        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            track_in_db=True,
        )
        tracker.start()

        tracker.start_node(
            node_instance_id="node_1",
            node_id="facebook_ads",
            node_type="source",
        )

        # Should fetch and update the document
        assert mock_mongodb.get_document.call_count >= 1
        assert mock_mongodb.update_document.call_count >= 1

    @patch("engine.utils.logger.get_mongodb")
    def test_complete_node_success(
        self, mock_mongodb: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test that complete_node() marks node as successful."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )
        monkeypatch.setattr(logger_mod.time, "time", MagicMock(return_value=1000.0))

        mock_step = MagicMock()
        mock_execution = MagicMock()
        mock_execution.steps = {"node_1": mock_step}
        mock_execution.successful_nodes = 0
        mock_execution.failed_nodes = 0
        mock_mongodb.get_document.return_value = mock_execution

        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            track_in_db=True,
        )
        tracker.start()

        tracker.complete_node(
            node_instance_id="node_1",
            success=True,
            message="Completed successfully",
        )

        mock_mongodb.update_document.assert_called()

    @patch("engine.utils.logger.get_mongodb")
    def test_complete_node_failure(
        self, mock_mongodb: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test that complete_node() marks node as failed."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )
        monkeypatch.setattr(logger_mod.time, "time", MagicMock(return_value=1000.0))

        mock_step = MagicMock()
        mock_execution = MagicMock()
        mock_execution.steps = {"node_1": mock_step}
        mock_execution.successful_nodes = 0
        mock_execution.failed_nodes = 0
        mock_mongodb.get_document.return_value = mock_execution

        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            track_in_db=True,
        )
        tracker.start()

        test_error = ValueError("Test error")
        tracker.complete_node(
            node_instance_id="node_1",
            success=False,
            error=test_error,
        )

        mock_mongodb.update_document.assert_called()

    @patch("engine.utils.logger.get_mongodb")
    def test_complete_node_creates_missing_step(
        self, mock_mongodb: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test that complete_node() creates step if missing."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )
        monkeypatch.setattr(logger_mod.time, "time", MagicMock(return_value=1000.0))

        mock_execution = MagicMock()
        mock_execution.steps = {}  # Empty steps
        mock_execution.total_nodes = 0
        mock_execution.successful_nodes = 0
        mock_execution.failed_nodes = 0
        mock_mongodb.get_document.return_value = mock_execution

        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            track_in_db=True,
        )
        tracker.start()

        tracker.complete_node(
            node_instance_id="node_1",
            success=True,
            node_id="facebook_ads",
            node_type="source",
        )

        mock_mongodb.update_document.assert_called()

    @patch("engine.utils.logger.get_mongodb")
    def test_stop_completes_execution(
        self, mock_mongodb: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test that stop() completes the execution record."""
        call_count = 0

        def mock_perf_counter() -> float:
            nonlocal call_count
            call_count += 1
            return 100.0 if call_count == 1 else 110.0

        monkeypatch.setattr(logger_mod.time, "perf_counter", mock_perf_counter)
        monkeypatch.setattr(logger_mod.time, "time", MagicMock(return_value=1000.0))

        mock_execution = MagicMock()
        mock_execution.start_time = 1000.0
        mock_mongodb.get_document.return_value = mock_execution

        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            track_in_db=True,
        )
        tracker.start()
        tracker.stop(success=True)

        # Should update execution with end_time, duration, status
        mock_mongodb.update_document.assert_called()

    @patch("engine.utils.logger.get_mongodb")
    def test_complete_execution_alias(
        self, mock_mongodb: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test that complete_execution() is an alias for stop()."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )
        monkeypatch.setattr(logger_mod.time, "time", MagicMock(return_value=1000.0))

        mock_execution = MagicMock()
        mock_execution.start_time = 1000.0
        mock_mongodb.get_document.return_value = mock_execution

        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            track_in_db=True,
        )
        tracker.start()
        tracker.complete_execution(success=True)

        assert tracker.end_time is not None

    @patch("engine.utils.logger.get_mongodb")
    def test_start_handles_mongodb_error(
        self, mock_mongodb: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test that start() handles MongoDB errors gracefully."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )
        monkeypatch.setattr(logger_mod.time, "time", MagicMock(return_value=1000.0))

        mock_mongodb.insert_document.side_effect = Exception("MongoDB error")

        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            track_in_db=True,
        )

        # Should not raise, just log error
        tracker.start()

        # MongoDB available should be set to False after error
        assert tracker._mongodb_available is False

    @patch("engine.utils.logger.get_mongodb")
    def test_start_node_handles_missing_execution(
        self, mock_mongodb: MagicMock, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test that start_node() handles missing execution gracefully."""
        monkeypatch.setattr(
            logger_mod.time, "perf_counter", MagicMock(return_value=100.0)
        )
        monkeypatch.setattr(logger_mod.time, "time", MagicMock(return_value=1000.0))

        mock_mongodb.get_document.return_value = None

        tracker = ExecutionTracker(
            label="Test Workflow",
            workflow_id="wf_123",
            workflow_name="Test Workflow",
            track_in_db=True,
        )
        tracker.start()

        # Should not raise
        tracker.start_node(
            node_instance_id="node_1",
            node_id="facebook_ads",
            node_type="source",
        )

    @patch("engine.utils.logger.get_mongodb")
    def test_start_node_skipped_when_not_tracking(
        self, mock_mongodb: MagicMock
    ) -> None:
        """Test that start_node() does nothing when not tracking."""
        tracker = ExecutionTracker(
            label="Test Workflow",
            track_in_db=False,
        )

        tracker.start_node(
            node_instance_id="node_1",
            node_id="facebook_ads",
            node_type="source",
        )

        mock_mongodb.get_document.assert_not_called()

    @patch("engine.utils.logger.get_mongodb")
    def test_complete_node_skipped_when_not_tracking(
        self, mock_mongodb: MagicMock
    ) -> None:
        """Test that complete_node() does nothing when not tracking."""
        tracker = ExecutionTracker(
            label="Test Workflow",
            track_in_db=False,
        )

        tracker.complete_node(
            node_instance_id="node_1",
            success=True,
        )

        mock_mongodb.get_document.assert_not_called()
