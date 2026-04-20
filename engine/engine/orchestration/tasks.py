import time
import traceback as traceback_module
from collections.abc import Callable
from datetime import datetime

import pandas as pd
from loguru import logger
from prefect import task

from common.model.delivery import DeliveryConfig
from common.model.execution import Status
from common.model.transform import TransformType
from common.model.workflow import Node
from engine.exceptions import DelivererException
from engine.factories.loader import LoaderFactory
from engine.factories.source import SourceFactory
from engine.factories.transform import TransformFactory
from engine.node.deliverers.factory import create_deliverer
from engine.orchestration.node_result import NodeResult
from engine.orchestration.persistence import (
    notify_node_status,
    persist_node_error,
    persist_node_output,
)
from engine.utils.async_runner import run_async
from engine.utils.retry import with_retry
from engine.utils.validation import validate_dataframe

ROUTER_NODE_IDS = {"if", "switch"}

SCHEMA_UPDATE_TYPES = {
    TransformType.RENAME.value,
    TransformType.COLUMN_EDITOR.value,
    TransformType.UNIFY.value,
    TransformType.ANOMALY_DETECTOR.value,
}


def execute_with_status_tracking(
    execution_id: str,
    workflow_id: str,
    node: Node,
    execute: Callable[[], tuple[NodeResult | dict[str, NodeResult], int]],
) -> NodeResult | dict[str, NodeResult]:
    """Wrap node execution with RUNNING/SUCCESS/FAILED status tracking.

    Centralizes the try/except + persistence pattern shared by all task types.
    The execute callable returns (result, row_count) — the caller knows
    its own row count semantics.
    """
    notify_node_status(
        execution_id, workflow_id, node, Status.RUNNING,
        start_time=time.time(),
    )

    try:
        result, row_count = execute()

        persist_node_output(execution_id, workflow_id, node, row_count)

        notify_node_status(
            execution_id, workflow_id, node, Status.SUCCESS,
            end_time=time.time(),
        )

        return result

    except Exception:
        persist_node_error(
            execution_id, workflow_id, node, traceback_module.format_exc()
        )
        notify_node_status(
            execution_id, workflow_id, node, Status.FAILED,
            end_time=time.time(),
        )
        raise


# ---------------------------------------------------------------------------
# Source tasks
# ---------------------------------------------------------------------------


def make_extractor_task(
    node: Node,
    task_name: str,
    execution_id: str,
    workflow_id: str,
):
    @task(name=task_name)
    def extractor_task() -> NodeResult:
        def execute():
            factory = SourceFactory()
            extractor = factory.create_extractor(node.parameters, node.node_id)
            result = run_async(with_retry(extractor.extract))

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
            return node_result, len(result.data)

        return execute_with_status_tracking(execution_id, workflow_id, node, execute)

    return extractor_task


# ---------------------------------------------------------------------------
# Transform tasks
# ---------------------------------------------------------------------------


def make_transformer_task(
    node: Node,
    task_name: str,
    execution_id: str,
    workflow_id: str,
):
    is_join = node.node_id == TransformType.JOIN.value

    if is_join:
        @task(name=task_name)
        def join_transformer_task(**kwargs) -> NodeResult:
            def execute():
                factory = TransformFactory()
                transformer = factory.create_transformer(node.parameters, node.node_id)

                parent_dataframes = {
                    i: kwargs[f"input_{i}"].data
                    for i in range(len(kwargs))
                }

                transformed = run_async(
                    with_retry(transformer.transform, parent_dataframes)
                )

                first_input = next(iter(kwargs.values()), None)

                node_result = NodeResult(
                    data=transformed,
                    primary_keys=first_input.primary_keys if first_input else [],
                    report_level=first_input.report_level if first_input else "",
                    field_schemas=first_input.field_schemas if first_input else None,
                )
                return node_result, len(transformed)

            return execute_with_status_tracking(execution_id, workflow_id, node, execute)

        return join_transformer_task

    @task(name=task_name)
    def transformer_task(input_result: NodeResult) -> NodeResult:
        def execute():
            parameters = node.parameters
            if node.node_id == TransformType.ANOMALY_DETECTOR.value:
                parameters = dict(parameters) if not isinstance(parameters, dict) else parameters
                parameters["workflow_id"] = workflow_id
                parameters["node_instance_id"] = node.node_instance_id

            factory = TransformFactory()
            transformer = factory.create_transformer(parameters, node.node_id)

            transformed = run_async(
                with_retry(transformer.transform, input_result.data)
            )

            field_schemas = input_result.field_schemas
            if node.node_id in SCHEMA_UPDATE_TYPES:
                updated = transformer.update_field_schemas(field_schemas)
                if updated is not None:
                    field_schemas = updated

            logger.success(
                f"Transformed {len(transformed)} rows (#{node.node_instance_id})"
            )

            node_result = NodeResult(
                data=transformed,
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=field_schemas,
            )
            return node_result, len(transformed)

        return execute_with_status_tracking(execution_id, workflow_id, node, execute)

    return transformer_task


