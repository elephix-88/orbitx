from dynaconf import Dynaconf

settings: Dynaconf | None = None


def register_settings(value: Dynaconf) -> None:
    global settings
    settings = value


def get_settings() -> Dynaconf:
    if settings is None:
        raise RuntimeError("Settings not registered. Call register_settings() first.")
    return settings
