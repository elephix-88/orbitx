"""Tests for loader factory."""

from unittest.mock import MagicMock

import pytest

from engine.factories.loader import DefaultLoaderFactory, LoaderFactory


class TestLoaderFactory:
    """Tests for LoaderFactory."""

    def test_create_mysql_loader(self) -> None:
        """Test creating MySQL loader via custom registry."""
        mock_loader_cls = MagicMock()
        mock_loader = MagicMock()
        mock_loader_cls.return_value = mock_loader

        factory = DefaultLoaderFactory(registry={"mysql": mock_loader_cls})

        mock_config = MagicMock()
        result = factory.create_loader(mock_config, "mysql")

        assert result == mock_loader
        mock_loader_cls.assert_called_once_with(mock_config)

    def test_create_bigquery_loader(self) -> None:
        """Test creating BigQuery loader via custom registry."""
        mock_loader_cls = MagicMock()
        mock_loader = MagicMock()
        mock_loader_cls.return_value = mock_loader

        factory = DefaultLoaderFactory(registry={"bigquery": mock_loader_cls})

        mock_config = MagicMock()
        result = factory.create_loader(mock_config, "bigquery")

        assert result == mock_loader
        mock_loader_cls.assert_called_once_with(mock_config)

    def test_create_googlesheet_loader(self) -> None:
        """Test creating Google Sheets loader via custom registry."""
        mock_loader_cls = MagicMock()
        mock_loader = MagicMock()
        mock_loader_cls.return_value = mock_loader

        factory = DefaultLoaderFactory(registry={"google_sheet": mock_loader_cls})

        mock_config = MagicMock()
        result = factory.create_loader(mock_config, "google_sheet")

        assert result == mock_loader
        mock_loader_cls.assert_called_once_with(mock_config)

    def test_create_unknown_loader_raises_error(self) -> None:
        """Test that unknown loader type raises ValueError."""
        factory = DefaultLoaderFactory(registry={})

        mock_config = MagicMock()

        with pytest.raises(ValueError, match="Unknown loader type"):
            factory.create_loader(mock_config, "unknown_loader")

    def test_register_custom_loader(self) -> None:
        """Test registering a custom loader."""
        mock_loader_cls = MagicMock()
        mock_loader = MagicMock()
        mock_loader_cls.return_value = mock_loader

        factory = DefaultLoaderFactory(registry={})
        factory.register("custom_loader", mock_loader_cls)

        mock_config = MagicMock()
        result = factory.create_loader(mock_config, "custom_loader")

        assert result == mock_loader
        mock_loader_cls.assert_called_once_with(mock_config)

    def test_backwards_compatibility_alias(self) -> None:
        """Test that LoaderFactory is alias for DefaultLoaderFactory."""
        assert LoaderFactory is DefaultLoaderFactory
