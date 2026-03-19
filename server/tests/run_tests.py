#!/usr/bin/env python3
"""Test runner script for orbitx-server."""
import os
import subprocess
import sys
from pathlib import Path


def run_command(command: list[str], description: str) -> bool:
    """Run a command and return success status."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"{'='*60}")

    try:
        subprocess.run(command, check=True, capture_output=False)
        print(f"SUCCESS: {description}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"FAILED: {description} (exit code: {e.returncode})")
        return False
    except FileNotFoundError:
        print(f"COMMAND NOT FOUND: {description} - {' '.join(command)}")
        return False


def main():
    """Main test runner function."""
    print("OrbitX Server Test Suite")
    print("=" * 60)

    # Change to project root directory (parent of tests/)
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    success_count = 0
    total_tests = 0

    # Test commands to run
    test_commands = [
        {
            "command": ["python", "-m", "pytest", "--version"],
            "description": "Check pytest installation",
        },
        {
            "command": ["python", "-m", "pytest", "tests/", "-v", "--tb=short"],
            "description": "Run all tests with verbose output",
        },
        {
            "command": [
                "python",
                "-m",
                "pytest",
                "tests/",
                "--cov=api",
                "--cov=services",
                "--cov=schemas",
                "--cov-report=term-missing",
                "--cov-report=html:tests/coverage/html",
            ],
            "description": "Run tests with coverage report",
        },
        {
            "command": ["python", "-m", "pytest", "tests/", "-m", "unit", "--tb=line"],
            "description": "Run unit tests only",
        },
        {
            "command": [
                "python",
                "-m",
                "pytest",
                "tests/",
                "-m",
                "integration",
                "--tb=line",
            ],
            "description": "Run integration tests only",
        },
    ]

    # Run each test command
    for test_config in test_commands:
        total_tests += 1
        if run_command(test_config["command"], test_config["description"]):
            success_count += 1

    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Successful: {success_count}/{total_tests}")
    print(f"Failed: {total_tests - success_count}/{total_tests}")

    if success_count == total_tests:
        print("All tests passed!")
        return 0
    else:
        print("Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
