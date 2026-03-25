"""Tests for GA4Extractor — metric casting, date parsing, pagination, field schemas."""

from unittest.mock import MagicMock, patch

import pytest

from common.model.common import DateTimeConfig
from common.model.google.ga4 import GA4Config
from engine.node.extractors.ga4.extractor import GA4Extractor


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


_SENTINEL = object()


def make_config(
    dimensions: list[str] | None = None,
    metrics: list[str] | None = None,
    property_id: str = "123456789",
) -> GA4Config:
    """Build a test GA4Config.

    Pass an explicit list (including empty []) to override the defaults.
    """
    resolved_dims = ["date", "sessionCampaignName"] if dimensions is None else dimensions
    resolved_metrics = ["sessions", "purchaseRevenue"] if metrics is None else metrics
    return GA4Config(
        connection_id="conn-ga4-test",
        property_id=property_id,
        dimensions=resolved_dims,
        metrics=resolved_metrics,
        time_config=DateTimeConfig(time_preset="last_7_days"),
    )


def make_extractor(config: GA4Config | None = None) -> GA4Extractor:
    return GA4Extractor(config or make_config())


# ---------------------------------------------------------------------------
# _normalize_property_id
# ---------------------------------------------------------------------------


class TestNormalizePropertyId:
    def test_bare_numeric_id_gets_prefix(self):
        """'123456789' must become 'properties/123456789'."""
        extractor = make_extractor()
        assert extractor.normalize_property_id("123456789") == "properties/123456789"

    def test_id_with_prefix_is_unchanged(self):
        """'properties/123456789' must not get a second prefix."""
        extractor = make_extractor()
        assert extractor.normalize_property_id("properties/123456789") == "properties/123456789"

    def test_empty_string_gets_prefix(self):
        """Edge case: empty string gets the prefix (downstream GA4 API will reject it)."""
        extractor = make_extractor()
        assert extractor.normalize_property_id("").startswith("properties/")


# ---------------------------------------------------------------------------
# _cast_metric_value
# ---------------------------------------------------------------------------


class TestCastMetricValue:
    def test_integer_type_returns_int(self):
        extractor = make_extractor()
        result = extractor.cast_metric_value("1234", "TYPE_INTEGER")
        assert result == 1234
        assert isinstance(result, int)

    def test_float_type_returns_float(self):
        extractor = make_extractor()
        result = extractor.cast_metric_value("98765.43", "TYPE_FLOAT")
        assert isinstance(result, float)
        assert abs(result - 98765.43) < 0.001

    def test_currency_type_returns_float(self):
        extractor = make_extractor()
        result = extractor.cast_metric_value("15990.00", "TYPE_CURRENCY")
        assert isinstance(result, float)
        assert abs(result - 15990.0) < 0.001

    def test_seconds_type_returns_float(self):
        extractor = make_extractor()
        result = extractor.cast_metric_value("123.456", "TYPE_SECONDS")
        assert isinstance(result, float)

    def test_milliseconds_type_returns_float(self):
        extractor = make_extractor()
        result = extractor.cast_metric_value("45678", "TYPE_MILLISECONDS")
        assert isinstance(result, float)

    def test_unknown_type_returns_raw_string(self):
        """Unknown metric types must return the raw string — never crash."""
        extractor = make_extractor()
        result = extractor.cast_metric_value("some_string", "TYPE_UNKNOWN_CUSTOM")
        assert result == "some_string"
        assert isinstance(result, str)

    def test_integer_zero(self):
        extractor = make_extractor()
        result = extractor.cast_metric_value("0", "TYPE_INTEGER")
        assert result == 0
        assert isinstance(result, int)

    def test_float_zero(self):
        extractor = make_extractor()
        result = extractor.cast_metric_value("0.0", "TYPE_FLOAT")
        assert result == 0.0
        assert isinstance(result, float)

    def test_large_session_count(self):
        """GA4 can return millions of sessions — must cast without overflow."""
        extractor = make_extractor()
        result = extractor.cast_metric_value("5000000", "TYPE_INTEGER")
        assert result == 5_000_000

    def test_purchase_revenue_thai_baht(self):
        """Realistic Thai market revenue in baht — float precision must hold."""
        extractor = make_extractor()
        result = extractor.cast_metric_value("1590000.00", "TYPE_CURRENCY")
        assert isinstance(result, float)
        assert abs(result - 1_590_000.0) < 0.01


