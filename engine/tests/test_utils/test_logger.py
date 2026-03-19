from unittest.mock import Mock

import pytest

import engine.utils.logger as mod
from engine.utils.logger import ExecutionTimer


@pytest.mark.parametrize("success", [True, False])
def test_stop_sets_end_time(monkeypatch: pytest.MonkeyPatch, success: bool) -> None:
    """Test that stop() sets end_time correctly."""
    monkeypatch.setattr(mod.time, "perf_counter", Mock(return_value=100.0))

    t = ExecutionTimer(label="JobA")
    t.start()
    t.stop(success=success)

    assert t.end_time == 100.0
    assert t.label == "JobA"


def test_elapsed_time_calculation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test elapsed time calculation."""
    call_count = 0

    def mock_perf_counter() -> float:
        nonlocal call_count
        call_count += 1
        return 10.0 if call_count == 1 else 15.0

    monkeypatch.setattr(mod.time, "perf_counter", mock_perf_counter)

    t = ExecutionTimer(label="TestJob")
    t.start()
    t.stop()

    assert t.elapsed_time == 5.0


def test_context_manager(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test ExecutionTimer as context manager."""
    monkeypatch.setattr(mod.time, "perf_counter", Mock(return_value=100.0))

    with ExecutionTimer(label="ContextJob") as t:
        pass

    assert t.start_time == 100.0
    assert t.end_time == 100.0
