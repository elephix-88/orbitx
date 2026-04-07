
from google.api_core.exceptions import GoogleAPIError
from google.auth.exceptions import RefreshError
from google.cloud import bigquery
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from loguru import logger

from common.database.mongodb import find_one
from common.model.connection import ConnectionItem
from common.model.google.bigquery import BigQueryDataset, BigQueryProject
from server.configs.config import settings
from server.services.auth.context import get_current_user
from server.services.exceptions import (
    ConnectionAuthError,
    ConnectionNotFoundError,
    ExternalAPIError,
)
from server.services.google.credentials import build_google_credentials


async def get_bigquery_credentials(connection_id: str) -> Credentials:
    """Helper to get BigQuery credentials with ownership verification."""
    user = get_current_user()

    connection_item = await find_one(
        settings.connection_collection,
        {"_id": connection_id, "user_id": user.id},
        ConnectionItem,
    )

    if not connection_item:
        raise ConnectionNotFoundError(connection_id)

    return build_google_credentials(
        connection_item, scopes=[settings.google_oauth_bigquery_scope]
    )


def get_bigquery_client(credentials: Credentials, project_id: str):
    """Helper to get an authenticated BigQuery client for a specific project."""
    return bigquery.Client(credentials=credentials, project=project_id)


def get_bigquery_projects(
    connection_id: str, credentials: Credentials
) -> list[BigQueryProject]:
    """Retrieves a list of BigQuery projects accessible with given credentials."""
    try:
        service = build("bigquery", "v2", credentials=credentials)

        projects_response = service.projects().list().execute()
        projects = []

        for project in projects_response.get("projects", []):
            projects.append(
                BigQueryProject(
                    project_id=project["id"],
                    project_name=project.get("friendlyName"),
                    project_number=project.get("numericId"),
                )
            )

        logger.info(
            f"Found {len(projects)} BigQuery projects for connection {connection_id}"
        )
        return projects

    except (ConnectionNotFoundError, ConnectionAuthError):
        raise
    except RefreshError as e:
        logger.error(f"Token refresh failed for connection {connection_id}: {e}")
        raise ConnectionAuthError(connection_id, "Token expired or revoked") from e
    except HttpError as e:
        logger.error(f"BigQuery API error: {e}")
        status_code = e.resp.status if e.resp else None
        raise ExternalAPIError("BigQuery", str(e), status_code) from e
    except GoogleAPIError as e:
        logger.error(f"Google API error fetching BigQuery projects: {e}")
        raise ExternalAPIError("BigQuery", str(e)) from e


def get_bigquery_datasets(
    connection_id: str,
    project_id: str,
    credentials: Credentials,
) -> list[BigQueryDataset]:
    """Retrieves BigQuery datasets for a given project_id."""
    try:
        client = get_bigquery_client(credentials, project_id)

        datasets = []
        for dataset in client.list_datasets(project=project_id):
            dataset_ref = client.get_dataset(dataset.dataset_id)
            datasets.append(
                BigQueryDataset(
                    dataset_id=dataset_ref.dataset_id,
                    friendly_name=dataset_ref.friendly_name,
                    description=dataset_ref.description,
                    location=dataset_ref.location,
                    creation_time=dataset_ref.created.isoformat()
                    if dataset_ref.created
                    else None,
                    last_modified_time=dataset_ref.modified.isoformat()
                    if dataset_ref.modified
                    else None,
                )
            )

        logger.info(f"Found {len(datasets)} BigQuery datasets for project {project_id}")
        return datasets

    except (ConnectionNotFoundError, ConnectionAuthError):
        raise
    except RefreshError as e:
        logger.error(f"Token refresh failed for connection {connection_id}: {e}")
        raise ConnectionAuthError(connection_id, "Token expired or revoked") from e
    except GoogleAPIError as e:
        logger.error(f"Google API error fetching BigQuery datasets: {e}")
        raise ExternalAPIError("BigQuery", str(e)) from e


def validate_bigquery_connection(
    connection_id: str, credentials: Credentials
) -> bool:
    """Validates a BigQuery connection by listing projects."""
    try:
        get_bigquery_projects(connection_id, credentials)
        return True
    except (ConnectionNotFoundError, ConnectionAuthError, ExternalAPIError) as e:
        logger.warning(
            f"BigQuery connection validation failed for {connection_id}: {e}"
        )
        return False
