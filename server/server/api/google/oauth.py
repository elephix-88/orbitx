import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from loguru import logger

from common.model.connection import ConnectionKey
from common.model.token import GoogleConnectionParams
from server.configs.config import settings
from server.services.google.oauth import save_to_mongo
from server.services.oauth_utils import verify_state

router = APIRouter()


@router.get("/oauth2callback")
async def oauth2callback(code: str | None = None, state: str | None = None):
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code/state")
    try:
        result = verify_state(state)
        connection = ConnectionKey(**result)
        data = {
            "code": code,
            "client_id": settings.google_oauth_client_id,
            "client_secret": settings.google_oauth_client_secret,
            "redirect_uri": settings.google_oauth_redirect_uri,
            "grant_type": "authorization_code",
        }
        logger.debug(
            f"OAuth token exchange: client_id={data['client_id'][:20]}..., "
            f"secret_set={bool(data['client_secret'])}, "
            f"secret_len={len(data['client_secret'] or '')}, "
            f"redirect_uri={data['redirect_uri']}"
        )
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(settings.google_oauth_token_url, data=data)
            if resp.status_code != 200:
                logger.error(f"Google token response: {resp.status_code} {resp.text}")
            resp.raise_for_status()
            tokens = resp.json()
        await save_to_mongo(
            connection=connection,
            tokens=GoogleConnectionParams(**tokens),
        )

        provider = connection.service_name.lower()
        redirect_url = (
            f"{settings.frontend_oauth_success_url}?provider={provider}"
        )
        return RedirectResponse(url=redirect_url)
    except ValueError as e:
        logger.error(
            f"OAuth callback state verification failed: {e}"
        )
        raise HTTPException(
            status_code=400, detail="Invalid or expired OAuth state"
        ) from e
    except httpx.HTTPStatusError as e:
        logger.error(f"OAuth token exchange failed: {e}")
        raise HTTPException(
            status_code=502,
            detail="Token exchange with provider failed",
        ) from e
