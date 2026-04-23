from typing import Any

import pandas as pd
from loguru import logger
from pydantic import BaseModel

from engine.factories.source import SourceFactory
from engine.factories.transform import TransformFactory


class ColumnInfo(BaseModel):
    name: str
    data_type: str

PREVIEW_ROW_LIMIT = 25


class UpstreamNodeConfig(BaseModel):
    node_type: str
    node_category: str
    parameters: dict[str, Any]


class PreviewNodeRequest(BaseModel):
    node_type: str
    node_category: str
    parameters: dict[str, Any]
    upstream_nodes: list[UpstreamNodeConfig] = []


class PreviewNodeResponse(BaseModel):
    data: list[dict[str, Any]]
    columns: list[ColumnInfo]
    row_count: int


def build_column_info(dataframe: pd.DataFrame) -> list[ColumnInfo]:
    """Map pandas dtypes to human-readable type strings."""
    dtype_mapping = {
        "int64": "integer",
        "int32": "integer",
        "float64": "float",
        "float32": "float",
        "bool": "boolean",
        "datetime64[ns]": "datetime",
        "object": "string",
    }
    return [
        ColumnInfo(
            name=column,
            data_type=dtype_mapping.get(str(dataframe[column].dtype), "string"),
        )
        for column in dataframe.columns
    ]


def dataframe_to_preview(dataframe: pd.DataFrame) -> PreviewNodeResponse:
    """Convert a DataFrame to a PreviewNodeResponse."""
    total_row_count = len(dataframe)
    limited = dataframe.head(PREVIEW_ROW_LIMIT)

    # Replace NaN/NaT with None for JSON serialization
    limited = limited.where(limited.notna(), None)

    return PreviewNodeResponse(
        data=limited.to_dict(orient="records"),
        columns=build_column_info(dataframe),
        row_count=total_row_count,
    )


PREVIEW_TIME_CONFIG = {"time_preset": "last_1_days"}


async def extract_source_data(
    node_type: str, parameters: dict[str, Any]
) -> pd.DataFrame:
    """Run an extractor directly and return the resulting DataFrame.

    For preview, overrides the date range to last 1 day to minimize API calls.
    """
    if "time_config" in parameters:
        parameters = {**parameters, "time_config": PREVIEW_TIME_CONFIG}

    factory = SourceFactory()
    extractor = factory.create_extractor(parameters, node_type)
    result = await extractor.extract(row_limit=PREVIEW_ROW_LIMIT)
    return result.data


async def transform_data(
    node_type: str,
    parameters: dict[str, Any],
    upstream_data: pd.DataFrame,
) -> pd.DataFrame:
    """Run a transformer on upstream data and return the result."""
    factory = TransformFactory()
    transformer = factory.create_transformer(parameters, node_type)
    return await transformer.transform(upstream_data)


async def preview_upstream_chain(
    upstream_nodes: list[UpstreamNodeConfig],
) -> pd.DataFrame:
    """Recursively resolve upstream nodes to produce a single DataFrame.

    The list is ordered from the root source node to the most recent transform.
    The first node must be a source. Each subsequent node transforms the output
    of the previous one.
    """
    if not upstream_nodes:
        raise ValueError("At least one upstream node is required for transforms")

    first_node = upstream_nodes[0]
    if first_node.node_category != "source":
        raise ValueError(
            f"First upstream node must be a source, got '{first_node.node_category}'"
        )

    data = await extract_source_data(first_node.node_type, first_node.parameters)

    for node in upstream_nodes[1:]:
        data = await transform_data(node.node_type, node.parameters, data)

    return data


async def preview_node_data(request: PreviewNodeRequest) -> PreviewNodeResponse:
    """Execute a mini-pipeline and return a preview of the data at a given node.

    - Source nodes: run the extractor directly.
    - Transform nodes: resolve the upstream chain first, then apply the transform.
    - Destination nodes: resolve upstream data and return it as-is (no write).
    """
    category = request.node_category.lower()

    if category == "source":
        logger.info(f"Previewing source node: {request.node_type}")
        data = await extract_source_data(request.node_type, request.parameters)
        return dataframe_to_preview(data)

    if category == "transform":
        logger.info(f"Previewing transform node: {request.node_type}")
        upstream_data = await preview_upstream_chain(request.upstream_nodes)
        transformed = await transform_data(
            request.node_type, request.parameters, upstream_data
        )
        return dataframe_to_preview(transformed)

    if category in ("destination", "destinations"):
        logger.info(f"Previewing destination node: {request.node_type} (pass-through)")
        upstream_data = await preview_upstream_chain(request.upstream_nodes)
        return dataframe_to_preview(upstream_data)

    raise ValueError(f"Unknown node category: {category}")
