from typing import Any

from common.model.google.bigquery import BigQueryDestinationConfig
from common.model.google.sheets import GoogleSheetsDestinationConfig
from common.model.mysql.config import MySQLDestinationConfig
from engine.configs.config import settings
from engine.interfaces.factory import LoaderFactory as LoaderFactoryInterface
from engine.interfaces.node import Loader
from engine.node.loaders.bigquery.loader import BigQueryLoader
from engine.node.loaders.googlesheet.loader import GoogleSheetLoader
from engine.node.loaders.mysql.mysql import MySQLLoader

_CONFIG_CLASSES: dict[str, type[Any]] = {
    settings.services.mysql: MySQLDestinationConfig,
    settings.services.bigquery: BigQueryDestinationConfig,
    settings.services.google_sheet: GoogleSheetsDestinationConfig,
}


class LoaderFactory(LoaderFactoryInterface):
    """Factory backed by a registry of loader implementations."""

    _DEFAULT_REGISTRY: dict[str, type[Loader]] = {
        settings.services.mysql: MySQLLoader,
        settings.services.bigquery: BigQueryLoader,
        settings.services.google_sheet: GoogleSheetLoader,
    }

    def create_loader(self, config: Any, node_id: str) -> Loader:
        config_cls = _CONFIG_CLASSES.get(node_id)
        if config_cls and isinstance(config, dict):
            config = config_cls(**config)
        return self._create(config, node_id, "loader")
