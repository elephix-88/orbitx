from dynaconf import Dynaconf

_settings: Dynaconf | None = None


def configure_database(settings: Dynaconf) -> None:
    """Configure the global database settings from a dynaconf instance."""
    global _settings
    _settings = settings


def get_settings() -> Dynaconf:
    """Retrieve the configured settings. Must call configure_database() first."""
    if _settings is None:
        raise RuntimeError(
            "Database not configured. Call configure_database() first."
        )
    return _settings
