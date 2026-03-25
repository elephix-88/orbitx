from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


def utc_now() -> datetime:
    return datetime.now(UTC)


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    picture: str | None = None


class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str | None = None
    google_id: str | None = None
    role: UserRole = UserRole.USER
    is_active: bool = True
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    model_config = {"populate_by_name": True}


class UserResponse(UserBase):
    id: str
    role: UserRole
    is_active: bool
    created_at: datetime


class GoogleAuthRequest(BaseModel):
    credential: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