# ---------------------------------------------------------------------------
# _parse_date_value
# ---------------------------------------------------------------------------


class TestParseDateValue:
    def test_yyyymmdd_parses_to_iso_format(self):
        """Standard GA4 date format YYYYMMDD must become YYYY-MM-DD."""
        extractor = make_extractor()
        assert extractor.parse_date_value("20240115") == "2024-01-15"

    def test_already_formatted_date_passes_through(self):
        """If the value is not 8 digits, return it unchanged."""
        extractor = make_extractor()
        assert extractor.parse_date_value("2024-01-15") == "2024-01-15"

    def test_non_date_string_passes_through(self):
        """Non-date dimension values (e.g. a channel name) must pass through unchanged."""
        extractor = make_extractor()
        assert extractor.parse_date_value("Organic Search") == "Organic Search"

    def test_end_of_year_date(self):
        extractor = make_extractor()
        assert extractor.parse_date_value("20241231") == "2024-12-31"

    def test_leap_year_date(self):
        extractor = make_extractor()
        assert extractor.parse_date_value("20240229") == "2024-02-29"

    def test_7_digit_string_passes_through(self):
        """A 7-digit string must not be treated as a date."""
        extractor = make_extractor()
        result = extractor.parse_date_value("2024012")
        assert result == "2024012"

    def test_8_non_digit_string_passes_through(self):
        """An 8-char string with non-digit chars must not be treated as a date."""
        extractor = make_extractor()
        result = extractor.parse_date_value("abcd1234")
        assert result == "abcd1234"


# ---------------------------------------------------------------------------
# _build_field_schemas
# ---------------------------------------------------------------------------


class TestBuildFieldSchemas:
    def test_dimensions_are_type_string(self):
        """All configured dimensions must produce string-typed field schemas."""
        config = make_config(
            dimensions=["date", "sessionSource", "country"],
            metrics=[],
        )
        extractor = make_extractor(config)
        schemas = extractor.build_field_schemas()
        dim_schemas = [s for s in schemas if s.field in config.dimensions]
        assert all(s.data_type == "string" for s in dim_schemas)

    def test_sessions_schema_is_integer(self):
        config = make_config(dimensions=["date"], metrics=["sessions"])
        extractor = make_extractor(config)
        schemas = extractor.build_field_schemas()
        sessions_schema = next(s for s in schemas if s.field == "sessions")
        assert sessions_schema.data_type == "integer"

    def test_purchase_revenue_schema_is_float(self):
        config = make_config(dimensions=[], metrics=["purchaseRevenue"])
        extractor = make_extractor(config)
        schemas = extractor.build_field_schemas()
        revenue_schema = next(s for s in schemas if s.field == "purchaseRevenue")
        assert revenue_schema.data_type == "float"

    def test_unknown_metric_defaults_to_float(self):
        """A custom or future GA4 metric not in type_hints must default to float."""
        config = make_config(dimensions=[], metrics=["customMetric123"])
        extractor = make_extractor(config)
        schemas = extractor.build_field_schemas()
        custom_schema = next(s for s in schemas if s.field == "customMetric123")
        assert custom_schema.data_type == "float"

    def test_schema_count_matches_dimensions_plus_metrics(self):
        """Total schema count must equal len(dimensions) + len(metrics)."""
        dims = ["date", "sessionSource", "country"]
        metrics = ["sessions", "activeUsers", "purchaseRevenue", "transactions"]
        config = make_config(dimensions=dims, metrics=metrics)
        extractor = make_extractor(config)
        schemas = extractor.build_field_schemas()
        assert len(schemas) == len(dims) + len(metrics)

    def test_empty_config_produces_empty_schemas(self):
        """Empty dimensions and metrics must produce an empty schema list."""
        config = make_config(dimensions=[], metrics=[])
        extractor = make_extractor(config)
        schemas = extractor.build_field_schemas()
        assert schemas == []

    def test_all_known_integer_metrics_are_integer_type(self):
        """Verify all documented integer metrics resolve to integer type."""
        integer_metrics = [
            "sessions",
            "activeUsers",
            "newUsers",
            "totalUsers",
            "screenPageViews",
            "transactions",
            "conversions",
            "eventCount",
            "ecommercePurchases",
        ]
        config = make_config(dimensions=[], metrics=integer_metrics)
        extractor = make_extractor(config)
        schemas = extractor.build_field_schemas()
        for schema in schemas:
            assert schema.data_type == "integer", (
                f"Expected integer for {schema.field}, got {schema.data_type}"
            )


