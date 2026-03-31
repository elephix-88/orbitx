import asyncio
import time
import traceback as traceback_module

from loguru import logger

from common.model.execution import Status
from common.model.workflow import Node
from dagster import OpExecutionContext, op
from dagster_orbitx.ops.node_result import NodeResult
from dagster_orbitx.services.execution_persistence import (
    notify_node_status,
    persist_node_error,
    persist_node_output,
)
from engine.factories.source import SourceFactory
from engine.utils.retry import with_retry


def make_extractor_op(
    node: Node,
    op_name: str,
    pinned_result: NodeResult | None = None,
):
    @op(name=op_name)
    def extractor_op(context: OpExecutionContext) -> NodeResult:
        if pinned_result is not None:
            logger.info(
                f"Using pinned data for node {node.node_id} "
                f"(#{node.node_instance_id}), "
                f"{len(pinned_result.data)} rows"
            )
            return pinned_result

        notify_node_status(
            context, node, Status.RUNNING,
            start_time=time.time(),
        )

        logger.info(
            f"Extracting: {node.node_id} "
            f"(#{node.node_instance_id})"
        )

        try:
            factory = SourceFactory()
            extractor = factory.create_extractor(
                node.parameters, node.node_id
            )
            result = asyncio.run(with_retry(extractor.extract))

            logger.success(
                f"Extracted {len(result.data)} rows from "
                f"{node.node_id} (#{node.node_instance_id})"
            )

            node_result = NodeResult(
                data=result.data,
                primary_keys=result.primary_keys,
                report_level=result.report_level,
                field_schemas=result.field_schemas,
            )

            persist_node_output(context, node, len(result.data))

            notify_node_status(
                context, node, Status.SUCCESS,
                end_time=time.time(),
            )

            return node_result

        except Exception:
            error_trace = traceback_module.format_exc()
            persist_node_error(context, node, error_trace)

            notify_node_status(
                context, node, Status.FAILED,
                end_time=time.time(),
            )

            raise

    return extractor_op
