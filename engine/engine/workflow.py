"""Workflow DAG executor with async execution."""

import argparse
import asyncio
import time

import pandas as pd
from loguru import logger

from engine.configs.adapter import init_settings
from engine.configs.config import settings
from engine.exceptions import ConfigurationException, WorkflowExecutionException
from engine.factories.loader import LoaderFactory
from engine.factories.source import SourceFactory
from engine.factories.transform import TransformFactory
from engine.interfaces.node import Extractor, Loader, Transformer
from engine.utils.logger import ExecutionTracker
from engine.utils.node_output import (
    build_error_output,
    build_extractor_output,
    build_loader_output,
    build_transformer_output,
)
from engine.utils.retry import with_retry
from engine.utils.validation import validate_dataframe_for_load
from common.database.mongodb import get_mongodb
from common.model.execution import NodeOutput, NodeOutputType
from common.model.google.bigquery import BigQueryDestinationConfig
from common.model.transform import TransformType
from common.model.workflow import (
    Connection,
    Node,
    NodeType,
    WorkflowData,
    WorkflowStatus,
)

# Initialize settings
init_settings()


async def get_workflow_data(job_id: str) -> WorkflowData:
    mongodb = get_mongodb()
    workflow_data = await mongodb.find_one(
        settings.workflow_collection, job_id, WorkflowData
    )
    if workflow_data is None:
        raise ValueError(f"Workflow not found for job_id: {job_id}")
    return workflow_data


def _build_graph(
    nodes: list[Node], connections: list[Connection]
) -> tuple[dict[int, Node], dict[int, list[int]], dict[int, list[int]], dict[int, int]]:
    """Build adjacency structures for DAG execution."""
    node_by_id: dict[int, Node] = {n.node_instance_id: n for n in nodes}
    graph: dict[int, list[int]] = {n.node_instance_id: [] for n in nodes}
    incoming: dict[int, list[int]] = {n.node_instance_id: [] for n in nodes}
    indegree: dict[int, int] = {n.node_instance_id: 0 for n in nodes}

    for edge in connections:
        if edge.from_node not in node_by_id or edge.to_node not in node_by_id:
            raise ValueError(
                f"Invalid connection edge from {edge.from_node} to {edge.to_node}: node not found"
            )
        graph[edge.from_node].append(edge.to_node)
        incoming[edge.to_node].append(edge.from_node)
        indegree[edge.to_node] += 1

    return node_by_id, graph, incoming, indegree


def _stages_for_run_type(run_type: str) -> set[str]:
    """Return the set of node_type values to execute for the given run_type."""
    if run_type == "source":
        return {NodeType.source.value}
    if run_type == "transform":
        return {NodeType.source.value, NodeType.transforms.value}
    if run_type in ("loader", "all"):
        return {
            NodeType.source.value,
            NodeType.transforms.value,
            NodeType.destinations.value,
        }
    raise ValueError(f"Unsupported run type: {run_type}")


