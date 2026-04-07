"""Tests for ScheduleConfig Pydantic model."""

import pytest
from pydantic import ValidationError

from common.model.workflow import ScheduleConfig


class TestScheduleConfig:
    """Tests for ScheduleConfig validation."""

    def test_valid_schedule_weekly_monday(self):
        """Happy path: valid cron for every Monday at 9am."""
        config = ScheduleConfig(
            cron_expression="0 9 * * 1",
            timezone="Asia/Bangkok",
            enabled=True,
        )
        assert config.cron_expression == "0 9 * * 1"
        assert config.timezone == "Asia/Bangkok"
        assert config.enabled is True

    def test_default_timezone_is_bangkok(self):
        """timezone must default to Asia/Bangkok (target market default)."""
        config = ScheduleConfig(cron_expression="0 9 * * 1")
        assert config.timezone == "Asia/Bangkok"

    def test_default_enabled_is_true(self):
        """enabled must default to True."""
        config = ScheduleConfig(cron_expression="0 9 * * *")
        assert config.enabled is True

    def test_missing_cron_expression_raises(self):
        """cron_expression is required."""
        with pytest.raises(ValidationError):
            ScheduleConfig()  # type: ignore[call-arg]

    def test_daily_cron(self):
        """Valid daily cron expression."""
        config = ScheduleConfig(cron_expression="0 8 * * *")
        assert config.cron_expression == "0 8 * * *"

    def test_hourly_cron(self):
        """Valid hourly cron expression."""
        config = ScheduleConfig(cron_expression="0 * * * *")
        assert config.cron_expression == "0 * * * *"

    def test_explicit_disable(self):
        """Workflow can be scheduled but with enabled=False (saved but not running)."""
        config = ScheduleConfig(cron_expression="0 9 * * 1", enabled=False)
        assert config.enabled is False

    def test_utc_timezone_is_valid(self):
        """UTC timezone must be accepted."""
        config = ScheduleConfig(cron_expression="0 2 * * *", timezone="UTC")
        assert config.timezone == "UTC"

    def test_singapore_timezone_is_valid(self):
        """Asia/Singapore is a common SEA timezone."""
        config = ScheduleConfig(
            cron_expression="0 9 * * 1",
            timezone="Asia/Singapore",
        )
        assert config.timezone == "Asia/Singapore"

    def test_model_serialization(self):
        """model_dump() must produce the expected shape for MongoDB storage."""
        config = ScheduleConfig(
            cron_expression="0 9 * * 1",
            timezone="Asia/Bangkok",
            enabled=True,
        )
        data = config.model_dump()
        assert data["cron_expression"] == "0 9 * * 1"
        assert data["timezone"] == "Asia/Bangkok"
        assert data["enabled"] is True

    def test_schedule_config_in_workflow_data(self):
        """ScheduleConfig must be optional in WorkflowData (can be None)."""
        from common.model.workflow import WorkflowData, WorkflowStatus

        workflow = WorkflowData(
            user_id="user_123",
            job_name="Weekly FB Report",
            status=WorkflowStatus.PAUSED,
            created_at="2025-03-25T00:00:00Z",
            updated_at="2025-03-25T00:00:00Z",
            schedule_expression="0 9 * * 1",
            nodes=[],
            connections=[],
            schedule=None,
        )
        assert workflow.schedule is None

    def test_schedule_config_embedded_in_workflow_data(self):
        """WorkflowData must accept a ScheduleConfig object."""
        from common.model.workflow import WorkflowData, WorkflowStatus

        schedule = ScheduleConfig(cron_expression="0 9 * * 1")
        workflow = WorkflowData(
            user_id="user_123",
            job_name="Weekly FB Report",
            status=WorkflowStatus.ACTIVE,
            created_at="2025-03-25T00:00:00Z",
            updated_at="2025-03-25T00:00:00Z",
            schedule_expression="0 9 * * 1",
            nodes=[],
            connections=[],
            schedule=schedule,
        )
        assert workflow.schedule is not None
        assert workflow.schedule.cron_expression == "0 9 * * 1"
