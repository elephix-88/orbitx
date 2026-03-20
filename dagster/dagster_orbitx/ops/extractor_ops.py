import asyncio

from dagster import OpExecutionContext, op
from loguru import logger

from engine.factories.source import SourceFactory
from engine.utils.retry import with_retry
from common.model.workflow import Node
from dagster_orbitx.ops.node_result import NodeResult


def make_extractor_op(node: Node, op_name: str):
    @op(name=op_name)
    def extractor_op(context: OpExecutionContext) -> NodeResult:
        logger.info(f"Extracting: {node.node_id} (#{node.node_instance_id})")

        factory = SourceFactory()
        extractor = factory.create_extractor(node.parameters, node.node_id)
        result = asyncio.run(with_retry(extractor.extract))

        logger.success(
            f"Extracted {len(result.data)} rows from {node.node_id} "
            f"(#{node.node_instance_id})"
        )

        return NodeResult(
            data=result.data,
            primary_keys=result.primary_keys,
            report_level=result.report_level,
            field_schemas=result.field_schemas,
        )

    return extractor_op
