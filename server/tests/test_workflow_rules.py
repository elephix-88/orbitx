"""Tests for validate_workflow_structure — checks 1-8 including branching rules."""
from common.model.conditional import (
    Condition,
    ConditionOperator,
    IfNodeConfig,
    SwitchCase,
    SwitchNodeConfig,
)
from common.model.workflow import (
    Connection,
    IfNode,
    SwitchNode,
)
from common.model.workflow_rules import (
    WorkflowValidationWarning,
    validate_workflow_structure,
)

# ---------------------------------------------------------------------------
# Node fixtures — built once, reused across test classes
#
# We use GenericNode for source/destination fixtures so the tests remain
# independent of platform-specific config field changes.
# ---------------------------------------------------------------------------


def make_source_node(node_instance_id: int = 1):
    """A minimal source node using GenericNode."""
    from common.model.workflow import GenericNode

    return GenericNode(
        node_instance_id=node_instance_id,
        node_type="source",
        node_id="facebook_ads",
        parameters={},
    )


def make_destination_node(node_instance_id: int = 2):
    """A minimal destination node using GenericNode."""
    from common.model.workflow import GenericNode

    return GenericNode(
        node_instance_id=node_instance_id,
        node_type="destinations",
        node_id="bigquery",
        parameters={},
    )


# Keep alias names for readability in test bodies
make_facebook_node = make_source_node
make_bigquery_node = make_destination_node


def make_if_node(node_instance_id: int = 3) -> IfNode:
    return IfNode(
        node_instance_id=node_instance_id,
        node_type="transform",
        node_id="if",
        parameters=IfNodeConfig(
            conditions=[
                Condition(
                    field="clicks",
                    operator=ConditionOperator.greater_than,
                    value="100",
                )
            ],
            logic="AND",
        ),
    )


def make_switch_node(
    node_instance_id: int = 4,
    cases: list[SwitchCase] | None = None,
) -> SwitchNode:
    return SwitchNode(
        node_instance_id=node_instance_id,
        node_type="transform",
        node_id="switch",
        parameters=SwitchNodeConfig(
            field="platform",
            cases=cases
            or [
                SwitchCase(case_id="case_0", value="facebook"),
                SwitchCase(case_id="case_1", value="google"),
            ],
            default_case_id="default",
        ),
    )


# ---------------------------------------------------------------------------
# Helper to build a minimal valid workflow
# ---------------------------------------------------------------------------


def valid_linear_workflow():
    """source → destination — the simplest passing workflow."""
    source = make_facebook_node(1)
    destination = make_bigquery_node(2)
    connection = Connection(from_node=1, to_node=2)
    return [source, destination], [connection]


# ---------------------------------------------------------------------------
# Check 1: Dangling references
# ---------------------------------------------------------------------------


class TestDanglingReferences:
    def test_valid_connection_passes(self):
        nodes, connections = valid_linear_workflow()
        result = validate_workflow_structure(nodes, connections)
        assert result.is_valid is True

    def test_connection_from_unknown_node_fails(self):
        nodes, _ = valid_linear_workflow()
        bad_connection = Connection(from_node=99, to_node=2)
        result = validate_workflow_structure(nodes, [bad_connection])
        assert result.is_valid is False
        assert any(e.error_type == "dangling_reference" for e in result.errors)

    def test_connection_to_unknown_node_fails(self):
        nodes, _ = valid_linear_workflow()
        bad_connection = Connection(from_node=1, to_node=99)
        result = validate_workflow_structure(nodes, [bad_connection])
        assert result.is_valid is False
        assert any(e.error_type == "dangling_reference" for e in result.errors)


# ---------------------------------------------------------------------------
# Check 2: Self-connections
# ---------------------------------------------------------------------------


class TestSelfConnections:
    def test_self_connection_fails(self):
        nodes, _ = valid_linear_workflow()
        self_loop = Connection(from_node=1, to_node=1)
        result = validate_workflow_structure(nodes, [self_loop])
        assert result.is_valid is False
        assert any(e.error_type == "self_connection" for e in result.errors)


# ---------------------------------------------------------------------------
# Check 3: Duplicate edges (updated to include from_port)
# ---------------------------------------------------------------------------


