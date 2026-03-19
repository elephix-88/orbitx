"""Tests for MySQL loader."""

from unittest.mock import MagicMock, patch

import pandas as pd
import pytest
from sqlalchemy import Table

from engine.exceptions import LoaderException
from engine.node.loaders.mysql.mysql import MySQLLoader


class MockMySQLConfig:
    """Mock MySQL configuration."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 3306,
        database: str = "test_db",
        username: str = "user",
        password: str = "pass",
        table: str = "test_table",
    ):
        self.host = host
        self.port = port
        self.database_name = database
        self.username = username
        self.password = password
        self.destination_table = table
        self.connection_url = f"{host}:{port}"


class TestMySQLLoader:
    """Tests for MySQLLoader class."""

    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_init_creates_connection(self, mock_create_engine: MagicMock) -> None:
        """Test that initialization creates database connection."""
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        mock_create_engine.assert_called_once()
        call_args = mock_create_engine.call_args[0][0]
        assert "mysql+pymysql://" in call_args
        assert config.username in call_args
        assert loader.engine == mock_engine

    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_clean_data_replaces_na_values(self, mock_create_engine: MagicMock) -> None:
        """Test that _clean_data replaces NA values with None."""
        mock_create_engine.return_value = MagicMock()

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        df = pd.DataFrame(
            {
                "col1": [1, pd.NA, 3],
                "col2": ["a", "b", None],
                "col3": [1.0, float("nan"), 3.0],
            }
        )

        cleaned = loader._clean_data(df)

        assert cleaned["col1"].iloc[1] is None
        assert cleaned["col3"].iloc[1] is None

    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_create_table_integer_column(self, mock_create_engine: MagicMock) -> None:
        """Test that _create_table creates table with correct integer column type."""
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        df = pd.DataFrame({"int_col": [1, 2, 3]})

        with patch.object(loader.metadata, "create_all") as mock_create_all:
            table = loader._create_table(df)

            assert isinstance(table, Table)
            mock_create_all.assert_called_once()

    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_create_table_float_column(self, mock_create_engine: MagicMock) -> None:
        """Test that _create_table creates table with correct float column type."""
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        df = pd.DataFrame({"float_col": [1.1, 2.2, 3.3]})

        with patch.object(loader.metadata, "create_all") as mock_create_all:
            table = loader._create_table(df)

            assert isinstance(table, Table)
            mock_create_all.assert_called_once()

    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_create_table_bool_column(self, mock_create_engine: MagicMock) -> None:
        """Test that _create_table creates table with correct boolean column type."""
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        df = pd.DataFrame({"bool_col": [True, False, True]})

        with patch.object(loader.metadata, "create_all") as mock_create_all:
            table = loader._create_table(df)

            assert isinstance(table, Table)
            mock_create_all.assert_called_once()

    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_create_table_datetime_column(self, mock_create_engine: MagicMock) -> None:
        """Test that _create_table creates table with correct datetime column type."""
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        df = pd.DataFrame(
            {"datetime_col": pd.to_datetime(["2024-01-01", "2024-01-02"])}
        )

        with patch.object(loader.metadata, "create_all") as mock_create_all:
            table = loader._create_table(df)

            assert isinstance(table, Table)
            mock_create_all.assert_called_once()

    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_create_table_string_column(self, mock_create_engine: MagicMock) -> None:
        """Test that _create_table creates table with correct string column type."""
        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        df = pd.DataFrame({"str_col": ["a", "b", "c"]})

        with patch.object(loader.metadata, "create_all") as mock_create_all:
            table = loader._create_table(df)

            assert isinstance(table, Table)
            mock_create_all.assert_called_once()

    @patch("engine.node.loaders.mysql.mysql.insert")
    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_insert_data(
        self, mock_create_engine: MagicMock, mock_insert: MagicMock
    ) -> None:
        """Test that _insert_data inserts records correctly."""
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        # Use MagicMock's context manager support
        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_conn)
        mock_context.__exit__ = MagicMock(return_value=False)
        mock_engine.begin.return_value = mock_context
        mock_create_engine.return_value = mock_engine
        mock_insert.return_value = MagicMock()

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        df = pd.DataFrame({"col1": [1, 2], "col2": ["a", "b"]})
        mock_table = MagicMock()
        mock_table.name = "test_table"

        loader._insert_data(mock_table, df)

        mock_insert.assert_called_once_with(mock_table)
        mock_conn.execute.assert_called_once()

    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_load_success(self, mock_create_engine: MagicMock) -> None:
        """Test successful data loading."""
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_engine.begin.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_engine.begin.return_value.__exit__ = MagicMock(return_value=False)
        mock_create_engine.return_value = mock_engine

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        df = pd.DataFrame({"col1": [1, 2], "col2": ["a", "b"]})

        with patch.object(loader.metadata, "create_all"):
            loader.load(df)

        mock_conn.execute.assert_called_once()

    @patch("engine.node.loaders.mysql.mysql.create_engine")
    def test_load_raises_loader_exception_on_error(
        self, mock_create_engine: MagicMock
    ) -> None:
        """Test that load raises LoaderException on failure."""
        mock_engine = MagicMock()
        mock_engine.begin.side_effect = Exception("Connection failed")
        mock_create_engine.return_value = mock_engine

        config = MockMySQLConfig()
        loader = MySQLLoader(config)

        df = pd.DataFrame({"col1": [1, 2]})

        with patch.object(loader.metadata, "create_all"):
            with pytest.raises(LoaderException) as exc_info:
                loader.load(df)

            assert "Failed to load data to MySQL" in str(exc_info.value)
            assert exc_info.value.destination_type == "mysql"
            assert exc_info.value.destination_table == config.destination_table
