"""Tests for transform factory."""

from unittest.mock import MagicMock

import pytest

from engine.factories.transform import TransformFactory


class TestTransformFactory:
    """Tests for TransformFactory."""

    def test_create_sql_transformer(self) -> None:
        """Test creating SQL transformer via custom registry."""
        mock_transformer_cls = MagicMock()
        mock_transformer = MagicMock()
        mock_transformer_cls.return_value = mock_transformer

        factory = TransformFactory(registry={"sql": mock_transformer_cls})

        mock_config = MagicMock()
        result = factory.create_transformer(mock_config, "sql")

        assert result == mock_transformer
        mock_transformer_cls.assert_called_once_with(mock_config)

    def test_create_unknown_transformer_raises_error(self) -> None:
        """Test that unknown transformer type raises ValueError."""
        factory = TransformFactory(registry={})

        mock_config = MagicMock()

        with pytest.raises(ValueError, match="Unknown transform type"):
            factory.create_transformer(mock_config, "unknown_transform")

    def test_register_custom_transformer(self) -> None:
        """Test registering a custom transformer."""
        mock_transformer_cls = MagicMock()
        mock_transformer = MagicMock()
        mock_transformer_cls.return_value = mock_transformer

        factory = TransformFactory(registry={})
        factory.register("custom_transform", mock_transformer_cls)

        mock_config = MagicMock()
        result = factory.create_transformer(mock_config, "custom_transform")

        assert result == mock_transformer
        mock_transformer_cls.assert_called_once_with(mock_config)
