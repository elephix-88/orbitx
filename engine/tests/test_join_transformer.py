import pandas as pd
import pytest
from common.model.transform import JoinSource, JoinTransformConfig, JoinType

from engine.exceptions import TransformerException
from engine.node.transformers.join import JoinTransformer


class TestJoinTransformer:
    """Tests for JoinTransformer with N sources"""

    def test_two_source_inner_join(self) -> None:
        """Basic 2-source inner join"""
        fb = pd.DataFrame(
            {"date": ["2024-01-01", "2024-01-02"], "fb_spend": [100, 200]}
        )
        google = pd.DataFrame(
            {"date": ["2024-01-02", "2024-01-03"], "google_spend": [150, 250]}
        )

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[JoinSource(node_id=2, key="date", join_type=JoinType.INNER)],
        )
        transformer = JoinTransformer(config)
        result = transformer.transform({1: fb, 2: google})

        assert len(result) == 1  # Only 2024-01-02 matches
        assert result.iloc[0]["date"] == "2024-01-02"
        assert result.iloc[0]["fb_spend"] == 200
        assert result.iloc[0]["google_spend"] == 150

    def test_three_source_mixed_joins(self) -> None:
        """3 sources with different join types"""
        fb = pd.DataFrame(
            {
                "date": ["2024-01-01", "2024-01-02", "2024-01-03"],
                "fb_spend": [100, 200, 300],
            }
        )
        google = pd.DataFrame(
            {"date": ["2024-01-02", "2024-01-03"], "google_spend": [150, 250]}
        )
        mysql = pd.DataFrame(
            {"date": ["2024-01-01", "2024-01-02"], "revenue": [1000, 2000]}
        )

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[
                JoinSource(node_id=2, key="date", join_type=JoinType.INNER),
                JoinSource(node_id=3, key="date", join_type=JoinType.LEFT),
            ],
        )
        transformer = JoinTransformer(config)
        result = transformer.transform({1: fb, 2: google, 3: mysql})

        # FB INNER Google = Jan 2, Jan 3
        # Result LEFT MySQL = Jan 2 (has revenue), Jan 3 (no revenue)
        assert len(result) == 2
        assert list(result["date"]) == ["2024-01-02", "2024-01-03"]
        assert result[result["date"] == "2024-01-02"]["revenue"].iloc[0] == 2000
        assert pd.isna(result[result["date"] == "2024-01-03"]["revenue"].iloc[0])

    def test_left_join_preserves_base(self) -> None:
        """LEFT join keeps all base rows"""
        fb = pd.DataFrame(
            {"date": ["2024-01-01", "2024-01-02"], "fb_spend": [100, 200]}
        )
        google = pd.DataFrame({"date": ["2024-01-02"], "google_spend": [150]})

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[JoinSource(node_id=2, key="date", join_type=JoinType.LEFT)],
        )
        transformer = JoinTransformer(config)
        result = transformer.transform({1: fb, 2: google})

        assert len(result) == 2  # All FB rows preserved
        assert pd.isna(result[result["date"] == "2024-01-01"]["google_spend"].iloc[0])

    def test_right_join(self) -> None:
        """RIGHT join keeps all right source rows"""
        fb = pd.DataFrame({"date": ["2024-01-01"], "fb_spend": [100]})
        google = pd.DataFrame(
            {"date": ["2024-01-01", "2024-01-02"], "google_spend": [150, 250]}
        )

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[JoinSource(node_id=2, key="date", join_type=JoinType.RIGHT)],
        )
        transformer = JoinTransformer(config)
        result = transformer.transform({1: fb, 2: google})

        assert len(result) == 2  # All Google rows preserved
        assert pd.isna(result[result["date"] == "2024-01-02"]["fb_spend"].iloc[0])

    def test_outer_join_all_rows(self) -> None:
        """OUTER join includes all rows from both"""
        fb = pd.DataFrame({"date": ["2024-01-01"], "fb_spend": [100]})
        google = pd.DataFrame({"date": ["2024-01-02"], "google_spend": [150]})

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[JoinSource(node_id=2, key="date", join_type=JoinType.OUTER)],
        )
        transformer = JoinTransformer(config)
        result = transformer.transform({1: fb, 2: google})

        assert len(result) == 2  # Both dates included

    def test_missing_base_node_raises_error(self) -> None:
        """Error when base node not in inputs"""
        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[JoinSource(node_id=2, key="date")],
        )
        transformer = JoinTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            transformer.transform({2: pd.DataFrame()})

        assert "Missing input DataFrames" in str(exc_info.value)

    def test_missing_source_node_raises_error(self) -> None:
        """Error when source node not in inputs"""
        fb = pd.DataFrame({"date": ["2024-01-01"], "fb_spend": [100]})

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[JoinSource(node_id=2, key="date")],
        )
        transformer = JoinTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            transformer.transform({1: fb})  # Missing node 2

        assert "Missing input DataFrames" in str(exc_info.value)

    def test_invalid_base_key_raises_error(self) -> None:
        """Error when base key column doesn't exist"""
        fb = pd.DataFrame({"wrong_col": ["2024-01-01"]})
        google = pd.DataFrame({"date": ["2024-01-01"]})

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",  # Not in FB DataFrame
            sources=[JoinSource(node_id=2, key="date")],
        )
        transformer = JoinTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            transformer.transform({1: fb, 2: google})

        assert "Base key 'date' not found" in str(exc_info.value)

    def test_invalid_source_key_raises_error(self) -> None:
        """Error when source key column doesn't exist"""
        fb = pd.DataFrame({"date": ["2024-01-01"]})
        google = pd.DataFrame({"wrong_col": ["2024-01-01"]})

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[JoinSource(node_id=2, key="date")],  # Not in Google
        )
        transformer = JoinTransformer(config)

        with pytest.raises(TransformerException) as exc_info:
            transformer.transform({1: fb, 2: google})

        assert "Key 'date' not found in source node 2" in str(exc_info.value)

    def test_different_key_names(self) -> None:
        """Join on different column names"""
        fb = pd.DataFrame({"report_date": ["2024-01-01"], "fb_spend": [100]})
        google = pd.DataFrame({"date": ["2024-01-01"], "google_spend": [150]})

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="report_date",
            sources=[JoinSource(node_id=2, key="date", join_type=JoinType.INNER)],
        )
        transformer = JoinTransformer(config)
        result = transformer.transform({1: fb, 2: google})

        assert len(result) == 1
        assert "report_date" in result.columns
        assert "date" in result.columns

    def test_duplicate_columns_get_suffix(self) -> None:
        """Duplicate column names get suffixes"""
        fb = pd.DataFrame({"date": ["2024-01-01"], "spend": [100]})
        google = pd.DataFrame({"date": ["2024-01-01"], "spend": [150]})

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[JoinSource(node_id=2, key="date")],
            suffixes=("_fb", "_google"),
        )
        transformer = JoinTransformer(config)
        result = transformer.transform({1: fb, 2: google})

        assert "spend_fb" in result.columns
        assert "spend_google" in result.columns

    def test_four_source_join(self) -> None:
        """4 sources join sequentially"""
        df1 = pd.DataFrame({"id": [1, 2], "val1": ["a", "b"]})
        df2 = pd.DataFrame({"id": [1, 2], "val2": ["c", "d"]})
        df3 = pd.DataFrame({"id": [1, 2], "val3": ["e", "f"]})
        df4 = pd.DataFrame({"id": [1, 2], "val4": ["g", "h"]})

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="id",
            sources=[
                JoinSource(node_id=2, key="id", join_type=JoinType.INNER),
                JoinSource(node_id=3, key="id", join_type=JoinType.INNER),
                JoinSource(node_id=4, key="id", join_type=JoinType.INNER),
            ],
        )
        transformer = JoinTransformer(config)
        result = transformer.transform({1: df1, 2: df2, 3: df3, 4: df4})

        assert len(result) == 2
        assert "val1" in result.columns
        assert "val2" in result.columns
        assert "val3" in result.columns
        assert "val4" in result.columns

    def test_empty_sources_list(self) -> None:
        """Empty sources list returns base DataFrame unchanged"""
        fb = pd.DataFrame({"date": ["2024-01-01"], "fb_spend": [100]})

        config = JoinTransformConfig(
            base_node_id=1,
            base_key="date",
            sources=[],
        )
        transformer = JoinTransformer(config)
        result = transformer.transform({1: fb})

        assert len(result) == 1
        assert result.equals(fb)
