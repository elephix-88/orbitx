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
from engine.exceptions import ValidationException
from engine.factories.loader import LoaderFactory
from engine.utils.retry import with_retry
from engine.utils.validation import validate_dataframe


def make_loader_op(
    node: Node,
    op_name: str,
    pinned_result: NodeResult | None = None,
):
    @op(name=op_name)
    def loader_op(
        context: OpExecutionContext,
        input_result: NodeResult,
    ) -> NodeResult:
        if pinned_result is not None:
            logger.info(
                f"Using pinned data for node {node.node_id} "
                f"(#{node.node_instance_id}), "
                f"skipping write "
                f"({len(pinned_result.data)} rows)"
            )
            return pinned_result

        logger.info(
            f"Loading: {node.node_id} "
            f"(#{node.node_instance_id})"
        )

        try:
            factory = LoaderFactory()
            loader = factory.create_loader(
                node.parameters, node.node_id
            )

            if input_result.primary_keys:
                loader.set_merge_keys(input_result.primary_keys)

            if input_result.field_schemas:
                loader.set_field_schemas(
                    input_result.field_schemas
                )

            destination_table = getattr(
                loader.config, "destination_table", ""
            )

            try:
                validated_dataframe = validate_dataframe(
                    input_result.data,
                    node_id=node.node_id,
                    node_instance_id=node.node_instance_id,
                    allow_empty=True,
                )
            except ValidationException as error:
                error.details["destination_type"] = (
                    node.node_id
                )
                error.details["destination_table"] = (
                    destination_table
                )
                raise

            output_rows = capture_output_rows(
                validated_dataframe
            )

            asyncio.run(
                with_retry(loader.load, validated_dataframe)
            )

            logger.success(
                f"Loaded {len(validated_dataframe)} rows to "
                f"{node.node_id} (#{node.node_instance_id})"
            )

            node_result = NodeResult(
                data=input_result.data,
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=input_result.field_schemas,
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

    return loader_op
