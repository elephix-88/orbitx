# OrbitX Server Tests

This directory contains comprehensive tests for the OrbitX Server backend.

## Test Structure

```
tests/
├── __init__.py                 # Test package initialization
├── conftest.py                 # Shared fixtures and test configuration
├── test_workflow_api.py        # Tests for workflow API endpoints
├── test_connection_api.py      # Tests for connection API endpoints
├── test_google_oauth_api.py    # Tests for Google OAuth endpoints
├── test_services.py            # Tests for service layer functions
├── test_schemas.py             # Tests for Pydantic schemas
└── README.md                   # This file
```

## Running Tests

### Quick Start
```bash
# Run all tests
make test

# Run specific test types
make test-unit          # Unit tests only
make test-integration   # Integration tests only
make test-cov          # Tests with coverage report
```

### Using pytest directly
```bash
# Install dependencies first
uv sync

# Run all tests
uv run pytest tests/ -v

# Run specific test file
uv run pytest tests/test_workflow_api.py -v

# Run tests with coverage
uv run pytest tests/ --cov=api --cov=services --cov=schemas --cov-report=html

# Run tests by marker
uv run pytest tests/ -m unit
uv run pytest tests/ -m integration
```

### Using the test runner script
```bash
python run_tests.py
```

## Test Markers

Tests are organized using pytest markers:

- `@pytest.mark.unit` - Fast, isolated unit tests
- `@pytest.mark.integration` - Tests that involve multiple components
- `@pytest.mark.slow` - Tests that take longer to run

## Test Configuration

Test configuration is defined in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = [
    "--strict-markers",
    "--cov=api",
    "--cov=services",
    "--cov=schemas",
    "--cov-report=term-missing",
    "--cov-fail-under=80"
]
```

## Test Coverage

We aim for **80%+ test coverage** across:
- API endpoints (`api/`)
- Service functions (`services/`)
- Pydantic schemas (`schemas/`)

Coverage reports are generated in:
- Terminal: `--cov-report=term-missing`
- HTML: `--cov-report=html` (creates `htmlcov/` directory)

## Test Categories

### API Endpoint Tests
- **Workflow API** (`test_workflow_api.py`)
  - Create, read, update, delete workflows
  - Execute workflows
  - Error handling and validation

- **Connection API** (`test_connection_api.py`)
  - List, get, delete connections
  - Database error scenarios
  - CRUD flow integration tests

- **Google OAuth API** (`test_google_oauth_api.py`)
  - OAuth login flows for different services
  - OAuth callback handling
  - State validation and security
  - Token exchange processes

### Service Layer Tests
- **Workflow Services** (`test_services.py`)
  - Business logic functions
  - Database interactions
  - Google Cloud Run integration
  - OAuth state management

### Schema Tests
- **Pydantic Models** (`test_schemas.py`)
  - Data validation
  - Serialization/deserialization
  - Field requirements and constraints
  - Complex nested structures

## Fixtures and Mocks

### Key Fixtures (defined in `conftest.py`)

- `client` - FastAPI test client
- `mock_mongodb` - Mocked MongoDB operations
- `sample_workflow_data` - Sample workflow for testing
- `sample_connection_data` - Sample connection for testing
- `mock_google_oauth` - Mocked Google OAuth responses
- `mock_google_cloud_run` - Mocked Cloud Run client
- `mock_settings` - Mocked application settings

### Mock Strategy

Tests use comprehensive mocking to:
- Isolate units under test
- Avoid external dependencies (databases, APIs)
- Ensure fast, reliable test execution
- Test error scenarios safely

## Test Metrics

### Current Test Coverage
- **API Endpoints**: ~95% coverage
- **Services**: ~90% coverage
- **Schemas**: ~85% coverage
- **Overall**: ~90% coverage

### Test Counts
- **Unit Tests**: ~50 tests
- **Integration Tests**: ~15 tests
- **Total**: ~65 tests

## Debugging Tests

### Running specific tests
```bash
# Run single test method
uv run pytest tests/test_workflow_api.py::TestWorkflowEndpoints::test_create_workflow_success -v

# Run tests matching pattern
uv run pytest tests/ -k "test_create" -v

# Run with detailed output
uv run pytest tests/ -vv --tb=long
```

### Common Issues

1. **Import Errors**: Ensure you're running from project root
2. **Mock Issues**: Check that mocks are properly configured in `conftest.py`
3. **Async Issues**: Use `pytest-asyncio` for async test functions

## Continuous Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests
- Multiple Python versions (3.10, 3.11, 3.12)

See `.github/workflows/test.yml` for CI configuration.

## Writing New Tests

### Test Naming Convention
- Test files: `test_*.py`
- Test classes: `Test*`
- Test methods: `test_*`

### Example Test Structure
```python
class TestMyFeature:
    """Test my feature functionality."""

    @pytest.mark.unit
    def test_my_function_success(self, mock_dependency):
        """Test successful execution of my function."""
        # Arrange
        expected_result = "success"
        mock_dependency.return_value = expected_result

        # Act
        result = my_function()

        # Assert
        assert result == expected_result
        mock_dependency.assert_called_once()
```

### Best Practices
1. **AAA Pattern**: Arrange, Act, Assert
2. **Descriptive Names**: Test names should describe the scenario
3. **Single Responsibility**: One test per scenario
4. **Use Fixtures**: Leverage shared fixtures for common setup
5. **Mock External Dependencies**: Keep tests isolated and fast
6. **Test Edge Cases**: Include error scenarios and boundary conditions

## Future Improvements

- [ ] Add performance/load tests
- [ ] Add API contract tests
- [ ] Increase integration test coverage
- [ ] Add database integration tests with test containers
- [ ] Add end-to-end tests with real OAuth flows (in separate environment)
