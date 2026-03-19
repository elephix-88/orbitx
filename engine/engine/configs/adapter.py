from engine.configs.config import settings
from common.config.settings import configure_database


def init_settings() -> None:
    configure_database(settings)
