import asyncio

import pandas as pd
from dagster import OpExecutionContext, op
from loguru import logger

from engine.factories.loader import LoaderFactory
from engine.utils.retry import with_retry
from engine.exceptions import ValidationException
from engine.utils.validation import validate_dataframe
from common.model.workflow import Node
from dagster_orbitx.ops.node_result import NodeResult


def make_loader_op(node: Node, op_name: str):
    @op(name=op_name)
    def loader_op(context: OpExecutionContext, input_result: NodeResult) -> None:
        logger.info(f"Loading: {node.node_id} (#{node.node_instance_id})")

        factory = LoaderFactory()
        loader = factory.create_loader(node.parameters, node.node_id)

        if input_result.primary_keys:
            loader.set_merge_keys(input_result.primary_keys)

        if input_result.field_schemas:
            loader.set_field_schemas(input_result.field_schemas)

        destination_table = getattr(loader.config, "destination_table", "")

        try:
            validated_dataframe = validate_dataframe(
                input_result.data,
                node_id=node.node_id,
                node_instance_id=node.node_instance_id,
                allow_empty=True,
            )
        except ValidationException as e:
            e.details["destination_type"] = node.node_id
            e.details["destination_table"] = destination_table
            raise

        asyncio.run(with_retry(loader.load, validated_dataframe))

        logger.success(
            f"Loaded {len(validated_dataframe)} rows to {node.node_id} "
            f"(#{node.node_instance_id})"
        )

    return loader_op
