"""Generic field retrieval service for all platforms."""

from typing import TypeVar

from pydantic import BaseModel

from common.database.mongodb import find_many

T = TypeVar("T", bound=BaseModel)


async def get_fields[T: BaseModel](
    collection_name: str, model_class: type[T]
) -> list[T]:
    """Retrieve fields from a MongoDB collection and return as typed models.

    Args:
        collection_name: The MongoDB collection to query.
        model_class: The Pydantic model class to instantiate per document.

    Returns:
        List of model instances from the collection.
    """
    return await find_many(collection_name, {}, model_class)
