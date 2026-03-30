from loguru import logger
from pydantic import BaseModel

from common.database import get_mongodb
from server.configs.config import settings
from server.services.exceptions import WorkflowNotFoundError


async def set_workflow_field(
    workflow_id: str,
    user_id: str,
    field_name: str,
    config: BaseModel,
) -> BaseModel:
    """Set or replace a single named field on a workflow document."""
    collection = get_mongodb().get_collection(settings.workflow_collection)

    result = await collection.update_one(
        {"_id": workflow_id, "user_id": user_id},
        {"$set": {field_name: config.model_dump()}},
    )

    if result.matched_count == 0:
        raise WorkflowNotFoundError(workflow_id)

    logger.info(
        "Field '%s' set on workflow %s for user %s", field_name, workflow_id, user_id
    )
    return config


async def get_workflow_field(
    workflow_id: str,
    user_id: str,
    field_name: str,
    model_class: type[BaseModel],
) -> BaseModel | None:
    """Return the named field from a workflow document, or None if unset."""
    collection = get_mongodb().get_collection(settings.workflow_collection)

    document = await collection.find_one({"_id": workflow_id, "user_id": user_id})

    if document is None:
        raise WorkflowNotFoundError(workflow_id)

    field_data = document.get(field_name)
    if not field_data:
        return None

    return model_class(**field_data)


async def remove_workflow_field(
    workflow_id: str,
    user_id: str,
    field_name: str,
) -> bool:
    """Unset the named field from a workflow document. Returns True on success."""
    collection = get_mongodb().get_collection(settings.workflow_collection)

    result = await collection.update_one(
        {"_id": workflow_id, "user_id": user_id},
        {"$unset": {field_name: ""}},
    )

    if result.matched_count == 0:
        raise WorkflowNotFoundError(workflow_id)

    logger.info(
        "Field '%s' removed from workflow %s for user %s",
        field_name,
        workflow_id,
        user_id,
    )
    return True
