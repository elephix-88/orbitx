"""Import verification — all new delivery modules must import without errors."""


class TestDeliveryModuleImports:
    """Verify every new module introduced in Sprint 1 imports cleanly."""

    def test_import_delivery_model(self):
        """common.model.delivery must import without errors."""
        from common.model.delivery import (  # noqa: F401
            DeliveryChannel,
            DeliveryConfig,
            LineChannelConfig,
            SlackChannelConfig,
        )

    def test_import_deliverer_base(self):
        """engine.node.deliverers.base Deliverer protocol must import."""
        from engine.node.deliverers.base import Deliverer  # noqa: F401

    def test_import_slack_deliverer(self):
        """engine.node.deliverers.slack_deliverer must import."""
        from engine.node.deliverers.slack_deliverer import SlackDeliverer  # noqa: F401

    def test_import_line_deliverer(self):
        """engine.node.deliverers.line_deliverer must import."""
        from engine.node.deliverers.line_deliverer import LineDeliverer  # noqa: F401

    def test_import_deliverer_factory(self):
        """engine.node.deliverers.factory must import."""
        from engine.node.deliverers.factory import create_deliverer  # noqa: F401

    def test_import_schedule_config_from_workflow(self):
        """common.model.workflow ScheduleConfig must import."""
        from common.model.workflow import ScheduleConfig  # noqa: F401

    def test_import_deliverer_exception(self):
        """engine.exceptions.DelivererException must import."""
        from engine.exceptions import DelivererException  # noqa: F401

    def test_slack_deliverer_exposes_max_table_rows_constant(self):
        """MAX_TABLE_ROWS constant must be importable and equal 20."""
        from engine.node.deliverers.slack_deliverer import MAX_TABLE_ROWS

        assert MAX_TABLE_ROWS == 20

    def test_line_deliverer_exposes_max_top_campaigns_constant(self):
        """MAX_TOP_CAMPAIGNS constant must be importable and equal 5."""
        from engine.node.deliverers.line_deliverer import MAX_TOP_CAMPAIGNS

        assert MAX_TOP_CAMPAIGNS == 5
