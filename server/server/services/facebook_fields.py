from common.model.facebook.fields import FacebookField
from server.configs.config import settings
from server.services.field_service import get_fields


async def get_facebook_fields() -> list[FacebookField]:
    return await get_fields(settings.facebook_fields, FacebookField)