# ---------------------------------------------------------------------------
# _parse_response
# ---------------------------------------------------------------------------


class TestParseResponse:
    def _make_mock_response(
        self,
        dimension_names: list[str],
        metric_names: list[str],
        metric_types: list[str],
        rows: list[tuple],
    ) -> MagicMock:
        """Build a minimal mock that looks like a RunReportResponse.

        NOTE: MagicMock treats 'name' as a special constructor argument.
        We must set .name as a plain attribute AFTER construction.
        """
        response = MagicMock()

        dim_headers = []
        for n in dimension_names:
            h = MagicMock()
            h.name = n
            dim_headers.append(h)
        response.dimension_headers = dim_headers

        metric_headers = []
        for n, t in zip(metric_names, metric_types):
            type_mock = MagicMock()
            type_mock.name = t
            h = MagicMock()
            h.name = n
            h.type_ = type_mock
            metric_headers.append(h)
        response.metric_headers = metric_headers

        mock_rows = []
        for row_data in rows:
            dim_count = len(dimension_names)
            dim_values = [
                MagicMock(**{"value": str(v)}) for v in row_data[:dim_count]
            ]
            metric_values = [
                MagicMock(**{"value": str(v)}) for v in row_data[dim_count:]
            ]
            mock_rows.append(
                MagicMock(dimension_values=dim_values, metric_values=metric_values)
            )

        response.rows = mock_rows
        return response

    def test_parse_response_returns_correct_record_count(self):
        extractor = make_extractor()
        response = self._make_mock_response(
            dimension_names=["date"],
            metric_names=["sessions"],
            metric_types=["TYPE_INTEGER"],
            rows=[("20240101", "500"), ("20240102", "700")],
        )
        records = extractor.parse_response(response)
        assert len(records) == 2

    def test_parse_response_converts_date_dimension(self):
        extractor = make_extractor()
        response = self._make_mock_response(
            dimension_names=["date"],
            metric_names=["sessions"],
            metric_types=["TYPE_INTEGER"],
            rows=[("20240315", "1200")],
        )
        records = extractor.parse_response(response)
        assert records[0]["date"] == "2024-03-15"

    def test_parse_response_casts_integer_metric(self):
        extractor = make_extractor()
        response = self._make_mock_response(
            dimension_names=["date"],
            metric_names=["sessions"],
            metric_types=["TYPE_INTEGER"],
            rows=[("20240101", "9876")],
        )
        records = extractor.parse_response(response)
        assert records[0]["sessions"] == 9876
        assert isinstance(records[0]["sessions"], int)

    def test_parse_response_casts_float_metric(self):
        extractor = make_extractor()
        response = self._make_mock_response(
            dimension_names=["sessionSource"],
            metric_names=["purchaseRevenue"],
            metric_types=["TYPE_CURRENCY"],
            rows=[("google", "45678.90")],
        )
        records = extractor.parse_response(response)
        assert isinstance(records[0]["purchaseRevenue"], float)
        assert abs(records[0]["purchaseRevenue"] - 45678.90) < 0.01

    def test_parse_response_non_date_dimension_not_transformed(self):
        """sessionSource dimension values must NOT be treated as dates."""
        extractor = make_extractor()
        response = self._make_mock_response(
            dimension_names=["sessionSource"],
            metric_names=["sessions"],
            metric_types=["TYPE_INTEGER"],
            rows=[("google", "100"), ("(direct)", "50"), ("facebook.com", "75")],
        )
        records = extractor.parse_response(response)
        assert records[0]["sessionSource"] == "google"
        assert records[1]["sessionSource"] == "(direct)"
        assert records[2]["sessionSource"] == "facebook.com"

    def test_parse_empty_response_returns_empty_list(self):
        extractor = make_extractor()
        response = self._make_mock_response(
            dimension_names=["date"],
            metric_names=["sessions"],
            metric_types=["TYPE_INTEGER"],
            rows=[],
        )
        records = extractor.parse_response(response)
        assert records == []


