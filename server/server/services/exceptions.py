"""Custom exceptions for OrbitX services.

This module defines specific exceptions for better error handling
instead of catching broad Exception everywhere.
"""



class OrbitXError(Exception):
    """Base exception for all OrbitX errors."""

    status_code: int = 500  # Default HTTP status code

    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(message)


class ConnectionNotFoundError(OrbitXError):
    """Raised when a connection is not found or user doesn't have access."""

    status_code = 404

    def __init__(self, connection_id: str):
        super().__init__(
            message=f"Connection not found: {connection_id}",
            details="The connection does not exist or you don't have access to it.",
        )
        self.connection_id = connection_id


class ConnectionAuthError(OrbitXError):
    """Raised when OAuth credentials are invalid or expired."""

    status_code = 401

    def __init__(self, connection_id: str, reason: str = "Invalid credentials"):
        super().__init__(
            message=f"Authentication failed for connection: {connection_id}",
            details=reason,
        )
        self.connection_id = connection_id


class ExternalAPIError(OrbitXError):
    """Raised when an external API (Google, Facebook, etc.) returns an error."""

    status_code = 502

    def __init__(
        self, service: str, message: str, api_status_code: int | None = None
    ):
        super().__init__(
            message=f"{service} API error: {message}",
            details=f"Status code: {api_status_code}" if api_status_code else None,
        )
        self.service = service
        self.api_status_code = api_status_code


class DatabaseError(OrbitXError):
    """Raised when a database operation fails."""

    status_code = 500

    def __init__(self, operation: str, reason: str):
        super().__init__(
            message=f"Database {operation} failed",
            details=reason,
        )
        self.operation = operation


class WorkflowNotFoundError(OrbitXError):
    """Raised when a workflow is not found or user doesn't have access."""

    status_code = 404

    def __init__(self, workflow_id: str):
        super().__init__(
            message=f"Workflow not found: {workflow_id}",
            details="The workflow does not exist or you don't have access to it.",
        )
        self.workflow_id = workflow_id


class ValidationError(OrbitXError):
    """Raised when input validation fails."""

    status_code = 400

    def __init__(self, field: str, reason: str):
        super().__init__(
            message=f"Validation failed for {field}",
            details=reason,
        )
        self.field = field


class TokenError(OrbitXError):
    """Raised when token operations fail."""

    status_code = 401

    def __init__(self, reason: str):
        super().__init__(
            message="Token error",
            details=reason,
        )


class WorkflowStructureError(OrbitXError):
    """Raised when workflow node connections violate structural rules."""

    status_code = 422

    def __init__(self, errors: list) -> None:
        messages = [error.message for error in errors]
        super().__init__(
            message="Workflow structure is invalid",
            details="; ".join(messages),
        )
        self.validation_errors = errors
