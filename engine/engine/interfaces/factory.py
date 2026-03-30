from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import Any, TypeVar, cast

from engine.interfaces.node import Extractor, Loader, Transformer

T = TypeVar("T")


class RegistryFactory[T]:
    """Base factory with registry pattern for node creation."""

    _DEFAULT_REGISTRY: dict[str, type[T]] = {}

    def __init__(self, registry: dict[str, type[T]] | None = None) -> None:
        self._registry: dict[str, type[T]] = dict(registry or self._DEFAULT_REGISTRY)

    def register(self, node_type: str, cls: type[T]) -> None:
        self._registry[node_type] = cls

    def _create(self, config: Any, node_id: str, type_name: str) -> T:
        try:
            cls = self._registry[node_id]
        except KeyError as exc:
            raise ValueError(f"Unknown {type_name} type: {node_id}") from exc
        factory_fn = cast(Callable[[Any], T], cls)
        return factory_fn(config)


class ExtractorFactory(RegistryFactory[Extractor], ABC):
    """Factory for building Extractors (Source Nodes)."""

    @abstractmethod
    def create_extractor(self, config: Any, node_id: str) -> Extractor:
        """Create an extractor instance."""
        pass


class TransformerFactory(RegistryFactory[Transformer], ABC):
    """Factory for building Transformers (Transform Nodes)."""

    @abstractmethod
    def create_transformer(self, config: Any, node_id: str) -> Transformer:
        """Create a transformer instance."""
        pass


class LoaderFactory(RegistryFactory[Loader], ABC):
    """Factory for building Loaders (Destination Nodes)."""

    @abstractmethod
    def create_loader(self, config: Any, node_id: str) -> Loader:
        """Create a loader instance."""
        pass