async def run_workflow(workflow: WorkflowData, run_type: str) -> None:
    """Execute the workflow according to its DAG connections using async."""
    logger.info(f"Running workflow with run_type: {run_type}")

    execution_tracker = ExecutionTracker(
        label=f"Workflow: {workflow.job_name}",
        workflow_id=str(workflow.id),
        workflow_name=workflow.job_name,
        triggered_by="manual",
        track_in_db=True,
    )
    await execution_tracker.start()

    try:
        node_by_id, graph, incoming, indegree = _build_graph(
            nodes=workflow.nodes, connections=workflow.connections
        )

        stages_to_run: set[str] = _stages_for_run_type(run_type)

        data_outputs: dict[int, pd.DataFrame | None] = {
            node_id: None for node_id in node_by_id.keys()
        }
        metadata_outputs: dict[int, dict[str, list[str] | str | dict]] = {
            node_id: {} for node_id in node_by_id.keys()
        }

        processed: set[int] = set()
        node_errors: dict[int, Exception] = {}

        async def _execute_node(
            current_id: int,
        ) -> tuple[int, pd.DataFrame | None, dict[str, list[str] | str | dict]]:
            node = node_by_id[current_id]
            parent_ids = incoming.get(current_id, [])

            parent_dfs: dict[int, pd.DataFrame] = {}
            input_df: pd.DataFrame | None = None
            input_meta: dict[str, list[str] | str | dict] = {}
            if parent_ids:
                for pid in parent_ids:
                    if data_outputs.get(pid) is not None:
                        parent_dfs[pid] = data_outputs[pid]
                        input_df = data_outputs[pid]
                        input_meta = metadata_outputs.get(pid, {})

            out_df: pd.DataFrame | None = input_df
            out_meta: dict[str, list[str] | str | dict] = input_meta
            node_output: NodeOutput | None = None

            await execution_tracker.start_node(
                node_instance_id=str(node.node_instance_id),
                node_id=node.node_id,
                node_type=node.node_type,
            )

            node_start_time = time.perf_counter()

            try:
                if (
                    node.node_type == NodeType.source.value
                    and NodeType.source.value in stages_to_run
                ):
                    logger.info(
                        f"Running Source Node: {node.node_id} (#{node.node_instance_id})"
                    )
                    source_node = create_source_node(node)
                    result = await with_retry(source_node.extract)
                    out_df = result.data
                    out_meta = {
                        "primary_keys": result.primary_keys,
                        "report_level": result.report_level,
                        "field_schemas": result.field_schemas,
                    }

                    duration = time.perf_counter() - node_start_time
                    node_output = build_extractor_output(
                        source_type=node.node_id,
                        df=out_df,
                        duration_seconds=duration,
                        primary_keys=result.primary_keys,
                        report_level=result.report_level,
                    )

                elif (
                    node.node_type == NodeType.transforms.value
                    and NodeType.transforms.value in stages_to_run
                ):
                    logger.info(
                        f"Running Transform Node: {node.node_id} (#{node.node_instance_id})"
                    )
                    transform_node = create_transform_node(node)

                    if node.node_id == TransformType.JOIN.value:
                        transformed = await with_retry(transform_node.transform, parent_dfs)

                        duration = time.perf_counter() - node_start_time
                        join_config = transform_node.config
                        node_output = build_transformer_output(
                            transform_type=node.node_id,
                            input_df=None,
                            output_df=transformed,
                            duration_seconds=duration,
                            query=f"JOIN on {join_config.base_key}",
                            metadata={
                                "base_node_id": join_config.base_node_id,
                                "sources_count": len(join_config.sources),
                                "join_types": [
                                    s.join_type.value for s in join_config.sources
                                ],
                            },
                        )
                    else:
                        transformed = await with_retry(transform_node.transform, input_df)

                        duration = time.perf_counter() - node_start_time
                        query: str | None = None
                        if node.node_id == TransformType.SQL.value:
                            query = transform_node.config.sql_query
                        elif node.node_id == TransformType.RENAME.value:
                            query = str(transform_node.config.column_mapping)
                        node_output = build_transformer_output(
                            transform_type=node.node_id,
                            input_df=input_df,
                            output_df=transformed,
                            duration_seconds=duration,
                            query=query,
                        )

                    out_df = transformed
                    out_meta = input_meta.copy() if input_meta else {}

                    if node.node_id in (
                        TransformType.RENAME.value,
                        TransformType.COLUMN_EDITOR.value,
                    ):
                        field_schemas = out_meta.get("field_schemas")
                        if field_schemas and isinstance(field_schemas, list):
                            updated = transform_node.update_field_schemas(field_schemas)
                            if updated is not None:
                                out_meta["field_schemas"] = updated

                elif (
                    node.node_type == NodeType.destinations.value
                    and NodeType.destinations.value in stages_to_run
                ):
                    logger.info(
                        f"Running Loader Node: {node.node_id} (#{node.node_instance_id})"
                    )
                    loader_node = create_loader_node(node)

                    config = loader_node.config
                    destination_table = getattr(config, "destination_table", "")
                    insert_mode = getattr(config, "insert_mode", None)
                    operation = insert_mode.value if insert_mode else "INSERT"

                    dfs_to_load: list[tuple[pd.DataFrame, dict]] = []
                    if len(parent_dfs) > 1:
                        for pid, pdf in parent_dfs.items():
                            pmeta = metadata_outputs.get(pid, {})
                            dfs_to_load.append((pdf, pmeta))
                        logger.info(
                            f"Multiple inputs detected: loading {len(dfs_to_load)} DataFrames"
                        )
                    elif input_df is not None:
                        dfs_to_load.append((input_df, input_meta))

                    total_rows = 0
                    last_validated_df: pd.DataFrame | None = None
                    last_merge_keys: list[str] | None = None

                    for df_to_load, meta_to_use in dfs_to_load:
                        merge_keys = meta_to_use.get("primary_keys")
                        if merge_keys and isinstance(merge_keys, list):
                            loader_node.set_merge_keys(merge_keys)

                        field_schemas = meta_to_use.get("field_schemas")
                        if field_schemas and isinstance(field_schemas, list):
                            loader_node.set_field_schemas(field_schemas)

                        validated_df = validate_dataframe_for_load(
                            df=df_to_load,
                            destination_type=node.node_id,
                            destination_table=destination_table,
                            node_id=node.node_id,
                            node_instance_id=node.node_instance_id,
                        )

                        await with_retry(loader_node.load, validated_df)
                        total_rows += len(validated_df)
                        last_validated_df = validated_df
                        last_merge_keys = merge_keys

                    logger.success(
                        f"Loader completed: {node.node_id} (#{node.node_instance_id}) - {total_rows} total rows"
                    )

                    if (
                        isinstance(config, BigQueryDestinationConfig)
                        and config.pass_through
                    ):
                        if len(parent_dfs) > 1:
                            out_df = pd.concat(
                                list(parent_dfs.values()), ignore_index=True
                            )
                            out_meta = input_meta
                        elif last_validated_df is not None:
                            out_df = last_validated_df
                            out_meta = input_meta
                        else:
                            out_df = input_df
                            out_meta = input_meta
                        if out_df is not None:
                            logger.info(
                                f"Pass-through enabled: forwarding {len(out_df)} rows to downstream"
                            )
                    else:
                        out_df = (
                            last_validated_df
                            if last_validated_df is not None
                            else input_df
                        )
                        out_meta = input_meta

                    duration = time.perf_counter() - node_start_time
                    node_output = build_loader_output(
                        destination_type=node.node_id,
                        destination_table=destination_table,
                        df=pd.DataFrame({"rows": [total_rows]}),
                        duration_seconds=duration,
                        operation=operation,
                        merge_keys=list(last_merge_keys) if last_merge_keys else None,
                    )

                elif node.node_type not in (
                    NodeType.source.value,
                    NodeType.transforms.value,
                    NodeType.destinations.value,
                ):
                    raise ConfigurationException(
                        f"Unsupported node_type {node.node_type}",
                        node_id=node.node_id,
                        node_instance_id=node.node_instance_id,
                    )

                await execution_tracker.complete_node(
                    node_instance_id=str(node.node_instance_id),
                    success=True,
                    node_id=node.node_id,
                    node_type=node.node_type,
                    output=node_output,
                )

            except Exception as node_error:
                duration = time.perf_counter() - node_start_time
                if node.node_type == NodeType.source.value:
                    output_type = NodeOutputType.EXTRACTOR
                elif node.node_type == NodeType.transforms.value:
                    output_type = NodeOutputType.TRANSFORMER
                else:
                    output_type = NodeOutputType.LOADER

                error_output = build_error_output(
                    output_type=output_type,
                    node_type_name=node.node_id,
                    error=node_error,
                    duration_seconds=duration,
                )

                await execution_tracker.complete_node(
                    node_instance_id=str(node.node_instance_id),
                    success=False,
                    error=node_error,
                    node_id=node.node_id,
                    node_type=node.node_type,
                    output=error_output,
                )

                raise

            return current_id, out_df, out_meta

        # Async DAG execution using asyncio.create_task + asyncio.wait
        pending_tasks: dict[asyncio.Task, int] = {}

        def submit_ready_nodes() -> None:
            """Submit all nodes that are ready to run (indegree == 0, not processed, not in progress)."""
            in_progress_ids = set(pending_tasks.values())
            ready = [
                nid
                for nid, deg in indegree.items()
                if deg == 0 and nid not in processed and nid not in in_progress_ids
            ]
            for nid in ready:
                task = asyncio.create_task(_execute_node(nid))
                pending_tasks[task] = nid

        # Initial submission of root nodes
        submit_ready_nodes()

        # Process completions and eagerly submit newly ready nodes
        while pending_tasks:
            done, _ = await asyncio.wait(
                pending_tasks.keys(), return_when=asyncio.FIRST_COMPLETED
            )

            for task in done:
                nid = pending_tasks.pop(task)
                try:
                    _, out_df, out_meta = task.result()
                    data_outputs[nid] = out_df
                    metadata_outputs[nid] = out_meta
                    processed.add(nid)
                    for child_id in graph.get(nid, []):
                        indegree[child_id] -= 1
                except Exception as e:
                    node_errors[nid] = e
                    processed.add(nid)
                    logger.error(
                        f"Node {nid} failed, downstream nodes in this pipeline will be skipped"
                    )

            submit_ready_nodes()

        if node_errors:
            failed_nodes = list(node_errors.keys())
            logger.warning(
                f"Workflow completed with {len(failed_nodes)} failed node(s): {failed_nodes}"
            )
            first_error = list(node_errors.values())[0]
            raise WorkflowExecutionException(
                f"Workflow failed with {len(failed_nodes)} node error(s)",
                workflow_id=str(workflow.id),
                failed_nodes=[str(nid) for nid in failed_nodes],
                details={"first_error": str(first_error)},
            ) from first_error

        logger.success("Workflow completed.")
        await execution_tracker.complete_execution(success=True)

    except Exception as e:
        await execution_tracker.complete_execution(success=False, error=e)
        raise


