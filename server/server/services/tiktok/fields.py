from common.model.tiktok import TikTokField
from server.configs.config import settings
from server.services.connection.field import get_fields


async def get_tiktok_fields() -> list[TikTokField]:
    """Retrieve all TikTok Ads fields from MongoDB."""
    return await get_fields(settings.tiktok_fields, TikTokField)
