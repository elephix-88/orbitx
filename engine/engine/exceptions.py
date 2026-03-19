"""Custom exception hierarchy for the OrbitX workflow engine.

This module provides a structured exception hierarchy for categorizing and handling
errors that occur during workflow execution. Each exception type carries contextual
information to aid in debugging and error reporting.
"""

import time
from typing import Any


class OrbitXException(Exception):
    """Base exception for all OrbitX workflow engine errors.

    All custom exceptions in the workflow engine should inherit from this class.
    This allows catching all workflow-related errors with a single except clause.

    Attributes:
        message: Human-readable error description.
        node_id: Optional identifier of the node where the error occurred.
        node_instance_id: Optional instance identifier for the specific node execution.
        details: Optional dictionary with additional context about the error.
    """

    def __init__(
        self,
        message: str,
        node_id: str | None = None,
        node_instance_id: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.node_id = node_id
        self.node_instance_id = node_instance_id
        self.details = details or {}
        super().__init__(self._format_message())

    def _format_message(self) -> str:
        """Format the exception message with node context if available."""
        parts = [self.message]
        if self.node_id:
            parts.append(f"node_id={self.node_id}")
        if self.node_instance_id is not None:
            parts.append(f"node_instance_id={self.node_instance_id}")
        return " | ".join(parts)


class ConfigurationException(OrbitXException):
    """Raised when there's an error in workflow or node configuration."""

    pass


class ConnectionException(OrbitXException):
    """Raised when there's an error with external service connections.

    Attributes:
        service_name: The name of the service that failed to connect.
        connection_id: The ID of the connection configuration.
    """

    def __init__(
        self,
        message: str,
        service_name: str | None = None,
        connection_id: str | None = None,
        node_id: str | None = None,
        node_instance_id: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.service_name = service_name
        self.connection_id = connection_id
        details = details or {}
        if service_name:
            details["service_name"] = service_name
        if connection_id:
            details["connection_id"] = connection_id
        super().__init__(message, node_id, node_instance_id, details)


class ExtractorException(OrbitXException):
    """Raised when data extraction fails.

    Attributes:
        source_type: The type of source being extracted from.
    """

    def __init__(
        self,
        message: str,
        source_type: str | None = None,
        node_id: str | None = None,
        node_instance_id: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.source_type = source_type
        details = details or {}
        if source_type:
            details["source_type"] = source_type
        super().__init__(message, node_id, node_instance_id, details)


class TransformerException(OrbitXException):
    """Raised when data transformation fails.

    Attributes:
        transform_type: The type of transformation that failed.
    """

    def __init__(
        self,
        message: str,
        transform_type: str | None = None,
        node_id: str | None = None,
        node_instance_id: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.transform_type = transform_type
        details = details or {}
        if transform_type:
            details["transform_type"] = transform_type
        super().__init__(message, node_id, node_instance_id, details)


class LoaderException(OrbitXException):
    """Raised when data loading fails.

    Attributes:
        destination_type: The type of destination being loaded to.
        destination_table: The target table or sheet name.
    """

    def __init__(
        self,
        message: str,
        destination_type: str | None = None,
        destination_table: str | None = None,
        node_id: str | None = None,
        node_instance_id: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.destination_type = destination_type
        self.destination_table = destination_table
        details = details or {}
        if destination_type:
            details["destination_type"] = destination_type
        if destination_table:
            details["destination_table"] = destination_table
        super().__init__(message, node_id, node_instance_id, details)


class ValidationException(OrbitXException):
    """Raised when data or schema validation fails.

    Attributes:
        validation_type: The type of validation that failed.
        expected: What was expected.
        actual: What was actually received.
    """

    def __init__(
        self,
        message: str,
        validation_type: str | None = None,
        expected: Any | None = None,
        actual: Any | None = None,
        node_id: str | None = None,
        node_instance_id: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.validation_type = validation_type
        self.expected = expected
        self.actual = actual
        details = details or {}
        if validation_type:
            details["validation_type"] = validation_type
        if expected is not None:
            details["expected"] = expected
        if actual is not None:
            details["actual"] = actual
        super().__init__(message, node_id, node_instance_id, details)


class WorkflowExecutionException(OrbitXException):
    """Raised when workflow-level execution fails.

    Attributes:
        workflow_id: The ID of the workflow that failed.
        failed_nodes: List of node IDs that failed during execution.
    """

    def __init__(
        self,
        message: str,
        workflow_id: str | None = None,
        failed_nodes: list | None = None,
        node_id: str | None = None,
        node_instance_id: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.workflow_id = workflow_id
        self.failed_nodes = failed_nodes or []
        details = details or {}
        if workflow_id:
            details["workflow_id"] = workflow_id
        if failed_nodes:
            details["failed_nodes"] = failed_nodes
        super().__init__(message, node_id, node_instance_id, details)


class RetryableException(OrbitXException):
    """Marker exception for errors that can be retried.

    Attributes:
        max_retries: Suggested maximum number of retry attempts.
        retry_delay: Suggested delay between retries in seconds.
    """

    def __init__(
        self,
        message: str,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        node_id: str | None = None,
        node_instance_id: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        details = details or {}
        details["max_retries"] = max_retries
        details["retry_delay"] = retry_delay
        super().__init__(message, node_id, node_instance_id, details)


class RateLimitException(RetryableException):
    """Raised when an API rate limit is exceeded.

    Attributes:
        reset_time: Unix timestamp when the rate limit resets.
        limit: The rate limit that was exceeded.
    """

    def __init__(
        self,
        message: str,
        reset_time: float | None = None,
        limit: int | None = None,
        node_id: str | None = None,
        node_instance_id: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.reset_time = reset_time
        self.limit = limit
        details = details or {}
        if reset_time:
            details["reset_time"] = reset_time
        if limit:
            details["limit"] = limit
        retry_delay = (reset_time - time.time()) if reset_time else 60.0
        retry_delay = max(1.0, retry_delay)
        super().__init__(
            message,
            max_retries=3,
            retry_delay=retry_delay,
            node_id=node_id,
            node_instance_id=node_instance_id,
            details=details,
        )
