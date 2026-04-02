from pathlib import Path
from typing import Any, TypeVar

from dynaconf import Dynaconf
from loguru import logger
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

_config = Dynaconf(
    envvar_prefix=False,
    load_dotenv=True,
    dotenv_path=str(Path(__file__).resolve().parents[4] / ".env"),
)

_client = AsyncIOMotorClient(
    f"mongodb+srv://{_config.mongo_username}:{_config.mongo_password}"
    f"@{_config.mongo_uri}/{_config.mongo_database}"
)
database = _client[_config.mongo_database]

logger.success(f"Connected to MongoDB -> Database: '{_config.mongo_database}'")


async def find_one(
    collection_name: str,
    query: str | dict[str, Any],
    model: type[T] | None = None,
    projection: dict[str, Any] | None = None,
) -> T | dict[str, Any] | None:
    if isinstance(query, str):
        query = {"_id": query}
    doc = await database[collection_name].find_one(query, projection)
    if doc is None:
        return None
    return model.model_validate(doc) if model else doc


async def find_many(
    collection_name: str,
    query: dict[str, Any] | None = None,
    model: type[T] | None = None,
    limit: int | None = None,
) -> list[T] | list[dict[str, Any]]:
    cursor = database[collection_name].find(query or {})
    docs = await cursor.to_list(length=limit)
    if model:
        return [model.model_validate(doc) for doc in docs]
    return docs
