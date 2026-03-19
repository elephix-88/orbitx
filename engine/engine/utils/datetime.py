from datetime import date, datetime, timedelta

from common.model.common import DateTimeConfig


def get_time_preset(time_preset: str, today: date) -> tuple[date, date]:
    if time_preset.startswith("last_") and time_preset.endswith("_days"):
        value = int(time_preset.removeprefix("last_").removesuffix("_days"))
        days = value
    elif time_preset.startswith("last_") and time_preset.endswith("_weeks"):
        value = int(time_preset.removeprefix("last_").removesuffix("_weeks"))
        days = value * 7
    elif time_preset.startswith("last_") and time_preset.endswith("_months"):
        value = int(time_preset.removeprefix("last_").removesuffix("_months"))
        days = value * 30
    elif time_preset.startswith("last_") and time_preset.endswith("_years"):
        value = int(time_preset.removeprefix("last_").removesuffix("_years"))
        days = value * 365
    else:
        raise ValueError(f"Invalid time preset: {time_preset}")

    end_date = today
    start_date = end_date - timedelta(days=days - 1)
    return start_date, end_date


def get_time_range(
    datetime_config: DateTimeConfig,
    default_days: int = 7,
) -> tuple[date, date]:
    """Get start and end dates from DateTimeConfig."""
    today: date = datetime.now().date()

    if datetime_config.time_preset:
        return get_time_preset(datetime_config.time_preset, today)

    if datetime_config.time_range:
        start_str = datetime_config.time_range.get(
            "start_date", datetime_config.time_range.get("start", "")
        )
        end_str = datetime_config.time_range.get(
            "end_date", datetime_config.time_range.get("end", "")
        )
        if start_str and end_str:
            start_dt: date = datetime.strptime(str(start_str), "%Y-%m-%d").date()
            end_dt: date = datetime.strptime(str(end_str), "%Y-%m-%d").date()
            return start_dt, end_dt

    if datetime_config.time_window_days:
        end_date = today
        start_date = end_date - timedelta(days=datetime_config.time_window_days - 1)
        return start_date, end_date

    end_date = today
    start_date = end_date - timedelta(days=default_days - 1)
    return start_date, end_date


def chunk_date_range(
    start_date: date,
    end_date: date,
    max_days: int = 30,
) -> list[tuple[date, date]]:
    """Split a date range into chunks of maximum size."""
    chunks: list[tuple[date, date]] = []
    current_start = start_date

    while current_start <= end_date:
        chunk_end = min(current_start + timedelta(days=max_days - 1), end_date)
        chunks.append((current_start, chunk_end))
        current_start = chunk_end + timedelta(days=1)

    return chunks