class TestDuplicateEdges:
    def test_duplicate_connection_without_port_fails(self):
        nodes, _ = valid_linear_workflow()
        connections = [
            Connection(from_node=1, to_node=2),
            Connection(from_node=1, to_node=2),
        ]
        result = validate_workflow_structure(nodes, connections)
        assert result.is_valid is False
        assert any(e.error_type == "duplicate_edge" for e in result.errors)

    def test_same_nodes_different_ports_are_not_duplicates(self):
        """IF node sending 'true' and 'false' to same destination is valid."""
        source = make_facebook_node(1)
        if_node = make_if_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="true"),
            Connection(from_node=3, to_node=2, from_port="false"),
        ]
        result = validate_workflow_structure([source, if_node, dest], connections)
        # Should not fail on duplicate_edge; may fail on port validation, but
        # the duplicate-edge check itself must pass.
        error_types = [e.error_type for e in result.errors]
        assert "duplicate_edge" not in error_types

    def test_same_port_same_target_is_duplicate(self):
        """Two connections from IF node to same target on same port is a duplicate."""
        source = make_facebook_node(1)
        if_node = make_if_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="true"),
            Connection(from_node=3, to_node=2, from_port="true"),
        ]
        result = validate_workflow_structure([source, if_node, dest], connections)
        assert any(e.error_type == "duplicate_edge" for e in result.errors)


# ---------------------------------------------------------------------------
# Check 4: Category compatibility
# ---------------------------------------------------------------------------


class TestCategoryCompatibility:
    def test_destination_without_conditional_outputs_cannot_have_outgoing(self):
        from common.model.google.sheets import GoogleSheetsDestinationConfig
        from common.model.workflow import GoogleSheetsDestinationNode

        sheets_node = GoogleSheetsDestinationNode(
            node_instance_id=2,
            node_type="destinations",
            node_id="google_sheet",
            parameters=GoogleSheetsDestinationConfig(
                connection_id="conn_s",
                spreadsheet_id="abc",
                worksheet_name="Sheet1",
                range="A1:Z1000",
            ),
        )
        dest2 = make_destination_node(3)
        connections = [
            Connection(from_node=1, to_node=2),
            Connection(from_node=2, to_node=3),
        ]
        result = validate_workflow_structure(
            [make_source_node(1), sheets_node, dest2], connections
        )
        assert result.is_valid is False
        assert any(e.error_type == "category_incompatible" for e in result.errors)


# ---------------------------------------------------------------------------
# Check 5: Max input constraints
# ---------------------------------------------------------------------------


class TestMaxInputConstraints:
    def test_too_many_inputs_fails(self):
        """SQL node accepts exactly 1 input; feeding it 2 should fail."""
        from common.model.transform import SQLTransformConfig
        from common.model.workflow import SQLTransformNode

        source1 = make_source_node(1)
        source2 = make_source_node(5)
        sql_node = SQLTransformNode(
            node_instance_id=3,
            node_type="transform",
            node_id="sql",
            parameters=SQLTransformConfig(
                table_name="t",
                sql_query="SELECT * FROM t",
            ),
        )
        dest = make_destination_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=5, to_node=3),
            Connection(from_node=3, to_node=2),
        ]
        result = validate_workflow_structure(
            [source1, source2, sql_node, dest], connections
        )
        assert result.is_valid is False
        assert any(e.error_type == "too_many_inputs" for e in result.errors)


# ---------------------------------------------------------------------------
# Check 6: Graph completeness — missing_destination is now a WARNING
# ---------------------------------------------------------------------------


class TestGraphCompleteness:
    def test_no_source_is_an_error(self):
        dest = make_bigquery_node(2)
        result = validate_workflow_structure([dest], [])
        assert result.is_valid is False
        assert any(e.error_type == "missing_source" for e in result.errors)

    def test_no_destination_is_a_warning_not_an_error(self):
        """A source-only workflow (e.g., alert-only) should pass with a warning."""
        source = make_facebook_node(1)
        result = validate_workflow_structure([source], [])
        assert result.is_valid is True
        warning_types = [w.warning_type for w in result.warnings]
        assert "missing_destination" in warning_types

    def test_warning_type_is_correct_model(self):
        source = make_facebook_node(1)
        result = validate_workflow_structure([source], [])
        missing_dest_warnings = [
            w for w in result.warnings if w.warning_type == "missing_destination"
        ]
        assert len(missing_dest_warnings) == 1
        assert isinstance(missing_dest_warnings[0], WorkflowValidationWarning)

    def test_valid_workflow_has_empty_warnings_list(self):
        nodes, connections = valid_linear_workflow()
        result = validate_workflow_structure(nodes, connections)
        assert result.is_valid is True
        assert result.warnings == []

    def test_branching_workflow_with_one_branch_no_destination_passes(self):
        """IF node with only one branch wired to a destination is still valid
        because the workflow has at least one destination overall."""
        source = make_facebook_node(1)
        if_node = make_if_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="true"),
            # "false" branch is not connected — no error, no warning needed
        ]
        result = validate_workflow_structure([source, if_node, dest], connections)
        assert result.is_valid is True
        assert result.warnings == []


