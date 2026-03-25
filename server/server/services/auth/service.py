import secrets
import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from loguru import logger

from common.database.mongodb import get_mongodb
from common.model.user import UserInDB, UserResponse, UserRole
from server.configs.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def _create_token(payload: dict) -> str:
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except jwt.InvalidTokenError:
        return None


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(UTC)
    return _create_token(
        {
            "sub": user_id,
            "email": email,
            "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
            "iat": now,
            "type": "access",
        }
    )


def create_refresh_token(user_id: str) -> str:
    now = datetime.now(UTC)
    return _create_token(
        {
            "sub": user_id,
            "exp": now + timedelta(days=settings.refresh_token_expire_days),
            "iat": now,
            "type": "refresh",
            "jti": secrets.token_urlsafe(16),
        }
    )


def create_token_pair(user_id: str, email: str) -> tuple[str, str]:
    return create_access_token(user_id, email), create_refresh_token(user_id)


def decode_access_token(token: str) -> dict | None:
    payload = _decode_token(token)
    if payload and payload.get("type", "access") == "access":
        return payload
    return None


def decode_refresh_token(token: str) -> dict | None:
    payload = _decode_token(token)
    if payload and payload.get("type") == "refresh":
        return payload
    return None


async def get_user_by_email(email: str) -> UserInDB | None:
    user_doc = await get_mongodb().get_document(
        settings.users_collection, {"email": email}
    )
    return UserInDB.model_validate(user_doc) if user_doc else None


async def get_user_by_id(user_id: str) -> UserInDB | None:
    user_doc = await get_mongodb().get_document(settings.users_collection, {"_id": user_id})
    return UserInDB.model_validate(user_doc) if user_doc else None


async def get_user_by_google_id(google_id: str) -> UserInDB | None:
    user_doc = await get_mongodb().get_document(
        settings.users_collection, {"google_id": google_id}
    )
    return UserInDB.model_validate(user_doc) if user_doc else None


async def create_user(
    email: str,
    name: str,
    password: str | None = None,
    google_id: str | None = None,
    picture: str | None = None,
) -> UserInDB:
    now = datetime.now(UTC)
    user = UserInDB(
        _id=str(uuid.uuid4()),
        email=email,
        name=name,
        picture=picture,
        hashed_password=hash_password(password) if password else None,
        google_id=google_id,
        role=UserRole.USER,
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    await get_mongodb().insert_document(settings.users_collection, user)
    return user


async def authenticate_user(email: str, password: str) -> UserInDB | None:
    user = await get_user_by_email(email)
    if (
        user
        and user.hashed_password
        and verify_password(password, user.hashed_password)
    ):
        return user
    return None


async def authenticate_google_user(credential: str) -> UserInDB | None:
    try:
        import asyncio

        idinfo = await asyncio.to_thread(
            id_token.verify_oauth2_token,
            credential,
            google_requests.Request(),
            settings.orbitx_google_oauth_client_id,
        )

        google_id = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name", email.split("@")[0])
        picture = idinfo.get("picture")

        # Check existing user by Google ID
        user = await get_user_by_google_id(google_id)
        if user:
            return user

        # Check existing user by email and link Google account
        user = await get_user_by_email(email)
        if user:
            collection = get_mongodb().get_collection(settings.users_collection)
            await collection.update_one(
                {"_id": user.id}, {"$set": {"google_id": google_id, "picture": picture}}
            )
            user.google_id = google_id
            user.picture = picture
            return user

        return await create_user(email=email, name=name, google_id=google_id, picture=picture)

    except ValueError as e:
        logger.warning(f"Google token verification failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Google authentication error: {type(e).__name__}: {e}")
        return None


def user_to_response(user: UserInDB) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )
