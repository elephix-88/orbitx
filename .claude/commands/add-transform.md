# Add Transform

You are a senior data engineer adding a new transformer to OrbitX. You will scaffold the transformer class, config model, factory registration, frontend node-spec, and editor — the full vertical.

## Input

The user will provide:
- Transform name (e.g., "Filter", "Aggregate", "Deduplicate")
- What it does (e.g., "filters rows based on conditions", "groups and aggregates data")
- Whether it modifies column names/types (determines if `update_field_schemas` is needed)

## Before Writing Any Code

Read these files first using `read_file`:

```
engine/engine/interfaces/node.py                            ← Transformer ABC
engine/engine/interfaces/factory.py                         ← RegistryFactory base
engine/engine/factories/transform.py                        ← TransformFactory + config mapping
engine/engine/orchestration/tasks.py                        ← SCHEMA_UPDATE_TYPES constant
common/common/model/transform.py                            ← TransformType enum + existing configs
```

Then read ONE existing transformer similar to what you're building:

- Simple data filter: `engine/engine/node/transformers/sql.py`
- Column manipulation: `engine/engine/node/transformers/rename.py` or `column_editor.py`
- Multi-input: `engine/engine/node/transformers/join.py`
- Schema-aware: `engine/engine/node/transformers/unify.py`

## File Generation

### 1. Config Model: `common/common/model/transform.py`

Add to the existing file:

```python
# Add to TransformType enum
class TransformType(Enum):
    # ... existing types ...
    {UPPER_NAME} = "{snake_name}"

# Add config model
class {Name}TransformConfig(BaseModel):
    # Define config fields based on what the transform needs
    pass
```

**Config rules:**
- Use Pydantic BaseModel — no dataclass
- Use `Field(default_factory=list)` for mutable defaults
- Only add validators if business logic truly requires them
- Keep models simple — let Pydantic handle type coercion

### 2. Transformer Class: `engine/engine/node/transformers/{snake_name}.py`

```python
import pandas as pd
from loguru import logger

from common.model.transform import {Name}TransformConfig
from engine.exceptions import TransformerException
from engine.interfaces.node import Transformer


class {Name}Transformer(Transformer):

    def __init__(self, config: {Name}TransformConfig) -> None:
        self.config = config

    async def transform(self, data: pd.DataFrame) -> pd.DataFrame:
        try:
            logger.info(
                "Running {name} transform on {rows} rows",
                rows=len(data),
            )

            # IMPLEMENT TRANSFORM LOGIC HERE
            # Use DuckDB for SQL operations:
            #   import duckdb
            #   conn = duckdb.connect()
            #   conn.register("source", data)
            #   result = conn.execute("SELECT ...").df()
            #
            # Or use pandas directly for simple operations:
            #   result = data[data["column"] > threshold]

            result = data  # Replace with actual logic

            logger.info(
                "{name} transform complete: {input} → {output} rows",
                input=len(data),
                output=len(result),
            )
            return result

        except Exception as error:
            raise TransformerException(
                message=f"{Name} transform failed: {error}",
                details={"config": self.config.model_dump()},
            ) from error
```

**If the transformer modifies column names or types**, add `update_field_schemas`:

```python
    def update_field_schemas(self, schemas: list | None) -> list | None:
        """Update field schemas to reflect changes made by this transform."""
        if not schemas:
            return schemas

        updated = []
        for schema in schemas:
            # Example: rename
            # if schema.field in self.config.rename_mapping:
            #     schema = schema.model_copy(update={"field": new_name})

            # Example: drop
            # if schema.field in self.config.drop_columns:
            #     continue

            # Example: add new
            # updated.append(FieldSchema(field="new_col", data_type="string"))

            updated.append(schema)
        return updated
```

**Transformer rules:**
- `transform()` is always `async` even if the work is synchronous
- Input is `pd.DataFrame`, output is `pd.DataFrame`
- Wrap all errors in `TransformerException` with details dict
- Use loguru for logging — never print() or stdlib logging
- Use DuckDB for complex SQL operations (type-safe, fast)
- Use pandas for simple operations (filter, drop, rename)
- Never silently drop rows — log the input/output count

**For routers (IF/Switch style)** that split data into multiple paths:
- Return `dict[str, pd.DataFrame]` instead of `pd.DataFrame`
- Don't inherit from `Transformer` — use a separate class
- See `conditional_router.py` and `switch_router.py` for examples

### 3. Factory Registration: `engine/engine/factories/transform.py`

Add three things:

```python
# 1. Import the transformer
from engine.node.transformers.{snake_name} import {Name}Transformer

# 2. Add to _DEFAULT_REGISTRY
_DEFAULT_REGISTRY: dict[str, type[Transformer]] = {
    # ... existing entries ...
    TransformType.{UPPER_NAME}.value: {Name}Transformer,
}

# 3. Add to _CONFIG_CLASSES
_CONFIG_CLASSES: dict[str, type] = {
    # ... existing entries ...
    TransformType.{UPPER_NAME}.value: {Name}TransformConfig,
}
```

### 4. Schema Update Registration (if applicable)

If the transformer modifies column names or types, add to `SCHEMA_UPDATE_TYPES` in `engine/engine/orchestration/tasks.py`:

```python
SCHEMA_UPDATE_TYPES = {
    TransformType.RENAME.value,
    TransformType.COLUMN_EDITOR.value,
    TransformType.UNIFY.value,
    TransformType.{UPPER_NAME}.value,  # ← add this
}
```

