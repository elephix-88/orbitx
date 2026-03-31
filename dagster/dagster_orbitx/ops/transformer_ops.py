import asyncio
import time
import traceback as traceback_module

from loguru import logger

from common.model.execution import Status
from common.model.transform import TransformType
from common.model.workflow import Node
from dagster import In, OpExecutionContext, op
from dagster_orbitx.ops.node_result import NodeResult
from dagster_orbitx.services.execution_persistence import (
    notify_node_status,
    persist_node_error,
    persist_node_output,
)
from engine.factories.transform import TransformFactory
from engine.utils.retry import with_retry

SCHEMA_UPDATE_TYPES = {
    TransformType.RENAME.value,
    TransformType.COLUMN_EDITOR.value,
    TransformType.UNIFY.value,
}


def make_transformer_op(
    node: Node,
    op_name: str,
    parent_count: int,
    pinned_result: NodeResult | None = None,
):
    is_join = node.node_id == TransformType.JOIN.value

    if is_join:
        input_defs = {
            f"input_{i}": In(dagster_type=NodeResult)
            for i in range(parent_count)
        }

        @op(name=op_name, ins=input_defs)
        def join_transformer_op(
            context: OpExecutionContext, **kwargs
        ) -> NodeResult:
            if pinned_result is not None:
                logger.info(
                    f"Using pinned data for node "
                    f"{node.node_id} "
                    f"(#{node.node_instance_id}), "
                    f"{len(pinned_result.data)} rows"
                )
                return pinned_result

            logger.info(
                f"Transforming (join): {node.node_id} "
                f"(#{node.node_instance_id})"
            )

            notify_node_status(
                context, node, Status.RUNNING,
                start_time=time.time(),
            )

            try:
                factory = TransformFactory()
                transformer = factory.create_transformer(
                    node.parameters, node.node_id
                )

                parent_dataframes = {
                    i: kwargs[f"input_{i}"].data
                    for i in range(len(kwargs))
                }

                transformed = asyncio.run(
                    with_retry(
                        transformer.transform,
                        parent_dataframes,
                    )
                )

                first_input = next(
                    iter(kwargs.values()), None
                )

                node_result = NodeResult(
                    data=transformed,
                    primary_keys=(
                        first_input.primary_keys
                        if first_input
                        else []
                    ),
                    report_level=(
                        first_input.report_level
                        if first_input
                        else ""
                    ),
                    field_schemas=(
                        first_input.field_schemas
                        if first_input
                        else None
                    ),
                )

                persist_node_output(
                    context, node, len(transformed)
                )
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

        return join_transformer_op

    @op(name=op_name)
    def transformer_op(
        context: OpExecutionContext,
        input_result: NodeResult,
    ) -> NodeResult:
        if pinned_result is not None:
            logger.info(
                f"Using pinned data for node {node.node_id} "
                f"(#{node.node_instance_id}), "
                f"{len(pinned_result.data)} rows"
            )
            return pinned_result

        logger.info(
            f"Transforming: {node.node_id} "
            f"(#{node.node_instance_id})"
        )

        notify_node_status(
            context, node, Status.RUNNING,
            start_time=time.time(),
        )

        try:
            factory = TransformFactory()
            transformer = factory.create_transformer(
                node.parameters, node.node_id
            )

            transformed = asyncio.run(
                with_retry(
                    transformer.transform, input_result.data
                )
            )

            field_schemas = input_result.field_schemas
            if node.node_id in SCHEMA_UPDATE_TYPES:
                updated = transformer.update_field_schemas(
                    field_schemas
                )
                if updated is not None:
                    field_schemas = updated

            logger.success(
                f"Transformed {len(transformed)} rows "
                f"(#{node.node_instance_id})"
            )

            node_result = NodeResult(
                data=transformed,
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=field_schemas,
            )

            persist_node_output(context, node, len(transformed))
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

    return transformer_op