# ---------------------------------------------------------------------------
# _fetch_all_pages pagination
# ---------------------------------------------------------------------------


def _make_dim_header(field_name: str) -> MagicMock:
    """Build a dimension header mock with .name set correctly."""
    h = MagicMock()
    h.name = field_name
    return h


def _make_metric_header(field_name: str, type_name: str) -> MagicMock:
    """Build a metric header mock with .name and .type_.name set correctly."""
    type_mock = MagicMock()
    type_mock.name = type_name
    h = MagicMock()
    h.name = field_name
    h.type_ = type_mock
    return h


class TestPagination:
    def test_single_page_no_further_requests(self):
        """When all rows fit in one page, only one API call must be made."""
        extractor = make_extractor()

        first_response = MagicMock()
        first_response.row_count = 2
        first_response.dimension_headers = [_make_dim_header("date")]
        first_response.metric_headers = [_make_metric_header("sessions", "TYPE_INTEGER")]
        row1 = MagicMock(
            dimension_values=[MagicMock(value="20240101")],
            metric_values=[MagicMock(value="100")],
        )
        row2 = MagicMock(
            dimension_values=[MagicMock(value="20240102")],
            metric_values=[MagicMock(value="200")],
        )
        first_response.rows = [row1, row2]

        mock_client = MagicMock()
        mock_client.run_report.return_value = first_response

        from datetime import date

        records = extractor.fetch_all_pages(
            mock_client, "properties/123", date(2024, 1, 1), date(2024, 1, 7)
        )

        assert mock_client.run_report.call_count == 1
        assert len(records) == 2

    def test_multi_page_fetches_all_rows(self):
        """When total_rows > page_size, the loop must continue until all rows are fetched."""
        extractor = make_extractor()

        def make_row(date_val: str, session_val: str) -> MagicMock:
            return MagicMock(
                dimension_values=[MagicMock(value=date_val)],
                metric_values=[MagicMock(value=session_val)],
            )

        def make_response(rows: list, row_count: int) -> MagicMock:
            resp = MagicMock()
            resp.row_count = row_count
            resp.dimension_headers = [_make_dim_header("date")]
            resp.metric_headers = [_make_metric_header("sessions", "TYPE_INTEGER")]
            resp.rows = rows
            return resp

        page1_rows = [make_row(f"202401{i:02d}", str(i * 10)) for i in range(1, 4)]
        page2_rows = [make_row(f"202401{i:02d}", str(i * 10)) for i in range(4, 6)]

        mock_client = MagicMock()
        mock_client.run_report.side_effect = [
            make_response(page1_rows, row_count=5),
            make_response(page2_rows, row_count=5),
        ]

        from datetime import date

        records = extractor.fetch_all_pages(
            mock_client, "properties/123", date(2024, 1, 1), date(2024, 1, 31)
        )

        assert mock_client.run_report.call_count == 2
        assert len(records) == 5

    def test_empty_result_does_not_loop_forever(self):
        """If the first page returns 0 rows, the loop must exit immediately."""
        extractor = make_extractor()

        empty_response = MagicMock()
        empty_response.row_count = 0
        empty_response.dimension_headers = [_make_dim_header("date")]
        empty_response.metric_headers = [_make_metric_header("sessions", "TYPE_INTEGER")]
        empty_response.rows = []

        mock_client = MagicMock()
        mock_client.run_report.return_value = empty_response

        from datetime import date

        records = extractor.fetch_all_pages(
            mock_client, "properties/123", date(2024, 1, 1), date(2024, 1, 7)
        )

        assert records == []
        assert mock_client.run_report.call_count == 1
