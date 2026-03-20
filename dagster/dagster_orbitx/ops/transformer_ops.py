import asyncio

from dagster import In, OpExecutionContext, op
from loguru import logger

from engine.factories.transform import TransformFactory
from engine.utils.retry import with_retry
from common.model.transform import TransformType
from common.model.workflow import Node
from dagster_orbitx.ops.node_result import NodeResult


def make_transformer_op(node: Node, op_name: str, parent_count: int):
    is_join = node.node_id == TransformType.JOIN.value

    if is_join:
        input_defs = {
            f"input_{i}": In(dagster_type=NodeResult)
            for i in range(parent_count)
        }

        @op(name=op_name, ins=input_defs)
        def join_transformer_op(context: OpExecutionContext, **kwargs) -> NodeResult:
            logger.info(f"Transforming (join): {node.node_id} (#{node.node_instance_id})")

            factory = TransformFactory()
            transformer = factory.create_transformer(node.parameters, node.node_id)

            parent_dataframes = {
                i: kwargs[f"input_{i}"].data for i in range(len(kwargs))
            }

            transformed = asyncio.run(with_retry(transformer.transform, parent_dataframes))

            first_input = next(iter(kwargs.values()), None)
            return NodeResult(
                data=transformed,
                primary_keys=first_input.primary_keys if first_input else [],
                report_level=first_input.report_level if first_input else "",
                field_schemas=first_input.field_schemas if first_input else None,
            )

        return join_transformer_op

    @op(name=op_name)
    def transformer_op(context: OpExecutionContext, input_result: NodeResult) -> NodeResult:
        logger.info(f"Transforming: {node.node_id} (#{node.node_instance_id})")

        factory = TransformFactory()
        transformer = factory.create_transformer(node.parameters, node.node_id)

        transformed = asyncio.run(with_retry(transformer.transform, input_result.data))

        field_schemas = input_result.field_schemas
        if node.node_id in (TransformType.RENAME.value, TransformType.COLUMN_EDITOR.value):
            updated = transformer.update_field_schemas(field_schemas)
            if updated is not None:
                field_schemas = updated

        logger.success(f"Transformed {len(transformed)} rows (#{node.node_instance_id})")

        return NodeResult(
            data=transformed,
            primary_keys=input_result.primary_keys,
            report_level=input_result.report_level,
            field_schemas=field_schemas,
        )

    return transformer_op