**Only add this if the transformer implements `update_field_schemas()`.** If it doesn't touch column names or types, skip this step.

### 5. Frontend Node Spec: `web/src/workflow/node-specs/transform.{name}.ts`

```typescript
import { z } from 'zod';
import { lazy } from 'react';
import type { NodeSpec } from './types';

const {Name}Editor = lazy(() => import('@/nodes/Editors/transform/{Name}Editor'));

export const {camelName}TransformSpec: NodeSpec = {
  typeId: 'transform.{name}',
  displayName: '{Display Name}',
  category: 'TRANSFORM',
  icon: '{LucideIconName}',
  color: '#F59E0B',
  ports: [
    { id: 'in', name: 'Input', io: 'input', dataType: 'records' },
    { id: 'out', name: 'Output', io: 'output', dataType: 'records' },
  ],
  defaults: {
    // Match config model defaults
  },
  paramsSchema: z.object({
    // Zod schema matching config
  }),
  ui: { editor: {Name}Editor },
  adapters: {
    toBackend: (p) => ({
      node_id: '{snake_name}',
      node_type: 'transform',
      parameters: {
        // Map frontend params to backend config fields
      },
    }),
    fromBackend: (_nodeId, _nodeType, parameters) => ({
      typeId: 'transform.{name}',
      params: {
        // Map backend config back to frontend params with safe defaults
      },
    }),
  },
};
```

### 6. Frontend Editor: `web/src/nodes/Editors/transform/{Name}Editor.tsx`

Follow the exact editor pattern from `/add-frontend-node` skill. Key points:
- Use `useWorkflowStore()` if you need upstream column info
- Call `getUpstreamColumnNames()` for column-aware transforms
- Support both compact and full modes
- Use callback refs for onChange/onValidate

### 7. Registry Update: `web/src/workflow/registry.ts`

Add import and entry to `nodeRegistry`.

### 8. Test File: `engine/tests/transform/test_{snake_name}_transformer.py`

```python
import pandas as pd
import pytest

from common.model.transform import {Name}TransformConfig
from engine.node.transformers.{snake_name} import {Name}Transformer


class Test{Name}Transformer:

    @pytest.mark.asyncio
    async def test_basic_transform(self):
        """Test basic {name} transformation."""
        df = pd.DataFrame({
            "col_a": [1, 2, 3],
            "col_b": ["a", "b", "c"],
        })
        config = {Name}TransformConfig(
            # ... config for this test case
        )
        transformer = {Name}Transformer(config)

        result = await transformer.transform(df)

        assert len(result) > 0
        # Add specific assertions based on expected behavior

    @pytest.mark.asyncio
    async def test_empty_dataframe(self):
        """Test transformation on empty DataFrame."""
        df = pd.DataFrame(columns=["col_a", "col_b"])
        config = {Name}TransformConfig()
        transformer = {Name}Transformer(config)

        result = await transformer.transform(df)

        assert len(result) == 0
        assert list(result.columns) == ["col_a", "col_b"]

    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test that invalid input raises TransformerException."""
        from engine.exceptions import TransformerException

        df = pd.DataFrame({"col_a": [1, 2, 3]})
        config = {Name}TransformConfig(
            # ... config that references non-existent column
        )
        transformer = {Name}Transformer(config)

        with pytest.raises(TransformerException):
            await transformer.transform(df)
```

**If `update_field_schemas` is implemented, add schema tests:**

```python
    def test_update_field_schemas(self):
        """Test schema propagation after transform."""
        from pydantic import BaseModel

        class MockSchema(BaseModel):
            field: str
            data_type: str

        schemas = [
            MockSchema(field="col_a", data_type="integer"),
            MockSchema(field="col_b", data_type="string"),
        ]
        config = {Name}TransformConfig(
            # ... config that modifies schemas
        )
        transformer = {Name}Transformer(config)

        result = transformer.update_field_schemas(schemas)

        # Assert schema changes match expected
        assert result is not None
```

## Checklist Before Finishing

- [ ] Config model added to `common/common/model/transform.py` (enum + Pydantic model)
- [ ] Transformer class created with `async transform()` that handles errors properly
- [ ] `update_field_schemas()` implemented IF the transform modifies column names/types
- [ ] Factory registration: `_DEFAULT_REGISTRY` + `_CONFIG_CLASSES` in `transform.py`
- [ ] `SCHEMA_UPDATE_TYPES` updated in `tasks.py` IF schema propagation is needed
- [ ] Frontend node-spec created with correct adapters
- [ ] Frontend editor created with compact/full mode support
- [ ] Registry updated in `web/src/workflow/registry.ts`
- [ ] Test file with at least: basic test, empty DataFrame test, error test
- [ ] Schema test added if `update_field_schemas` is implemented
- [ ] Run `uv run pytest engine/tests/transform/test_{name}*.py -v` to verify tests pass
- [ ] Run `uv run ruff check engine/ common/` to verify lint passes
- [ ] Run `cd web && npx tsc --noEmit` to verify frontend compiles

## Code Style Rules

- No underscore prefix on methods or variables
- No abbreviations
- Specific exceptions only — wrap in `TransformerException`
- loguru for logging
- Pydantic BaseModel for config — no dataclass
- DuckDB for SQL operations, pandas for simple operations
- All `transform()` methods are async
