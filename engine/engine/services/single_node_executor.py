import traceback as traceback_module
from typing import Any

import pandas as pd
from loguru import logger
from pydantic import BaseModel

from common.model.execution import (
    DataSummary,
    ExtractorOutput,
    NodeOutput,
    NodeOutputType,
    TransformerOutput,
)
from common.model.workflow import Node
from engine.factories.source import SourceFactory
from engine.factories.transform import TransformFactory

PREVIEW_ROW_LIMIT = 25

DTYPE_MAPPING = {
    "int64": "integer",
    "int32": "integer",
    "float64": "float",
    "float32": "float",
    "bool": "boolean",
    "datetime64[ns]": "datetime",
    "object": "string",
}

SOURCE_NODE_TYPES = {"source"}
TRANSFORM_NODE_TYPES = {"transform"}
DESTINATION_NODE_TYPES = {"destinations"}


class ColumnInfo(BaseModel):
    name: str
    data_type: str


class SingleNodeResult(BaseModel):
    data: list[dict[str, Any]]
    columns: list[ColumnInfo]
    row_count: int
    node_output: NodeOutput | None = None
    error_message: str | None = None
    traceback: str | None = None


def build_column_info(dataframe: pd.DataFrame) -> list[ColumnInfo]:
    """Map pandas dtypes to human-readable type strings."""
    return [
        ColumnInfo(
            name=column,
            data_type=DTYPE_MAPPING.get(str(dataframe[column].dtype), "string"),
        )
        for column in dataframe.columns
    ]


def dataframe_to_preview_data(dataframe: pd.DataFrame) -> list[dict[str, Any]]:
    """Convert a DataFrame to a list of dicts, capped at PREVIEW_ROW_LIMIT rows.

    Replaces NaN/NaT with None for JSON serialization.
    """
    limited = dataframe.head(PREVIEW_ROW_LIMIT)
    limited = limited.where(limited.notna(), None)
    return limited.to_dict(orient="records")


def build_error_result(error: Exception) -> SingleNodeResult:
    """Build a SingleNodeResult for a failed execution."""
    return SingleNodeResult(
        data=[],
        columns=[],
        row_count=0,
        error_message=str(error),
        traceback=traceback_module.format_exc(),
    )


async def execute_source_node(node: Node) -> SingleNodeResult:
    """Execute a source node by running its extractor."""
    logger.info(f"Step-run source node: {node.node_id} (#{node.node_instance_id})")

    factory = SourceFactory()
    extractor = factory.create_extractor(node.parameters, node.node_id)
    result = await extractor.extract()

    dataframe = result.data
    row_count = len(dataframe)

    node_output = NodeOutput(
        title=f"Extracted from {node.node_id}",
        summary=f"Extracted {row_count} rows",
        output_type=NodeOutputType.EXTRACTOR,
        data_summary=DataSummary(
            row_count=row_count,
            column_count=len(dataframe.columns),
            columns=list(dataframe.columns),
        ),
        extractor_output=ExtractorOutput(
            source_type=node.node_id,
            records_extracted=row_count,
            columns_extracted=len(dataframe.columns),
            primary_keys=result.primary_keys or [],
            report_level=result.report_level,
        ),
    )

    return SingleNodeResult(
        data=dataframe_to_preview_data(dataframe),
        columns=build_column_info(dataframe),
        row_count=row_count,
        node_output=node_output,
    )


async def execute_transform_node(
    node: Node, upstream_data: pd.DataFrame
) -> SingleNodeResult:
    """Execute a transform node by applying the transformer to upstream data."""
    logger.info(f"Step-run transform node: {node.node_id} (#{node.node_instance_id})")

    input_row_count = len(upstream_data)

    factory = TransformFactory()
    transformer = factory.create_transformer(node.parameters, node.node_id)
    transformed = await transformer.transform(upstream_data)

    output_row_count = len(transformed)

    node_output = NodeOutput(
        title=f"Transformed by {node.node_id}",
        summary=f"{input_row_count} rows in, {output_row_count} rows out",
        output_type=NodeOutputType.TRANSFORMER,
        data_summary=DataSummary(
            row_count=output_row_count,
            column_count=len(transformed.columns),
            columns=list(transformed.columns),
        ),
        transformer_output=TransformerOutput(
            transform_type=node.node_id,
            records_input=input_row_count,
            records_output=output_row_count,
            columns_before=len(upstream_data.columns),
            columns_after=len(transformed.columns),
        ),
    )

    return SingleNodeResult(
        data=dataframe_to_preview_data(transformed),
        columns=build_column_info(transformed),
        row_count=output_row_count,
        node_output=node_output,
    )


def execute_destination_passthrough(
    node: Node, upstream_data: pd.DataFrame
) -> SingleNodeResult:
    """Return upstream data without writing for destination nodes."""
    logger.info(
        f"Step-run destination node: {node.node_id} (#{node.node_instance_id}) "
        f"— pass-through, no write"
    )

    row_count = len(upstream_data)

    return SingleNodeResult(
        data=dataframe_to_preview_data(upstream_data),
        columns=build_column_info(upstream_data),
        row_count=row_count,
    )


async def execute_single_node(
    node: Node,
    upstream_data: pd.DataFrame | None = None,
) -> SingleNodeResult:
    """Execute a single workflow node outside of Prefect context.

    Routes by node_type:
    - source: runs the extractor via SourceFactory
    - transform: applies the transformer to upstream_data via TransformFactory
    - destinations: returns upstream_data as-is (no write)

    On error, returns a SingleNodeResult with error_message and traceback populated,
    and empty data/columns.
    """
    try:
        if node.node_type in SOURCE_NODE_TYPES:
            return await execute_source_node(node)

        if node.node_type in TRANSFORM_NODE_TYPES:
            if upstream_data is None:
                raise ValueError(
                    f"Transform node '{node.node_id}' requires upstream_data "
                    f"but received None"
                )
            return await execute_transform_node(node, upstream_data)

        if node.node_type in DESTINATION_NODE_TYPES:
            if upstream_data is None:
                raise ValueError(
                    f"Destination node '{node.node_id}' requires upstream_data "
                    f"but received None"
                )
            return execute_destination_passthrough(node, upstream_data)

        raise ValueError(f"Unknown node_type: '{node.node_type}'")

    except Exception as error:
        logger.error(
            f"Step-run failed for node {node.node_id} "
            f"(#{node.node_instance_id}): {error}"
        )
        return build_error_result(error)
