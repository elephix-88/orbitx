"""Tests for connection API endpoints."""

import pytest
from fastapi.testclient import TestClient

from server.services.exceptions import DatabaseError


class TestConnectionEndpoints:
    """Test connection API endpoints."""

    @pytest.mark.unit
    def test_list_connections_success(self, client: TestClient, mock_mongodb):
        """Test successful retrieval of all connections."""
        # Arrange
        mock_connections = [
            {
                "_id": "conn_1",
                "connection_name": "Google Ads Connection",
                "service_name": "GoogleAds",
                "connection_type": "Source",
                "created_at": "2024-01-01T00:00:00Z",
                "status": "Connected",
                "params": {"access_token": "token1"},
                "user_id": "test_user_id_123",
            },
            {
                "_id": "conn_2",
                "connection_name": "Google Sheets Connection",
                "service_name": "GoogleSheet",
                "connection_type": "Destination",
                "created_at": "2024-01-02T00:00:00Z",
                "status": "Connected",
                "params": {"access_token": "token2"},
                "user_id": "test_user_id_123",
            },
        ]
        mock_mongodb.get_all_documents.return_value = mock_connections

        # Act
        response = client.get("/api/connections")

        # Assert
        assert response.status_code == 200
        connections = response.json()
        assert len(connections) == 2
        assert connections[0]["connection_name"] == "Google Ads Connection"
        assert connections[1]["connection_name"] == "Google Sheets Connection"

    @pytest.mark.unit
    def test_list_connections_empty(self, client: TestClient, mock_mongodb):
        """Test retrieval of connections when none exist."""
        # Arrange
        mock_mongodb.get_all_documents.return_value = []

        # Act
        response = client.get("/api/connections")

        # Assert
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.unit
    @pytest.mark.xfail(
        reason="API lacks error handling - errors propagate as exceptions"
    )
    def test_list_connections_database_error(self, client: TestClient, mock_mongodb):
        """Test connection listing when database error occurs."""
        # Arrange
        mock_mongodb.get_all_documents.side_effect = ValueError("Database error")

        # Act
        response = client.get("/api/connections")

        # Assert - Database errors result in 500 Internal Server Error
        assert response.status_code == 500

    @pytest.mark.unit
    def test_get_connection_success(
        self, client: TestClient, mock_mongodb, sample_connection_data
    ):
        """Test successful retrieval of a specific connection."""

        # Arrange - use side_effect to return the sample data for connection queries
        def return_connection(*args, **kwargs):
            collection = kwargs.get("collection_name", args[0] if args else "")
            if "connection" in collection.lower():
                return sample_connection_data
            # Fall back to user data for auth middleware
            return {
                "_id": "test_user_id_123",
                "email": "test@example.com",
                "name": "Test User",
                "role": "user",
                "is_active": True,
            }

        mock_mongodb.get_document.side_effect = return_connection

        # Act
        response = client.get("/api/connections/conn_123")

        # Assert
        assert response.status_code == 200
        connection = response.json()
        assert connection["connection_name"] == "Test Google Ads Connection"
        assert connection["service_name"] == "GoogleAds"

    @pytest.mark.unit
    def test_get_connection_not_found(self, client: TestClient, mock_mongodb):
        """Test retrieval of non-existent connection."""

        # Arrange - return None for connection queries
        def return_none_for_connection(*args, **kwargs):
            collection = kwargs.get("collection_name", args[0] if args else "")
            if "connection" in collection.lower():
                return None
            # Fall back to user data for auth middleware
            return {
                "_id": "test_user_id_123",
                "email": "test@example.com",
                "name": "Test User",
                "role": "user",
                "is_active": True,
            }

        mock_mongodb.get_document.side_effect = return_none_for_connection

        # Act
        response = client.get("/api/connections/nonexistent_conn")

        # Assert
        assert response.status_code == 404
        assert "Connection not found" in response.json()["detail"]

    @pytest.mark.unit
    @pytest.mark.xfail(
        reason="API lacks error handling - errors propagate as exceptions"
    )
    def test_get_connection_database_error(self, client: TestClient, mock_mongodb):
        """Test connection retrieval when database error occurs."""

        # Arrange - raise error for connection queries
        def raise_error_for_connection(*args, **kwargs):
            collection = kwargs.get("collection_name", args[0] if args else "")
            if "connection" in collection.lower():
                raise ValueError("Database error")
            # Fall back to user data for auth middleware
            return {
                "_id": "test_user_id_123",
                "email": "test@example.com",
                "name": "Test User",
                "role": "user",
                "is_active": True,
            }

        mock_mongodb.get_document.side_effect = raise_error_for_connection

        # Act
        response = client.get("/api/connections/conn_123")

        # Assert - Database errors result in 500 Internal Server Error
        assert response.status_code == 500

    @pytest.mark.unit
    def test_delete_connection_success(self, client: TestClient, mock_mongodb):
        """Test successful connection deletion."""
        # Arrange
        mock_mongodb.delete_document.return_value = True

        # Act
        response = client.delete("/api/connections/conn_123")

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

    @pytest.mark.unit
    def test_delete_connection_not_found(self, client: TestClient, mock_mongodb):
        """Test deletion of non-existent connection."""
        # Arrange
        mock_mongodb.delete_document.return_value = False

        # Act
        response = client.delete("/api/connections/nonexistent_conn")

        # Assert
        assert response.status_code == 404
        assert "Connection not found" in response.json()["detail"]

    @pytest.mark.unit
    def test_delete_connection_database_error(self, client: TestClient, mock_mongodb):
        """Test connection deletion when database error occurs."""
        # Arrange
        mock_mongodb.delete_document.side_effect = DatabaseError(
            "delete", "Connection failed"
        )

        # Act
        response = client.delete("/api/connections/conn_123")

        # Assert
        assert response.status_code == 500
        assert "Database delete failed" in response.json()["detail"]

    @pytest.mark.integration
    def test_connection_crud_flow(
        self, client: TestClient, mock_mongodb, sample_connection_data
    ):
        """Test complete CRUD flow for connections."""
        # Setup
        connection_id = "test_conn_flow"
        user_data = {
            "_id": "test_user_id_123",
            "email": "test@example.com",
            "name": "Test User",
            "role": "user",
            "is_active": True,
        }

        # Test: List empty connections
        mock_mongodb.get_all_documents.return_value = []
        response = client.get("/api/connections")
        assert response.status_code == 200
        assert len(response.json()) == 0

        # Test: Get non-existent connection
        def return_none_for_connection(*args, **kwargs):
            collection = kwargs.get("collection_name", args[0] if args else "")
            if "connection" in collection.lower():
                return None
            return user_data

        mock_mongodb.get_document.side_effect = return_none_for_connection
        response = client.get(f"/api/connections/{connection_id}")
        assert response.status_code == 404

        # Test: Create connection (simulated by mocking get after creation)
        created_connection = {**sample_connection_data, "_id": connection_id}

        def return_created_connection(*args, **kwargs):
            collection = kwargs.get("collection_name", args[0] if args else "")
            if "connection" in collection.lower():
                return created_connection
            return user_data

        mock_mongodb.get_document.side_effect = return_created_connection
        mock_mongodb.get_all_documents.return_value = [created_connection]

        # Test: Get created connection
        response = client.get(f"/api/connections/{connection_id}")
        assert response.status_code == 200
        assert response.json()["_id"] == connection_id

        # Test: List connections with created connection
        response = client.get("/api/connections")
        assert response.status_code == 200
        assert len(response.json()) == 1

        # Test: Delete connection
        mock_mongodb.delete_document.return_value = True
        response = client.delete(f"/api/connections/{connection_id}")
        assert response.status_code == 200
        assert response.json()["success"] is True
