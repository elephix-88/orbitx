import traceback as traceback_module

import pandas as pd
from loguru import logger

from common.model.conditional import SwitchNodeConfig
from common.model.workflow import Node
from dagster import OpExecutionContext, Out, op
from dagster_orbitx.ops.node_result import NodeResult, capture_output_rows
from dagster_orbitx.services.execution_persistence import (
    persist_error_sync,
    persist_output_sync,
)
from engine.factories.transform import TransformFactory

ROUTER_NODE_IDS = {"if", "switch"}
IF_OUTPUT_PORTS = ["true", "false"]


def make_if_router_op(
    node: Node,
    op_name: str,
    pinned_result: NodeResult | None = None,
):
    """Create a Dagster op for an IF node with two named outputs: 'true' and 'false'."""

    @op(
        name=op_name,
        out={
            "true": Out(dagster_type=NodeResult),
            "false": Out(dagster_type=NodeResult),
        },
    )
    def if_router_op(
        context: OpExecutionContext,
        input_result: NodeResult,
    ) -> tuple[NodeResult, NodeResult]:
        if pinned_result is not None:
            logger.info(
                f"Using pinned data for node {node.node_id} "
                f"(#{node.node_instance_id}), "
                f"{len(pinned_result.data)} rows"
            )
            return pinned_result, pinned_result

        logger.info(
            f"Routing (if): {node.node_id} "
            f"(#{node.node_instance_id})"
        )

        try:
            factory = TransformFactory()
            router = factory.create_router(
                node.parameters, node.node_id
            )

            outputs = router.route(input_result.data)

            true_data = outputs["true"]
            false_data = outputs["false"]

            true_rows = capture_output_rows(true_data)
            false_rows = capture_output_rows(false_data)

            # Persist combined output rows for debug
            combined_rows = true_rows[:500] + false_rows[:500]
            persist_output_sync(
                run_id=context.run_id,
                workflow_id=context.run_tags.get(
                    "workflow_id", ""
                ),
                node_instance_id=node.node_instance_id,
                node_id=node.node_id,
                output_rows=combined_rows,
            )

            true_result = NodeResult(
                data=true_data,
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=input_result.field_schemas,
                output_rows=true_rows,
            )

            false_result = NodeResult(
                data=false_data,
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=input_result.field_schemas,
                output_rows=false_rows,
            )

            logger.success(
                f"Routed (if) {len(input_result.data)} rows: "
                f"{len(true_data)} true, "
                f"{len(false_data)} false "
                f"(#{node.node_instance_id})"
            )

            return true_result, false_result

        except Exception:
            error_trace = traceback_module.format_exc()
            persist_error_sync(
                run_id=context.run_id,
                workflow_id=context.run_tags.get(
                    "workflow_id", ""
                ),
                node_instance_id=node.node_instance_id,
                node_id=node.node_id,
                error_trace=error_trace,
            )
            raise

    return if_router_op


def make_switch_router_op(
    node: Node,
    op_name: str,
    pinned_result: NodeResult | None = None,
):
    """Create a Dagster op for a Switch node with dynamic named outputs.

    Output names are derived from the SwitchNodeConfig: one per case_id
    plus the default_case_id.
    """
    config = node.parameters
    if not isinstance(config, SwitchNodeConfig):
        raise ValueError(
            f"Switch node #{node.node_instance_id} expected "
            f"SwitchNodeConfig, got {type(config).__name__}"
        )

    output_names = [case.case_id for case in config.cases]
    output_names.append(config.default_case_id)

    out_dict = {
        name: Out(dagster_type=NodeResult)
        for name in output_names
    }

    @op(name=op_name, out=out_dict)
    def switch_router_op(
        context: OpExecutionContext,
        input_result: NodeResult,
    ) -> tuple:
        if pinned_result is not None:
            logger.info(
                f"Using pinned data for node {node.node_id} "
                f"(#{node.node_instance_id}), "
                f"{len(pinned_result.data)} rows"
            )
            return tuple(
                pinned_result for _ in output_names
            )

        logger.info(
            f"Routing (switch): {node.node_id} "
            f"(#{node.node_instance_id})"
        )

        try:
            factory = TransformFactory()
            router = factory.create_router(
                node.parameters, node.node_id
            )

            outputs = router.route(input_result.data)

            # Persist combined output for debug
            combined_rows: list[dict] = []
            for port_name in output_names:
                port_data = outputs.get(port_name)
                if port_data is not None and not port_data.empty:
                    rows = capture_output_rows(port_data)
                    combined_rows.extend(rows[:200])

            persist_output_sync(
                run_id=context.run_id,
                workflow_id=context.run_tags.get(
                    "workflow_id", ""
                ),
                node_instance_id=node.node_instance_id,
                node_id=node.node_id,
                output_rows=combined_rows[:1000],
            )

            results = []
            for port_name in output_names:
                port_data = outputs.get(port_name)
                if port_data is None:
                    port_data = pd.DataFrame()

                results.append(
                    NodeResult(
                        data=port_data,
                        primary_keys=input_result.primary_keys,
                        report_level=input_result.report_level,
                        field_schemas=input_result.field_schemas,
                        output_rows=capture_output_rows(
                            port_data
                        ),
                    )
                )

            case_summary = ", ".join(
                f"'{name}': {len(outputs.get(name, []))} rows"
                for name in output_names
            )
            logger.success(
                f"Routed (switch) "
                f"{len(input_result.data)} rows: "
                f"{case_summary} "
                f"(#{node.node_instance_id})"
            )

            return tuple(results)

        except Exception:
            error_trace = traceback_module.format_exc()
            persist_error_sync(
                run_id=context.run_id,
                workflow_id=context.run_tags.get(
                    "workflow_id", ""
                ),
                node_instance_id=node.node_instance_id,
                node_id=node.node_id,
                error_trace=error_trace,
            )
            raise

    return switch_router_op