def create_source_node(node: Node) -> Extractor:
    """Create source extractor from node configuration."""
    source_factory = SourceFactory()
    return source_factory.create_extractor(node.parameters, node.node_id)


def create_transform_node(node: Node) -> Transformer:
    """Create transformer from node configuration."""
    transform_factory = TransformFactory()

    if node.node_id in (
        TransformType.SQL.value,
        TransformType.RENAME.value,
        TransformType.JOIN.value,
        TransformType.COLUMN_EDITOR.value,
    ):
        return transform_factory.create_transformer(node.parameters, node.node_id)
    else:
        raise ValueError(f"Unsupported transform type from Node ID: {node.node_id}")


def create_loader_node(node: Node) -> Loader:
    """Create loader from node configuration."""
    loader_factory = LoaderFactory()
    return loader_factory.create_loader(node.parameters, node.node_id)


async def main() -> None:
    """Main entry point for workflow execution."""
    init_settings()

    try:
        parser = argparse.ArgumentParser(description="Run the workflow")
        parser.add_argument("--job_id", type=str, required=True, help="Job ID to run")
        parser.add_argument(
            "--run",
            choices=["source", "transform", "loader", "all"],
            default="all",
            help="Which part of the workflow to run",
        )

        args = parser.parse_args()

        workflow = await get_workflow_data(job_id=args.job_id)

        logger.info(
            f"Loaded workflow '{workflow.job_name}' with {len(workflow.nodes)} nodes and {len(workflow.connections)} connections"
        )

        if workflow.status != WorkflowStatus.ACTIVE:
            logger.warning(
                f"Workflow '{workflow.job_name}' ({workflow.id}) is {workflow.status}. Skipping execution."
            )
            return

        await run_workflow(workflow, run_type=args.run)

    except Exception as ex:
        logger.error(f"Workflow execution failed: {ex}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
