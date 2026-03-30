import asyncio
import traceback as traceback_module

from loguru import logger

from common.model.workflow import Node
from dagster import OpExecutionContext, op
from dagster_orbitx.ops.node_result import NodeResult, capture_output_rows
from dagster_orbitx.services.execution_persistence import (
    persist_error_sync,
    persist_output_sync,
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

            output_rows = capture_output_rows(result.data)

            node_result = NodeResult(
                data=result.data,
                primary_keys=result.primary_keys,
                report_level=result.report_level,
                field_schemas=result.field_schemas,
                output_rows=output_rows,
            )

            persist_output_sync(
                run_id=context.run_id,
                workflow_id=context.run_tags.get(
                    "workflow_id", ""
                ),
                node_instance_id=node.node_instance_id,
                node_id=node.node_id,
                output_rows=output_rows,
            )

            return node_result

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

    return extractor_op