# ---------------------------------------------------------------------------
# Check 7: Cycle detection
# ---------------------------------------------------------------------------


class TestCycleDetection:
    def test_cycle_fails(self):
        # Build a cycle using GenericNode transforms — they have maximum_inputs=None
        # (unlimited) and allowed_target_categories={"transform","destinations"},
        # so checks 4 and 5 both pass and the cycle is caught at Check 7.
        from common.model.workflow import GenericNode

        source = make_source_node(1)
        transform_a = GenericNode(
            node_instance_id=3, node_type="transform", node_id="sql", parameters={}
        )
        transform_b = GenericNode(
            node_instance_id=4, node_type="transform", node_id="sql", parameters={}
        )
        dest = make_destination_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=4),
            Connection(from_node=4, to_node=3),  # cycle
            Connection(from_node=3, to_node=2),
        ]
        result = validate_workflow_structure(
            [source, transform_a, transform_b, dest], connections
        )
        assert result.is_valid is False
        assert any(e.error_type == "cycle" for e in result.errors)

    def test_branching_dag_does_not_trigger_cycle(self):
        """IF node splitting into two destinations is acyclic."""
        source = make_facebook_node(1)
        if_node = make_if_node(3)
        dest_true = make_bigquery_node(2)
        dest_false = make_bigquery_node(4)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="true"),
            Connection(from_node=3, to_node=4, from_port="false"),
        ]
        result = validate_workflow_structure(
            [source, if_node, dest_true, dest_false], connections
        )
        assert result.is_valid is True


# ---------------------------------------------------------------------------
# Check 8: Port validation — IF nodes
# ---------------------------------------------------------------------------


class TestIfNodePortValidation:
    def test_valid_if_workflow_passes(self):
        """source → IF → two destinations via 'true' and 'false'."""
        source = make_facebook_node(1)
        if_node = make_if_node(3)
        dest_true = make_bigquery_node(2)
        dest_false = make_bigquery_node(4)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="true"),
            Connection(from_node=3, to_node=4, from_port="false"),
        ]
        result = validate_workflow_structure(
            [source, if_node, dest_true, dest_false], connections
        )
        assert result.is_valid is True
        assert result.errors == []

    def test_if_node_connection_without_from_port_fails(self):
        source = make_facebook_node(1)
        if_node = make_if_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2),  # missing from_port
        ]
        result = validate_workflow_structure([source, if_node, dest], connections)
        assert result.is_valid is False
        assert any(e.error_type == "missing_port" for e in result.errors)

    def test_if_node_connection_with_invalid_port_fails(self):
        source = make_facebook_node(1)
        if_node = make_if_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="maybe"),
        ]
        result = validate_workflow_structure([source, if_node, dest], connections)
        assert result.is_valid is False
        error = next(e for e in result.errors if e.error_type == "invalid_port")
        assert "maybe" in error.message
        assert "true" in error.message
        assert "false" in error.message

    def test_if_node_error_references_correct_node_ids(self):
        source = make_facebook_node(1)
        if_node = make_if_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="wrong"),
        ]
        result = validate_workflow_structure([source, if_node, dest], connections)
        port_errors = [e for e in result.errors if e.error_type == "invalid_port"]
        assert len(port_errors) == 1
        assert 3 in port_errors[0].node_instance_ids
        assert 2 in port_errors[0].node_instance_ids

    def test_if_node_only_true_branch_passes_validation(self):
        """Wiring only the 'true' branch is valid — false branch is optional."""
        source = make_facebook_node(1)
        if_node = make_if_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="true"),
        ]
        result = validate_workflow_structure([source, if_node, dest], connections)
        assert result.is_valid is True


