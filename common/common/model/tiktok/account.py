from pydantic import BaseModel


class TikTokAdsAccount(BaseModel):
    advertiser_id: str
    advertiser_name: str
