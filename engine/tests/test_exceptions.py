"""Tests for the custom exception hierarchy."""

from engine.exceptions import (
    ConfigurationException,
    ConnectionException,
    ExtractorException,
    LoaderException,
    OrbitXException,
    RateLimitException,
    RetryableException,
    TransformerException,
    ValidationException,
    WorkflowExecutionException,
)


class TestOrbitXException:
    """Tests for the base OrbitXException."""

    def test_basic_exception(self):
        """Test basic exception with just a message."""
        exc = OrbitXException("Something went wrong")
        assert exc.message == "Something went wrong"
        assert exc.node_id is None
        assert exc.node_instance_id is None
        assert exc.details == {}
        assert str(exc) == "Something went wrong"

    def test_exception_with_node_context(self):
        """Test exception with node context."""
        exc = OrbitXException(
            "Node failed",
            node_id="facebook_ads",
            node_instance_id=123,
        )
        assert exc.message == "Node failed"
        assert exc.node_id == "facebook_ads"
        assert exc.node_instance_id == 123
        assert "node_id=facebook_ads" in str(exc)
        assert "node_instance_id=123" in str(exc)

    def test_exception_with_details(self):
        """Test exception with additional details."""
        exc = OrbitXException(
            "Error occurred",
            details={"key": "value", "count": 42},
        )
        assert exc.details == {"key": "value", "count": 42}

    def test_exception_inheritance(self):
        """Test that OrbitXException inherits from Exception."""
        exc = OrbitXException("Test")
        assert isinstance(exc, Exception)


class TestConfigurationException:
    """Tests for ConfigurationException."""

    def test_configuration_exception(self):
        """Test configuration exception."""
        exc = ConfigurationException(
            "Invalid configuration",
            node_id="google_ads",
            node_instance_id=1,
        )
        assert isinstance(exc, OrbitXException)
        assert exc.message == "Invalid configuration"
        assert exc.node_id == "google_ads"


class TestConnectionException:
    """Tests for ConnectionException."""

    def test_connection_exception(self):
        """Test connection exception with service context."""
        exc = ConnectionException(
            "Failed to connect",
            service_name="facebook_ads",
            connection_id="conn_123",
            node_id="facebook_ads_extractor",
        )
        assert isinstance(exc, OrbitXException)
        assert exc.service_name == "facebook_ads"
        assert exc.connection_id == "conn_123"
        assert exc.details["service_name"] == "facebook_ads"
        assert exc.details["connection_id"] == "conn_123"


class TestExtractorException:
    """Tests for ExtractorException."""

    def test_extractor_exception(self):
        """Test extractor exception with source type."""
        exc = ExtractorException(
            "Extraction failed",
            source_type="google_ads",
            node_id="google_ads_source",
            node_instance_id=5,
        )
        assert isinstance(exc, OrbitXException)
        assert exc.source_type == "google_ads"
        assert exc.details["source_type"] == "google_ads"


class TestTransformerException:
    """Tests for TransformerException."""

    def test_transformer_exception(self):
        """Test transformer exception with transform type."""
        exc = TransformerException(
            "Transform failed",
            transform_type="sql",
            node_id="sql_transform",
        )
        assert isinstance(exc, OrbitXException)
        assert exc.transform_type == "sql"
        assert exc.details["transform_type"] == "sql"


class TestLoaderException:
    """Tests for LoaderException."""

    def test_loader_exception(self):
        """Test loader exception with destination context."""
        exc = LoaderException(
            "Load failed",
            destination_type="bigquery",
            destination_table="project.dataset.table",
            node_id="bq_loader",
        )
        assert isinstance(exc, OrbitXException)
        assert exc.destination_type == "bigquery"
        assert exc.destination_table == "project.dataset.table"
        assert exc.details["destination_type"] == "bigquery"
        assert exc.details["destination_table"] == "project.dataset.table"


class TestValidationException:
    """Tests for ValidationException."""

    def test_validation_exception(self):
        """Test validation exception with expected/actual values."""
        exc = ValidationException(
            "Schema mismatch",
            validation_type="schema",
            expected=["col_a", "col_b"],
            actual=["col_a", "col_c"],
        )
        assert isinstance(exc, OrbitXException)
        assert exc.validation_type == "schema"
        assert exc.expected == ["col_a", "col_b"]
        assert exc.actual == ["col_a", "col_c"]


class TestWorkflowExecutionException:
    """Tests for WorkflowExecutionException."""

    def test_workflow_execution_exception(self):
        """Test workflow execution exception with failed nodes."""
        exc = WorkflowExecutionException(
            "Workflow failed",
            workflow_id="wf_123",
            failed_nodes=["node_1", "node_2"],
        )
        assert isinstance(exc, OrbitXException)
        assert exc.workflow_id == "wf_123"
        assert exc.failed_nodes == ["node_1", "node_2"]
        assert exc.details["workflow_id"] == "wf_123"
        assert exc.details["failed_nodes"] == ["node_1", "node_2"]


class TestRetryableException:
    """Tests for RetryableException."""

    def test_retryable_exception_defaults(self):
        """Test retryable exception with default values."""
        exc = RetryableException("Transient error")
        assert isinstance(exc, OrbitXException)
        assert exc.max_retries == 3
        assert exc.retry_delay == 1.0

    def test_retryable_exception_custom_values(self):
        """Test retryable exception with custom retry values."""
        exc = RetryableException(
            "Network timeout",
            max_retries=5,
            retry_delay=2.5,
        )
        assert exc.max_retries == 5
        assert exc.retry_delay == 2.5
        assert exc.details["max_retries"] == 5
        assert exc.details["retry_delay"] == 2.5


class TestRateLimitException:
    """Tests for RateLimitException."""

    def test_rate_limit_exception(self):
        """Test rate limit exception."""
        exc = RateLimitException(
            "Rate limit exceeded",
            limit=100,
        )
        assert isinstance(exc, RetryableException)
        assert isinstance(exc, OrbitXException)
        assert exc.limit == 100


class TestExceptionChaining:
    """Tests for exception chaining."""

    def test_exception_can_be_chained(self):
        """Test that exceptions can be properly chained."""
        original = ValueError("Original error")
        exc = ExtractorException(
            "Extraction failed",
            source_type="facebook_ads",
        )
        # Simulate raising with 'from'
        try:
            try:
                raise original
            except ValueError as e:
                raise exc from e
        except ExtractorException as caught:
            assert caught.__cause__ is original

    def test_exception_can_be_caught_by_base_class(self):
        """Test that all exceptions can be caught by OrbitXException."""
        exceptions = [
            ConfigurationException("config error"),
            ConnectionException("connection error"),
            ExtractorException("extractor error"),
            TransformerException("transformer error"),
            LoaderException("loader error"),
            ValidationException("validation error"),
            WorkflowExecutionException("workflow error"),
            RetryableException("retryable error"),
            RateLimitException("rate limit error"),
        ]
        for exc in exceptions:
            try:
                raise exc
            except OrbitXException as caught:
                assert caught is exc
