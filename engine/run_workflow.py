"""Run a workflow directly from CLI.

Usage:
    uv run python run_workflow.py <workflow_id>
    uv run python run_workflow.py <workflow_id> --execution-id custom-123
"""

import argparse

from loguru import logger

from engine.orchestration.runner import (
    build_and_execute_workflow,
    load_workflow,
    sanitize_name,
)
from server.services.utils import generate_uuid


def main():
    parser = argparse.ArgumentParser(description="Run an OrbitX workflow")
    parser.add_argument("workflow_id", help="MongoDB workflow _id")
    parser.add_argument(
        "--execution-id",
        default=None,
        help="Custom execution ID (auto-generated if not provided)",
    )
    arguments = parser.parse_args()

    execution_id = arguments.execution_id or generate_uuid()
    workflow = load_workflow(arguments.workflow_id)
    job_name = sanitize_name(workflow.job_name)

    logger.info(f"Running workflow: {workflow.job_name} ({arguments.workflow_id})")
    logger.info(f"Execution ID: {execution_id}")

    build_and_execute_workflow(
        workflow=workflow,
        job_name=job_name,
        execution_id=execution_id,
    )


if __name__ == "__main__":
    main()
