import asyncio

from fastapi import APIRouter, Depends

from common.model.connection import (
    ConnectionNamePayload,
    ConnectionType,
    OAuthLoginResponse,
    ServiceName,
)
from common.model.google.bigquery import BigQueryDataset, BigQueryProject
from common.model.user import UserInDB
from server.configs.config import settings
from server.services.auth.dependencies import get_current_user
from server.services.google.bigquery import (
    get_bigquery_credentials,
    get_bigquery_datasets,
    get_bigquery_projects,
    validate_bigquery_connection,
)
from server.services.google.oauth import build_google_oauth_url
from server.services.utils import generate_uuid

router = APIRouter(prefix="/api/google/bigquery", tags=["google_bigquery"])


@router.post("/login")
async def login_bigquery(
    payload: ConnectionNamePayload,
    user: UserInDB = Depends(get_current_user),
):
    connection_id = generate_uuid()
    oauth_url = build_google_oauth_url(
        scope=settings.google_oauth_bigquery_scope,
        connection_type=ConnectionType.DESTINATION.value,
        connection_id=connection_id,
        service_name=ServiceName.BIGQUERY.value,
        connection_name=payload.connection_name,
        user_id=user.id,
    )
    return OAuthLoginResponse(
        oauth_url=oauth_url,
        connection_id=connection_id,
        message="Redirect user to this URL to authorize Google BigQuery",
    )


@router.get("/projects", response_model=list[BigQueryProject])
async def get_projects_endpoint(
    connection_id: str,
    _current_user: UserInDB = Depends(get_current_user),
):
    """Retrieves a list of BigQuery projects accessible with a given connection_id."""
    credentials = await get_bigquery_credentials(connection_id)
    return await asyncio.to_thread(get_bigquery_projects, connection_id, credentials)


@router.get("/projects/{project_id}/datasets", response_model=list[BigQueryDataset])
async def get_datasets_endpoint(
    connection_id: str,
    project_id: str,
    _current_user: UserInDB = Depends(get_current_user),
):
    """Retrieves a list of BigQuery datasets accessible with a given connection_id and project_id."""
    credentials = await get_bigquery_credentials(connection_id)
    return await asyncio.to_thread(get_bigquery_datasets, connection_id, project_id, credentials)


@router.get("/validate", response_model=dict)
async def validate_connection_endpoint(
    connection_id: str,
    _current_user: UserInDB = Depends(get_current_user),
):
    """Validates that a BigQuery connection is working."""
    credentials = await get_bigquery_credentials(connection_id)
    is_valid = await asyncio.to_thread(validate_bigquery_connection, connection_id, credentials)
    return {
        "connection_id": connection_id,
        "is_valid": is_valid,
        "message": "Connection is valid"
        if is_valid
        else "Connection validation failed",
    }
