from datetime import date

import pandas as pd
from common.model.transform import SQLTransformConfig

from engine.node.transformers.sql import SQLTransformer


def test_no_query_returns_input():
    df = pd.DataFrame({"id": [1, 2], "name": ["a", "b"]})
    cfg = SQLTransformConfig(table_name="temp_table", sql_query="")
    t = SQLTransformer(cfg)

    out = t.transform(df)

    # Should return the original DataFrame when no query
    assert out is df


def test_simple_select_and_filter():
    """Test basic SELECT with WHERE clause."""
    df = pd.DataFrame(
        {
            "id": [1, 2, 3],
            "name": ["x", "y", "z"],
            "amount": [1.5, 2.5, 3.5],
        }
    )

    cfg = SQLTransformConfig(
        table_name="temp_table",
        sql_query="select id, name from temp_table where id > 1 order by id",
    )
    t = SQLTransformer(cfg)

    out = t.transform(df)

    assert list(out.columns) == ["id", "name"]
    assert list(out["id"]) == [2, 3]
    assert list(out["name"]) == ["y", "z"]


def test_sql_transformer_select_all():
    # Sample data
    data = {"id": [1, 2, 3], "name": ["A", "B", "C"]}
    df = pd.DataFrame(data)

    # SQL query
    query = "SELECT * FROM temp_table"
    config = SQLTransformConfig(table_name="temp_table", sql_query=query)
    transformer = SQLTransformer(config)

    # Transform
    result_df = transformer.transform(df)

    # Expected result
    expected_data = {"id": [1, 2, 3], "name": ["A", "B", "C"]}
    expected_df = pd.DataFrame(expected_data)

    pd.testing.assert_frame_equal(result_df, expected_df)


def test_sql_transformer_filter():
    # Sample data
    data = {"id": [1, 2, 3], "value": [10, 20, 30]}
    df = pd.DataFrame(data)

    # SQL query
    query = "SELECT * FROM temp_table WHERE value > 15"
    config = SQLTransformConfig(table_name="temp_table", sql_query=query)
    transformer = SQLTransformer(config)

    # Transform
    result_df = transformer.transform(df)

    # Expected result
    expected_data = {"id": [2, 3], "value": [20, 30]}
    expected_df = pd.DataFrame(expected_data)

    pd.testing.assert_frame_equal(result_df, expected_df)


def test_sql_transformer_aggregate():
    # Sample data
    data = {"category": ["A", "A", "B"], "value": [10, 20, 30]}
    df = pd.DataFrame(data)

    # SQL query
    query = "SELECT category, SUM(value) as total FROM temp_table GROUP BY category ORDER BY category"
    config = SQLTransformConfig(table_name="temp_table", sql_query=query)
    transformer = SQLTransformer(config)

    # Transform
    result_df = transformer.transform(df)

    # Expected result
    expected_data = {"category": ["A", "B"], "total": [30, 30]}
    expected_df = pd.DataFrame(expected_data)

    # DuckDB's SUM can return float, so we cast to ensure type match
    result_df["total"] = result_df["total"].astype("int64")

    pd.testing.assert_frame_equal(result_df, expected_df)


def test_sql_transformer_with_expression_and_alias():
    # Sample data
    data = {"name": ["A", "B", "C"], "value": [10, 20, 30]}
    df = pd.DataFrame(data)

    # SQL query with expression and alias
    query = "SELECT name, value * 2 AS doubled_value FROM temp_table"
    config = SQLTransformConfig(table_name="temp_table", sql_query=query)
    transformer = SQLTransformer(config)

    # Transform
    result_df = transformer.transform(df)

    # Expected result
    expected_data = {"name": ["A", "B", "C"], "doubled_value": [20, 40, 60]}
    expected_df = pd.DataFrame(expected_data)

    pd.testing.assert_frame_equal(result_df, expected_df)


def test_sql_transformer_with_null_values():
    # Sample data with NULLs
    data = {"category": ["A", "A", "B", None], "value": [10, None, 30, 40]}
    df = pd.DataFrame(data)

    # SQL query to count non-null values
    query = "SELECT category, COUNT(value) as count_value FROM temp_table GROUP BY category ORDER BY category"
    config = SQLTransformConfig(table_name="temp_table", sql_query=query)
    transformer = SQLTransformer(config)

    result_df = transformer.transform(df)

    # Expected result from DuckDB (it will create a row for the None category)
    # DuckDB with ORDER BY ASC places NULLS LAST
    expected_data = {"category": ["A", "B", None], "count_value": [1, 1, 1]}
    expected_df = pd.DataFrame(expected_data)

    # DuckDB may return float for counts when NaNs are involved, so we cast to be sure
    result_df["count_value"] = result_df["count_value"].astype("int64")

    pd.testing.assert_frame_equal(result_df, expected_df)


def test_sql_transformer_with_datetime():
    # Sample data with dates
    data = {
        "event_date": [date(2023, 1, 1), date(2023, 1, 15), date(2023, 2, 1)],
        "revenue": [100, 150, 200],
    }
    df = pd.DataFrame(data)

    # SQL query to filter by date
    query = "SELECT * FROM temp_table WHERE event_date > '2023-01-10'"
    config = SQLTransformConfig(table_name="temp_table", sql_query=query)
    transformer = SQLTransformer(config)

    result_df = transformer.transform(df)

    # Expected result
    expected_data = {
        "event_date": [date(2023, 1, 15), date(2023, 2, 1)],
        "revenue": [150, 200],
    }
    expected_df = pd.DataFrame(expected_data)

    # DuckDB may return datetime objects, so convert to date for comparison
    result_df["event_date"] = pd.to_datetime(result_df["event_date"]).dt.date

    pd.testing.assert_frame_equal(result_df, expected_df)


def test_sql_transformer_with_cte():
    # Sample data
    data = {"category": ["A", "A", "B", "B"], "value": [10, 20, 30, 40]}
    df = pd.DataFrame(data)

    # SQL query using a Common Table Expression (CTE)
    query = """
    WITH aggregated AS (
        SELECT category, SUM(value) as total_value
        FROM temp_table
        GROUP BY category
    )
    SELECT * FROM aggregated WHERE total_value > 50
    """
    config = SQLTransformConfig(table_name="temp_table", sql_query=query)
    transformer = SQLTransformer(config)

    result_df = transformer.transform(df)

    # Expected result
    expected_data = {"category": ["B"], "total_value": [70]}
    expected_df = pd.DataFrame(expected_data)

    # DuckDB's SUM can return float, so we cast to ensure type match
    result_df["total_value"] = result_df["total_value"].astype("int64")

    pd.testing.assert_frame_equal(result_df, expected_df)