# ---------------------------------------------------------------------------
# Loader tasks
# ---------------------------------------------------------------------------


def make_loader_task(
    node: Node,
    task_name: str,
    execution_id: str,
    workflow_id: str,
    execution_datetime: datetime,
):
    @task(name=task_name)
    def loader_task(input_result: NodeResult) -> NodeResult:
        def execute():
            factory = LoaderFactory()
            loader = factory.create_loader(node.parameters, node.node_id)

            loader.set_execution_context(execution_id, execution_datetime)

            if input_result.primary_keys:
                loader.set_merge_keys(input_result.primary_keys)

            if input_result.field_schemas:
                loader.set_field_schemas(input_result.field_schemas)

            validated_dataframe = validate_dataframe(
                input_result.data,
                node_id=node.node_id,
                node_instance_id=node.node_instance_id,
                allow_empty=True,
            )

            run_async(with_retry(loader.load, validated_dataframe))

            logger.success(
                f"Loaded {len(validated_dataframe)} rows to "
                f"{node.node_id} (#{node.node_instance_id})"
            )

            node_result = NodeResult(
                data=input_result.data,
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=input_result.field_schemas,
            )
            return node_result, len(validated_dataframe)

        return execute_with_status_tracking(execution_id, workflow_id, node, execute)

    return loader_task


# ---------------------------------------------------------------------------
# Router tasks
# ---------------------------------------------------------------------------


def make_if_router_task(
    node: Node,
    task_name: str,
    execution_id: str,
    workflow_id: str,
):
    @task(name=task_name)
    def if_router_task(input_result: NodeResult) -> dict[str, NodeResult]:
        def execute():
            factory = TransformFactory()
            router = factory.create_router(node.parameters, node.node_id)

            outputs = router.route(input_result.data)

            true_result = NodeResult(
                data=outputs["true"],
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=input_result.field_schemas,
            )

            false_result = NodeResult(
                data=outputs["false"],
                primary_keys=input_result.primary_keys,
                report_level=input_result.report_level,
                field_schemas=input_result.field_schemas,
            )

            logger.success(
                f"Routed (if) {len(input_result.data)} rows: "
                f"{len(outputs['true'])} true, {len(outputs['false'])} false "
                f"(#{node.node_instance_id})"
            )

            return {"true": true_result, "false": false_result}, len(input_result.data)

        return execute_with_status_tracking(execution_id, workflow_id, node, execute)

    return if_router_task


def make_switch_router_task(
    node: Node,
    task_name: str,
    execution_id: str,
    workflow_id: str,
):
    output_names = [case.case_id for case in node.parameters.cases]
    output_names.append(node.parameters.default_case_id)

    @task(name=task_name)
    def switch_router_task(input_result: NodeResult) -> dict[str, NodeResult]:
        def execute():
            factory = TransformFactory()
            router = factory.create_router(node.parameters, node.node_id)

            outputs = router.route(input_result.data)

            results: dict[str, NodeResult] = {}
            for port_name in output_names:
                port_data = outputs.get(port_name)
                if port_data is None:
                    port_data = pd.DataFrame()

                results[port_name] = NodeResult(
                    data=port_data,
                    primary_keys=input_result.primary_keys,
                    report_level=input_result.report_level,
                    field_schemas=input_result.field_schemas,
                )

            case_summary = ", ".join(
                f"'{name}': {len(outputs.get(name, []))} rows"
                for name in output_names
            )
            logger.success(
                f"Routed (switch) {len(input_result.data)} rows: "
                f"{case_summary} (#{node.node_instance_id})"
            )

            return results, len(input_result.data)

        return execute_with_status_tracking(execution_id, workflow_id, node, execute)

    return switch_router_task


# ---------------------------------------------------------------------------
# Delivery task
# ---------------------------------------------------------------------------


def make_delivery_task(
    delivery_config: DeliveryConfig,
    task_name: str,
    workflow_name: str,
    parent_count: int,
):
    @task(name=task_name)
    def delivery_task(**kwargs) -> None:
        first_result = next(iter(kwargs.values()), None)
        if not first_result or first_result.data.empty:
            logger.warning("Delivery skipped: no data available from upstream nodes")
            return

        data = first_result.data
        execution_time = datetime.now()

        for channel_config in delivery_config.channels:
            deliverer = create_deliverer(channel_config)

            try:
                run_async(
                    deliverer.deliver(
                        data=data,
                        workflow_name=workflow_name,
                        execution_time=execution_time,
                        include_ai_summary=delivery_config.include_ai_summary,
                    )
                )
                logger.success(f"Delivered to {channel_config.channel.value} channel")
            except DelivererException as error:
                logger.error(
                    f"Delivery to {channel_config.channel.value} failed: {error}"
                )

    return delivery_task
