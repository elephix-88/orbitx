from engine.utils.utils import ProgressCounter


def test_progress_counter_counts():
    p = ProgressCounter(total=10)
    assert p.total == 10
    assert p.completed() == 0

    p.mark_success(3)
    p.mark_failed(2)

    assert p.success == 3
    assert p.failed == 2
    assert p.completed() == 5
