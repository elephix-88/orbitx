from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from common.model.common import BaseFieldSchema


class Extractor(ABC):
    """Abstract Base Class for Source Node (Extractors)."""

    @abstractmethod
    def __init__(self, config: Any) -> None:
        pass

    @abstractmethod
    async def extract(self, row_limit: int | None = None) -> Any:
        """Extract data from source.

        Args:
            row_limit: When set, stop pagination early after reaching this many rows.
                       Used for lightweight data previews.

        Returns:
            ExtractorResult containing the data
        """
        pass


class Transformer(ABC):
    """Abstract Base Class for Transform Node (Transformers).

    Attributes:
        config: Transformer-specific configuration (set by concrete implementations)
    """

    config: Any  # Concrete transformers set this in __init__

    @abstractmethod
    def __init__(self, config: Any) -> None:
        pass

    @abstractmethod
    async def transform(self, data: Any) -> Any:
        pass

    def update_field_schemas(self, schemas: list[Any] | None) -> list[Any] | None:
        """Update field schemas after transformation.

        Override this method in transformers that modify column names or types.
        Default implementation returns schemas unchanged.

        Args:
            schemas: List of field schemas with field and data_type attributes.

        Returns:
            Updated list of schemas, or None.
        """
        return schemas


class Loader(ABC):
    """Abstract Base Class for Destination Node (Loaders).

    Attributes:
        config: Loader-specific configuration (set by concrete implementations)
        merge_keys: Optional list of column names used as merge keys
                   for UPSERT operations. Set by the workflow runner
                   when propagating primary keys from extractors.
        field_schemas: Optional list of field schemas for type
                      conversion. Set by the workflow runner when
                      propagating from extractors.
    """

    config: Any  # Concrete loaders set this in __init__
    merge_keys: list[str] | None = None
    field_schemas: list[BaseFieldSchema] | None = None
    execution_id: str | None = None
    execution_datetime: datetime | None = None

    @abstractmethod
    def __init__(self, config: Any) -> None:
        pass

    @abstractmethod
    async def load(self, data: Any) -> None:
        pass

    def set_merge_keys(self, keys: list[str] | None) -> None:
        """Set merge keys for UPSERT operations."""
        self.merge_keys = keys

    def set_field_schemas(self, schemas: list[BaseFieldSchema] | None) -> None:
        """Set field schemas for type conversion."""
        self.field_schemas = schemas

    def set_execution_context(
        self, execution_id: str, execution_datetime: datetime
    ) -> None:
        """Set runtime execution context for template substitution."""
        self.execution_id = execution_id
        self.execution_datetime = execution_datetime
