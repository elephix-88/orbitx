from common.model.common import BaseDestinationConfig


class MySQLDestinationConfig(BaseDestinationConfig):
    host: str
    port: int | str
    database: str
    username: str
    password: str
    table: str
