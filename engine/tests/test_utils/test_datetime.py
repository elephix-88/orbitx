from datetime import date, timedelta

from common.model.common import DateTimeConfig

from engine.utils.datetime import get_time_preset, get_time_range


def test_7_days_time_range():
    test_time_range_config = DateTimeConfig(
        time_preset=None,
        time_window_days=None,
        time_range={
            "start_date": "2025-01-01",
            "end_date": "2025-01-07",
        },
    )
    start_date, end_date = get_time_range(test_time_range_config)

    assert start_date == date(2025, 1, 1)
    assert end_date == date(2025, 1, 7)


def test_30_days_time_range():
    test_time_range_config = DateTimeConfig(
        time_preset=None,
        time_window_days=None,
        time_range={
            "start_date": "2025-01-01",
            "end_date": "2025-01-30",
        },
    )
    start_date, end_date = get_time_range(test_time_range_config)
    assert start_date == date(2025, 1, 1)
    assert end_date == date(2025, 1, 30)


def test_3_months_time_range():
    test_time_range_config = DateTimeConfig(
        time_preset=None,
        time_window_days=None,
        time_range={
            "start_date": "2025-01-01",
            "end_date": "2025-03-01",
        },
    )
    start_date, end_date = get_time_range(test_time_range_config)
    assert start_date == date(2025, 1, 1)
    assert end_date == date(2025, 3, 1)


def test_1_year_time_range():
    test_time_range_config = DateTimeConfig(
        time_preset=None,
        time_window_days=None,
        time_range={
            "start_date": "2025-01-01",
            "end_date": "2026-01-01",
        },
    )
    start_date, end_date = get_time_range(test_time_range_config)
    assert start_date == date(2025, 1, 1)
    assert end_date == date(2026, 1, 1)


def test_7_days_time_preset():
    today = date.today()
    test_time_preset_config = DateTimeConfig(
        time_preset="last_7_days", time_window_days=None, time_range=None
    )
    start_date, end_date = get_time_preset(test_time_preset_config.time_preset, today)
    assert start_date == date.today() - timedelta(days=6)
    assert end_date == date.today()


def test_7_weeks_time_preset():
    today = date.today()
    test_time_preset_config = DateTimeConfig(
        time_preset="last_7_weeks", time_window_days=None, time_range=None
    )
    start_date, end_date = get_time_preset(test_time_preset_config.time_preset, today)
    assert start_date == date.today() - timedelta(days=48)
    assert end_date == date.today()


def test_3_months_time_preset():
    today = date.today()
    test_time_preset_config = DateTimeConfig(
        time_preset="last_3_months", time_window_days=None, time_range=None
    )
    start_date, end_date = get_time_preset(test_time_preset_config.time_preset, today)
    assert start_date == date.today() - timedelta(days=89)
    assert end_date == date.today()


def test_1_year_time_preset():
    today = date.today()
    test_time_preset_config = DateTimeConfig(
        time_preset="last_1_years", time_window_days=None, time_range=None
    )
    start_date, end_date = get_time_preset(test_time_preset_config.time_preset, today)
    assert start_date == date.today() - timedelta(days=364)
    assert end_date == date.today()
