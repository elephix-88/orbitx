import pandas as pd
from loguru import logger

from common.model.transform import JoinTransformConfig
from engine.exceptions import TransformerException
from engine.interfaces.node import Transformer
from engine.utils.dtypes import normalize_join_keys


class JoinTransformer(Transformer):
    """Transformer that joins N DataFrames sequentially."""

    def __init__(self, config: JoinTransformConfig) -> None:
        self.config = config

    async def transform(self, data: dict[int, pd.DataFrame]) -> pd.DataFrame:
        """Join multiple DataFrames."""
        required_ids = {self.config.base_node_id} | {
            s.node_id for s in self.config.sources
        }
        missing = required_ids - set(data.keys())
        if missing:
            raise TransformerException(
                f"Missing input DataFrames for node IDs: {missing}",
                transform_type="join",
                details={"required": list(required_ids), "received": list(data.keys())},
            )

        if self.config.base_node_id not in data:
            raise TransformerException(
                f"Base node {self.config.base_node_id} not found in inputs",
                transform_type="join",
            )

        result = data[self.config.base_node_id].copy()
        logger.info(
            f"Starting join with base node "
            f"{self.config.base_node_id} ({len(result)} rows)"
        )

        base_keys = self.config.get_base_keys()

        for key in base_keys:
            if key not in result.columns:
                raise TransformerException(
                    f"Base key '{key}' not found in base DataFrame. "
                    f"Available: {list(result.columns)}",
                    transform_type="join",
                )

        for i, source in enumerate(self.config.sources):
            source_df = data[source.node_id].copy()

            left_keys = source.get_left_keys(base_keys)
            right_keys = source.get_right_keys()

            for key in right_keys:
                if key not in source_df.columns:
                    raise TransformerException(
                        f"Key '{key}' not found in source node {source.node_id}. "
                        f"Available: {list(source_df.columns)}",
                        transform_type="join",
                        details={"source_index": i, "node_id": source.node_id},
                    )

            for left_key, right_key in zip(left_keys, right_keys, strict=False):
                result, source_df = normalize_join_keys(
                    result, source_df, left_key, right_key
                )

            key_pairs = " AND ".join(
                f"{lk}={rk}" for lk, rk in zip(left_keys, right_keys, strict=False)
            )
            logger.info(
                f"Join {i + 1}/{len(self.config.sources)}: "
                f"{source.join_type.value.upper()} JOIN with node {source.node_id} "
                f"({len(source_df)} rows) on {key_pairs}"
            )

            try:
                result = pd.merge(
                    result,
                    source_df,
                    left_on=left_keys,
                    right_on=right_keys,
                    how=source.join_type.value,
                    suffixes=self.config.suffixes,
                )
                logger.info(f"  -> Result: {len(result)} rows")

            except Exception as ex:
                raise TransformerException(
                    f"Join failed at step {i + 1} (node {source.node_id}): {ex}",
                    transform_type="join",
                    details={
                        "step": i + 1,
                        "source_node_id": source.node_id,
                        "join_type": source.join_type.value,
                        "left_keys": left_keys,
                        "right_keys": right_keys,
                    },
                ) from ex

        logger.success(
            f"Join completed: {len(self.config.sources) + 1} "
            f"sources -> {len(result)} rows"
        )
        return result
