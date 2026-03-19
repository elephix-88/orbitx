# Makefile for OrbitX Server Tests

.PHONY: help install test test-unit test-integration test-cov lint format clean dev

# Default target
help:
	@echo "OrbitX Server Tests - Available Commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install     - Install dependencies with uv"
	@echo "  make dev         - Install dev dependencies and setup pre-commit"
	@echo ""
	@echo "Testing:"
	@echo "  make test        - Run all tests"
	@echo "  make test-unit   - Run unit tests only"
	@echo "  make test-integration - Run integration tests only"
	@echo "  make test-cov    - Run tests with coverage report"
	@echo "  make test-watch  - Run tests in watch mode"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint        - Run linting (mypy + flake8)"
	@echo "  make format      - Format code with black"
	@echo "  make check       - Run all quality checks"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean       - Clean up cache and temp files"
	@echo ""
	@echo "Running:"
	@echo "  make run         - Start the development server"

# Installation (run from project root)
install:
	@echo "Installing dependencies..."
	cd .. && uv sync

dev: install
	@echo "Setting up development environment..."
	cd .. && uv run pre-commit install
	@echo "Development environment ready!"

# Testing
test:
	@echo "Running all tests..."
	cd .. && uv run python tests/run_tests.py

test-unit:
	@echo "Running unit tests..."
	cd .. && uv run pytest tests/ -m unit -v

test-integration:
	@echo "Running integration tests..."
	cd .. && uv run pytest tests/ -m integration -v

test-cov:
	@echo "Running tests with coverage..."
	cd .. && uv run pytest tests/ --cov=api --cov=services --cov=schemas --cov-report=term-missing --cov-report=html:tests/coverage/html

test-watch:
	@echo "Running tests in watch mode..."
	cd .. && uv run pytest tests/ -f --tb=short

# Code Quality
lint:
	@echo "Running linting..."
	cd .. && uv run mypy api/ services/ schemas/
	cd .. && uv run flake8 api/ services/ schemas/ tests/

format:
	@echo "Formatting code..."
	cd .. && uv run black api/ services/ schemas/ tests/
	cd .. && uv run isort api/ services/ schemas/ tests/

check: lint test
	@echo "All quality checks passed!"

# Cleanup
clean:
	@echo "Cleaning up..."
	find .. -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find .. -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find .. -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "coverage" -exec rm -rf {} + 2>/dev/null || true
	find .. -name "*.pyc" -delete 2>/dev/null || true
	find . -name ".coverage" -delete 2>/dev/null || true
	@echo "Cleanup complete!"

# Running (from project root)
run:
	@echo "Starting development server..."
	cd .. && uv run uvicorn apps.main:app --reload --host 0.0.0.0 --port 8080

# CI/CD helpers
ci-test: install test lint
	@echo "CI tests completed!"

# Docker helpers (from project root)
docker-build:
	@echo "Building Docker image..."
	cd .. && docker build -t orbitx-server .

docker-run:
	@echo "Running Docker container..."
	cd .. && docker run -p 8080:8080 orbitx-server