# ---------------------------------------------------------------------------
# Check 8: Port validation — Switch nodes
# ---------------------------------------------------------------------------


class TestSwitchNodePortValidation:
    def _make_three_dests(self):
        return (
            make_bigquery_node(10),
            make_bigquery_node(11),
            make_bigquery_node(12),
        )

    def test_valid_switch_workflow_passes(self):
        """source → Switch(case_0, case_1) → two destinations + default."""
        source = make_facebook_node(1)
        switch_node = make_switch_node(3)
        dest_0, dest_1, dest_default = self._make_three_dests()
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=10, from_port="case_0"),
            Connection(from_node=3, to_node=11, from_port="case_1"),
            Connection(from_node=3, to_node=12, from_port="default"),
        ]
        result = validate_workflow_structure(
            [source, switch_node, dest_0, dest_1, dest_default], connections
        )
        assert result.is_valid is True
        assert result.errors == []

    def test_switch_node_connection_without_from_port_fails(self):
        source = make_facebook_node(1)
        switch_node = make_switch_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2),  # missing from_port
        ]
        result = validate_workflow_structure([source, switch_node, dest], connections)
        assert result.is_valid is False
        assert any(e.error_type == "missing_port" for e in result.errors)

    def test_switch_node_connection_with_invalid_port_fails(self):
        source = make_facebook_node(1)
        switch_node = make_switch_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="case_99"),
        ]
        result = validate_workflow_structure([source, switch_node, dest], connections)
        assert result.is_valid is False
        error = next(e for e in result.errors if e.error_type == "invalid_port")
        assert "case_99" in error.message

    def test_switch_node_default_port_is_valid(self):
        source = make_facebook_node(1)
        switch_node = make_switch_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="default"),
        ]
        result = validate_workflow_structure([source, switch_node, dest], connections)
        assert result.is_valid is True

    def test_switch_node_valid_case_ids_listed_in_error_message(self):
        source = make_facebook_node(1)
        switch_node = make_switch_node(
            3,
            cases=[
                SwitchCase(case_id="case_0", value="facebook"),
                SwitchCase(case_id="case_1", value="google"),
            ],
        )
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="bad_port"),
        ]
        result = validate_workflow_structure([source, switch_node, dest], connections)
        assert result.is_valid is False
        error = next(e for e in result.errors if e.error_type == "invalid_port")
        # Error message must list the valid case_ids to help the developer
        assert "case_0" in error.message
        assert "case_1" in error.message
        assert "default" in error.message

    def test_switch_node_partial_cases_wired_passes(self):
        """Only connecting a subset of cases is valid."""
        source = make_facebook_node(1)
        switch_node = make_switch_node(3)
        dest = make_bigquery_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2, from_port="case_0"),
        ]
        result = validate_workflow_structure([source, switch_node, dest], connections)
        assert result.is_valid is True


# ---------------------------------------------------------------------------
# Port validation: non-router nodes must NOT require ports
# ---------------------------------------------------------------------------


class TestNonRouterNodesIgnorePorts:
    def test_standard_connection_with_no_port_on_transform_node_passes(self):
        """Standard transform nodes use port-free connections."""
        from common.model.transform import SQLTransformConfig
        from common.model.workflow import SQLTransformNode

        source = make_source_node(1)
        sql = SQLTransformNode(
            node_instance_id=3,
            node_type="transform",
            node_id="sql",
            parameters=SQLTransformConfig(
                table_name="t",
                sql_query="SELECT * FROM t",
            ),
        )
        dest = make_destination_node(2)
        connections = [
            Connection(from_node=1, to_node=3),
            Connection(from_node=3, to_node=2),
        ]
        result = validate_workflow_structure([source, sql, dest], connections)
        assert result.is_valid is True

    def test_existing_workflow_without_port_fields_deserializes_correctly(self):
        """Verify backward compatibility: Connection without from_port/to_port
        deserializes with None values and validates as before."""
        old_style = Connection(from_node=1, to_node=2)
        assert old_style.from_port is None
        assert old_style.to_port is None

        nodes, connections = valid_linear_workflow()
        result = validate_workflow_structure(nodes, connections)
        assert result.is_valid is True
