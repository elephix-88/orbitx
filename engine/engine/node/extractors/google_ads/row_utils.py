from typing import Any


def _convert_protobuf_value(value: Any) -> Any:
    """Convert protobuf types to native Python types for DataFrame compatibility."""
    type_name = type(value).__name__
    if (
        "RepeatedScalarContainer" in type_name
        or "RepeatedCompositeContainer" in type_name
    ):
        items = list(value)
        if items:
            return ", ".join(str(item) for item in items)
        return None

    if hasattr(value, "DESCRIPTOR"):
        if hasattr(value, "value"):
            return value.value
        return str(value)

    return value


def get_attr_by_path(obj: Any, path: str) -> Any:
    """Safely traverse nested attributes following a dotted GAQL path."""
    current: Any = obj
    for attribute in path.split("."):
        try:
            current = getattr(current, attribute)
        except Exception:
            return None

    try:
        raw_value = current.value if hasattr(current, "value") else current
    except Exception:
        raw_value = current

    return _convert_protobuf_value(raw_value)


def flatten_row(row: Any, selected_pairs: list[tuple[str, str]]) -> dict[str, Any]:
    """Flatten a GoogleAdsRow using provided selected field paths."""
    flat: dict[str, Any] = {}

    for logical_name, select_path in selected_pairs:
        value = get_attr_by_path(row, select_path)
        flat[logical_name] = value

    return flat
