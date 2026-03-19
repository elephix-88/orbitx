from engine.utils.logger import log_progress


def test_log_progress_interval_logic():
    # Should log at 1 if include_first_last
    assert log_progress(1, 100, "Op", interval=10, include_first_last=True) is True
    # Should log at 10 due to interval
    assert log_progress(10, 100, "Op", interval=10) is True
    # Should not log at 11 with interval 10 and no include_first_last
    assert log_progress(11, 100, "Op", interval=10) is False
    # Should log at total
    assert log_progress(100, 100, "Op", interval=10) is True


def test_log_progress_final_summary_returns_true():
    # Final summary always returns True
    assert (
        log_progress(
            current=90,
            total=100,
            operation_name="Op",
            failed_count=10,
            is_final=True,
        )
        is True
    )
