from typing import Any

from engine.interfaces.factory import TransformerFactory
from engine.interfaces.node import Transformer
from engine.node.transformers.column_editor import ColumnEditorTransformer
from engine.node.transformers.join import JoinTransformer
from engine.node.transformers.rename import RenameTransformer
from engine.node.transformers.sql import SQLTransformer
from engine.node.transformers.unify import UnifyTransformer
from common.model.transform import (
    ColumnEditorConfig,
    JoinTransformConfig,
    RenameTransformConfig,
    SQLTransformConfig,
    TransformType,
    UnifyTransformConfig,
)

_CONFIG_CLASSES: dict[str, type[Any]] = {
    TransformType.SQL.value: SQLTransformConfig,
    TransformType.RENAME.value: RenameTransformConfig,
    TransformType.JOIN.value: JoinTransformConfig,
    TransformType.COLUMN_EDITOR.value: ColumnEditorConfig,
    TransformType.UNIFY.value: UnifyTransformConfig,
}


class TransformFactory(TransformerFactory):
    """Factory backed by a registry of transformer implementations."""

    _DEFAULT_REGISTRY: dict[str, type[Transformer]] = {
        TransformType.SQL.value: SQLTransformer,
        TransformType.RENAME.value: RenameTransformer,
        TransformType.JOIN.value: JoinTransformer,
        TransformType.COLUMN_EDITOR.value: ColumnEditorTransformer,
        TransformType.UNIFY.value: UnifyTransformer,
    }

    def __init__(self, registry: dict[str, type[Transformer]] | None = None) -> None:
        self._registry = dict(registry or self._DEFAULT_REGISTRY)

    def register(self, node_type: str, transformer_cls: type[Transformer]) -> None:
        self._registry[node_type] = transformer_cls

    def create_transformer(self, config: Any, node_id: str) -> Transformer:
        config_cls = _CONFIG_CLASSES.get(node_id)
        if config_cls and isinstance(config, dict):
            config = config_cls(**config)

        try:
            transformer_cls = self._registry[node_id]
        except KeyError as exc:
            raise ValueError(f"Unknown transform type: {node_id}") from exc
        return transformer_cls(config)
