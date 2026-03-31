import time
import traceback as traceback_module

import pandas as pd
from loguru import logger

from common.model.conditional import SwitchNodeConfig
from common.model.execution import Status
from common.model.workflow import Node
from dagster import OpExecutionContext, Out, op
from dagster_orbitx.ops.node_result import NodeResult
from dagster_orbitx.services.execution_persistence import (
    notify_node_status,
    persist_node_error,
    persist_node_output,
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

        notify_node_status(
            context, node, Status.RUNNING,
            start_time=time.time(),
        )

        try:
            factory = TransformFactory()
            router = factory.create_router(
                node.parameters, node.node_id
            )

            outputs = router.route(input_result.data)

            true_data = outputs["true"]
            false_data = outputs["false"]

            persist_node_output(context, node, len(input_result.data))

            true_result = NodeResult(
                data=true_data,
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=input_result.field_schemas,
            )

            false_result = NodeResult(
                data=false_data,
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=input_result.field_schemas,
            )

            logger.success(
                f"Routed (if) {len(input_result.data)} rows: "
                f"{len(true_data)} true, "
                f"{len(false_data)} false "
                f"(#{node.node_instance_id})"
            )

            notify_node_status(
                context, node, Status.SUCCESS,
                end_time=time.time(),
            )

            return true_result, false_result

        except Exception:
            error_trace = traceback_module.format_exc()
            persist_node_error(context, node, error_trace)
            notify_node_status(
                context, node, Status.FAILED,
                end_time=time.time(),
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

        notify_node_status(
            context, node, Status.RUNNING,
            start_time=time.time(),
        )

        try:
            factory = TransformFactory()
            router = factory.create_router(
                node.parameters, node.node_id
            )

            outputs = router.route(input_result.data)

            persist_node_output(context, node, len(input_result.data))

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

            notify_node_status(
                context, node, Status.SUCCESS,
                end_time=time.time(),
            )

            return tuple(results)

        except Exception:
            error_trace = traceback_module.format_exc()
            persist_node_error(context, node, error_trace)
            notify_node_status(
                context, node, Status.FAILED,
                end_time=time.time(),
            )
            raise

    return switch_router_op
