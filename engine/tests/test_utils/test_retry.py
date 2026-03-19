"""Tests for retry utilities."""

from unittest.mock import MagicMock, patch

import pytest

from engine.utils.retry import calculate_backoff_with_jitter, with_retry


class TestWithRetry:
    """Tests for with_retry function."""

    def test_successful_first_attempt(self) -> None:
        """Test that successful calls return immediately."""
        mock_func = MagicMock(return_value="success")

        result = with_retry(mock_func, "arg1", kwarg="value")

        assert result == "success"
        mock_func.assert_called_once_with("arg1", kwarg="value")

    def test_retry_on_connection_error(self) -> None:
        """Test that ConnectionError triggers retry."""
        mock_func = MagicMock(side_effect=[ConnectionError("fail"), "success"])

        result = with_retry(mock_func)

        assert result == "success"
        assert mock_func.call_count == 2

    def test_retry_on_timeout_error(self) -> None:
        """Test that TimeoutError triggers retry."""
        mock_func = MagicMock(side_effect=[TimeoutError("timeout"), "success"])

        result = with_retry(mock_func)

        assert result == "success"
        assert mock_func.call_count == 2

    def test_retry_on_os_error(self) -> None:
        """Test that OSError triggers retry."""
        mock_func = MagicMock(side_effect=[OSError("os error"), "success"])

        result = with_retry(mock_func)

        assert result == "success"
        assert mock_func.call_count == 2

    def test_no_retry_on_value_error(self) -> None:
        """Test that non-transient errors are not retried."""
        mock_func = MagicMock(side_effect=ValueError("not transient"))

        with pytest.raises(ValueError, match="not transient"):
            with_retry(mock_func)

        mock_func.assert_called_once()

    def test_max_retries_exceeded(self) -> None:
        """Test that after max retries, exception is raised."""
        mock_func = MagicMock(side_effect=ConnectionError("persistent fail"))

        with pytest.raises(ConnectionError, match="persistent fail"):
            with_retry(mock_func)

        assert mock_func.call_count == 3  # 3 attempts


class TestCalculateBackoffWithJitter:
    """Tests for calculate_backoff_with_jitter function."""

    def test_first_attempt_backoff(self) -> None:
        """Test backoff calculation for first attempt."""
        with patch("engine.utils.retry.random.uniform", return_value=0.0):
            result = calculate_backoff_with_jitter(attempt=1, base_interval=2.0)

        # 2.0 * (2^0) = 2.0, no jitter
        assert result == 2.0

    def test_second_attempt_backoff(self) -> None:
        """Test backoff calculation for second attempt."""
        with patch("engine.utils.retry.random.uniform", return_value=0.0):
            result = calculate_backoff_with_jitter(attempt=2, base_interval=2.0)

        # 2.0 * (2^1) = 4.0, no jitter
        assert result == 4.0

    def test_max_interval_cap(self) -> None:
        """Test that backoff is capped at max_interval."""
        with patch("engine.utils.retry.random.uniform", return_value=0.0):
            result = calculate_backoff_with_jitter(
                attempt=10, base_interval=2.0, max_interval=10.0
            )

        # Should be capped at 10.0
        assert result == 10.0

    def test_minimum_return_value(self) -> None:
        """Test that return value is at least 1.0."""
        with patch("engine.utils.retry.random.uniform", return_value=-0.3):
            result = calculate_backoff_with_jitter(attempt=1, base_interval=1.0)

        # 1.0 - 30% jitter = 0.7, but minimum is 1.0
        assert result >= 1.0

    def test_jitter_applied(self) -> None:
        """Test that jitter is applied within expected range."""
        results = []
        for _ in range(100):
            result = calculate_backoff_with_jitter(attempt=1, base_interval=10.0)
            results.append(result)

        # With jitter of ±30%, values should be between 7.0 and 13.0
        # But minimum is 1.0
        assert all(r >= 1.0 for r in results)
        # Check there's some variance (jitter is working)
        assert max(results) != min(results)
