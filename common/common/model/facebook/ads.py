from pydantic import BaseModel


class FacebookAdsAccount(BaseModel):
    id: str
    name: str
    account_id: str
    account_status: int
