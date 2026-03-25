import asyncio
from datetime import datetime

from loguru import logger

from common.model.delivery import DeliveryConfig
from dagster import In, Nothing, OpExecutionContext, op
from dagster_orbitx.ops.node_result import NodeResult
from engine.exceptions import DelivererException
from engine.node.deliverers.factory import create_deliverer


def make_delivery_op(delivery_config: DeliveryConfig, op_name: str, parent_count: int):
    """Create a Dagster op that delivers the final DataFrame to configured channels.

    The delivery op accepts NodeResult inputs from all terminal nodes in the workflow
    (destination loaders). It uses the DataFrame from the first available input
    to send reports via configured delivery channels (Slack, LINE).

    Args:
        delivery_config: The delivery configuration with channel list.
        op_name: Unique name for this op within the Dagster job.
        parent_count: Number of parent nodes feeding into this op.

    Returns:
        A Dagster op function that executes delivery.
    """
    input_defs = {
        f"input_{i}": In(dagster_type=NodeResult)
        for i in range(parent_count)
    }

    @op(name=op_name, ins=input_defs)
    def delivery_op(context: OpExecutionContext, **kwargs) -> Nothing:
        first_result = next(iter(kwargs.values()), None)
        if not first_result or first_result.data.empty:
            logger.warning("Delivery skipped: no data available from upstream nodes")
            return

        data = first_result.data
        workflow_name = context.run_tags.get("workflow_name", "Unknown Workflow")
        execution_time = datetime.now()

        for channel_config in delivery_config.channels:
            deliverer = create_deliverer(channel_config)

            try:
                asyncio.run(
                    deliverer.deliver(
                        data=data,
                        workflow_name=workflow_name,
                        execution_time=execution_time,
                        include_ai_summary=delivery_config.include_ai_summary,
                    )
                )
                logger.success(
                    f"Delivered to {channel_config.channel.value} channel"
                )
            except DelivererException as error:
                logger.error(
                    f"Delivery to {channel_config.channel.value} failed: {error}"
                )

    return delivery_op
