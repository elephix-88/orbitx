# Workflow Node Connection Rules — Engineering Task Breakdown

**Sprint theme:** Connection validation across all three layers
**Sprint goal:** Users cannot draw an invalid edge in the canvas, and if they try to execute a structurally invalid workflow the server rejects it with a clear error message.

**Finalized decisions:**
- Validate on execute only — NOT on create/update
- Defer Dagster topological_sort refactor — keep existing `topological_sort()` and `count_parents()`, just add a validation call at the top of `build_workflow_job()`
- When a connection is blocked in UI, show WHY (toast/tooltip)

---

## Dependencies Graph

```
DATA-1 (ClassVar on Pydantic models)
  |
  +-> DATA-2 (workflow_rules.py + networkx)
        |
        +-> BE-1 (WorkflowStructureError exception)
        |     |
        |     +-> BE-2 (wire validation into execute_workflow())
        |           |
        |           +-> BE-3 (handle WorkflowStructureError in API route)
        |                     |
        |                     +-> FE-3 (parse 422 response, show error toast)
        |
        +-> DATA-3 (wire validation into build_workflow_job())

FE-1 (connectionRules.ts) --------> FE-2 (wire into ReactFlowCanvas)
  (no backend dependency)                 |
  (parallel with all DATA tasks)          +-> FE-4 (blocked-connection tooltip)

FE-5 (WorkflowValidation.tsx enhancements) -- fully independent, start immediately
```

**Sequencing summary:**
- DATA-1 must complete before DATA-2
- DATA-2 must complete before BE-1, BE-2, BE-3, DATA-3
- BE-1 must complete before BE-2
- BE-2 must complete before BE-3
- BE-3 must complete before FE-3
- FE-1 must complete before FE-2
- FE-2 must complete before FE-4
- FE-5 is fully independent

---

## Sprint Status

| Task | Engineer | Status | Blocked by | QA Retries |
|------|----------|--------|------------|------------|
| DATA-1: Add ClassVar port constraints to Pydantic models | Data | Pending | -- | 0 |
| DATA-2: Create workflow_rules.py with NetworkX validation | Data | Pending | DATA-1 | 0 |
| DATA-3: Wire validation into build_workflow_job() | Data | Pending | DATA-2 | 0 |
| BE-1: Add WorkflowStructureError exception class | Backend | Pending | DATA-2 | 0 |
| BE-2: Wire validation into execute_workflow() | Backend | Pending | BE-1 | 0 |
| BE-3: Handle WorkflowStructureError in API route | Backend | Pending | BE-2 | 0 |
| FE-1: Create connectionRules.ts | Frontend | Pending | -- | 0 |
| FE-2: Wire isValidConnection into ReactFlowCanvas | Frontend | Pending | FE-1 | 0 |
| FE-3: Parse 422 response and show error toast on execute | Frontend | Pending | BE-3 | 0 |
| FE-4: Blocked-connection rejection tooltip | Frontend | Pending | FE-2 | 0 |
| FE-5: Enhance WorkflowValidation.tsx with connection rules | Frontend | Pending | -- | 0 |

---

## HANDOFF POINTS

```
HANDOFF A: DATA-2 -> Backend
  From: Data Engineer
  To: Backend Engineer
  Delivered: common/common/model/workflow_rules.py
  Key info: validate_workflow_structure(nodes, connections) returns WorkflowValidationResult
            WorkflowValidationResult.is_valid: bool
            WorkflowValidationResult.errors: list[ConnectionValidationError]
            ConnectionValidationError.message: str, ConnectionValidationError.error_type: str
  Next step: Import validate_workflow_structure in server/server/services/workflow.py

HANDOFF B: BE-3 -> Frontend
  From: Backend Engineer
  To: Frontend Engineer
  Delivered: WorkflowStructureError raises HTTP 422 with body:
             {
               "detail": {
                 "error": "Workflow structure is invalid",
                 "details": "<semicolon-separated error messages>",
                 "validation_errors": [
                   {"error_type": "...", "message": "..."}
                 ]
               }
             }
  Key info: HTTP status 422. "detail.error" has the summary. "detail.validation_errors" has the list.
  Next step: In useWorkflowExecution.ts, catch response.status === 422 and show notify.error()
```

---

---

# DATA ENGINEER TASKS

---

## DATA-1: Add ClassVar port constraints to BaseNode and all subclasses

**Assigned to:** Data Engineer
**Package:** `common/`
**Blocked by:** Nothing — start immediately
**Blocks:** DATA-2
**Estimated time:** 1.5 hours

### Objective
Give each Pydantic node class a self-describing set of port constraint constants so validation logic can read constraints from the class itself instead of a separate lookup table.

### Context
File: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/common/common/model/workflow.py`

Current `BaseNode` (lines 47-50):
```python
class BaseNode(BaseModel):
    node_instance_id: int
    node_type: str
    display_name: str | None = None
```

Node subclasses: `FacebookAdsNode`, `GoogleAdsNode`, `TikTokAdsNode`, `LineAdsNode`, `ShopeeAdsNode`, `GA4Node`, `S3SourceNode` (sources), `SQLTransformNode`, `RenameTransformNode`, `JoinTransformNode`, `UnifyTransformNode` (transforms), `MySQLDestinationNode`, `BigQueryDestinationNode`, `GoogleSheetsDestinationNode` (destinations), `GenericNode`.

`ClassVar` fields are NOT serialized by Pydantic — they will not appear in MongoDB documents. This is safe.

### Implementation steps

**Step 1 — Add ClassVar to the typing import**

Line 3 currently reads:
```python
from typing import Any, Literal, Union
```

Change it to:
```python
from typing import Any, ClassVar, Literal, Union
```

**Step 2 — Extend BaseNode with ClassVar constraints**

Replace lines 47-50 (the current `BaseNode` definition) with:

```python
class BaseNode(BaseModel):
    node_instance_id: int
    node_type: str
    display_name: str | None = None

    # Port constraint class variables. NOT serialized by Pydantic.
    # Subclasses override these to declare their own rules.
    minimum_inputs: ClassVar[int] = 0
    maximum_inputs: ClassVar[int | None] = None  # None means unlimited
    allows_multiple_inputs_per_port: ClassVar[bool] = False
    can_have_conditional_outputs: ClassVar[bool] = False
    # Categories this node type is allowed to connect TO.
    # Default: sources and transforms can connect to transforms and destinations.
    allowed_target_categories: ClassVar[set[str]] = {"transform", "destinations"}
```

**Step 3 — Add constraints to source nodes**

All source nodes take zero inputs. Add `maximum_inputs: ClassVar[int] = 0` to each:
`FacebookAdsNode` (line 53), `GoogleAdsNode` (line 58), `TikTokAdsNode` (line 63), `LineAdsNode` (line 68), `ShopeeAdsNode` (line 73), `GA4Node` (line 78), `S3SourceNode` (line 118).

Pattern to follow for each:
```python
class FacebookAdsNode(BaseNode):
    node_id: Literal["facebook_ads"]
    parameters: FacebookAdsConfig
    maximum_inputs: ClassVar[int] = 0
```

**Step 4 — Add constraints to standard transform nodes**

`SQLTransformNode` (line 83), `RenameTransformNode` (line 88), `UnifyTransformNode` (line 98) each take exactly 1 input:

```python
class SQLTransformNode(BaseNode):
    node_id: Literal["sql"]
    parameters: SQLTransformConfig
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
```

Apply the same pattern to `RenameTransformNode` and `UnifyTransformNode`.

**Step 5 — Add constraints to JoinTransformNode**

`JoinTransformNode` (line 93) takes 2 or more inputs with its input port accepting multiple connections:

```python
class JoinTransformNode(BaseNode):
    node_id: Literal["join"]
    parameters: JoinTransformConfig
    minimum_inputs: ClassVar[int] = 2
    maximum_inputs: ClassVar[int | None] = None  # unlimited
    allows_multiple_inputs_per_port: ClassVar[bool] = True
```

**Step 6 — Add constraints to destination nodes**

All destinations take exactly 1 input and have no output (terminal). `BigQueryDestinationNode` gets `can_have_conditional_outputs = True` because of its `pass_through` mode:

```python
class MySQLDestinationNode(BaseNode):
    node_id: Literal["mysql"]
    parameters: MySQLDestinationConfig
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    allowed_target_categories: ClassVar[set[str]] = set()  # terminal


class BigQueryDestinationNode(BaseNode):
    node_id: Literal["bigquery"]
    parameters: BigQueryDestinationConfig
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    allowed_target_categories: ClassVar[set[str]] = set()  # terminal unless pass_through
    can_have_conditional_outputs: ClassVar[bool] = True


class GoogleSheetsDestinationNode(BaseNode):
    node_id: Literal["google_sheet"]
    parameters: GoogleSheetsDestinationConfig
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    allowed_target_categories: ClassVar[set[str]] = set()  # terminal
```

**Step 7 — Leave GenericNode unchanged**

`GenericNode` (line 123) inherits all defaults from `BaseNode` (min=0, max=None, allowed=all). Do not add ClassVars — it must remain permissive for unknown node types.

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/common/common/model/workflow.py`

### Acceptance criteria
- [ ] `ClassVar` added to the `from typing import ...` line
- [ ] `BaseNode` has 5 new ClassVar fields with the defaults documented above
- [ ] Every source subclass has `maximum_inputs: ClassVar[int] = 0`
- [ ] `SQLTransformNode`, `RenameTransformNode`, `UnifyTransformNode` each have `minimum_inputs = 1`, `maximum_inputs = 1`
- [ ] `JoinTransformNode` has `minimum_inputs = 2`, `maximum_inputs = None`, `allows_multiple_inputs_per_port = True`
- [ ] `MySQLDestinationNode` and `GoogleSheetsDestinationNode` have `minimum_inputs = 1`, `maximum_inputs = 1`, `allowed_target_categories = set()`
- [ ] `BigQueryDestinationNode` has the same as above plus `can_have_conditional_outputs = True`
- [ ] `GenericNode` has no new ClassVar fields
- [ ] Smoke tests pass:
  ```bash
  cd common
  uv run python -c "from common.model.workflow import FacebookAdsNode; print(FacebookAdsNode.maximum_inputs)"
  # Expected: 0
  uv run python -c "from common.model.workflow import JoinTransformNode; print(JoinTransformNode.allows_multiple_inputs_per_port)"
  # Expected: True
  uv run python -c "from common.model.workflow import MySQLDestinationNode; print(MySQLDestinationNode.allowed_target_categories)"
  # Expected: set()
  ```

### NOT in scope
- Do not add networkx yet — that is DATA-2
- Do not change the `Node` Union type or any serialization logic
- Do not change `GenericNode`

---

## DATA-2: Create workflow_rules.py with NetworkX graph validation

**Assigned to:** Data Engineer
**Package:** `common/`
**Blocked by:** DATA-1. Do not start until DATA-1 is delivered and confirmed.
**Blocks:** BE-1, BE-2, BE-3, DATA-3
**Estimated time:** 3 hours

### Objective
Create the single source of truth validation function that checks workflow structure: self-loops, duplicate edges, category compatibility, per-node port constraints, and cycles.

### Context
This is a new file. The function is pure — takes nodes and connections, returns a result model. No side effects. No database calls.

NetworkX is not currently in `common/pyproject.toml`. It must be added.

`NodeType` enum (workflow.py line 41): values are `source = "source"`, `transforms = "transform"`, `destinations = "destinations"`. Note `NodeType.transforms.value` is `"transform"` (without s) but `NodeType.destinations.value` is `"destinations"` (with s).

### Implementation steps

**Step 1 — Add networkx to common/pyproject.toml**

Open `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/common/pyproject.toml`.

Current dependencies (lines 7-12):
```toml
dependencies = [
    "pydantic>=2.0",
    "motor>=3.0",
    "loguru>=0.7",
    "pandas>=2.0",
    "dynaconf>=3.2.11",
]
```

Add `"networkx>=3.0"` to the list. Then run:
```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/common
uv sync
```

**Step 2 — Create the new file**

Create `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/common/common/model/workflow_rules.py`.

Write the imports at the top:
```python
import networkx as nx
from pydantic import BaseModel

from common.model.workflow import Connection, Node, NodeType
```

**Step 3 — Write the error and result models**

```python
class ConnectionValidationError(BaseModel):
    error_type: str
    message: str
    node_instance_ids: list[int] = []


class WorkflowValidationResult(BaseModel):
    is_valid: bool
    errors: list[ConnectionValidationError]
```

**Step 4 — Write build_workflow_graph()**

```python
def build_workflow_graph(
    nodes: list[Node], connections: list[Connection]
) -> nx.DiGraph:
    graph = nx.DiGraph()
    for node in nodes:
        graph.add_node(node.node_instance_id, node=node)
    for connection in connections:
        graph.add_edge(connection.from_node, connection.to_node)
    return graph
```

**Step 5 — Write validate_workflow_structure() — 7 checks in order**

The function runs checks sequentially and returns early on first failure batch. This design is intentional: later checks assume earlier ones passed (e.g., cycle detection assumes no dangling references).

```python
def validate_workflow_structure(
    nodes: list[Node], connections: list[Connection]
) -> WorkflowValidationResult:
    errors: list[ConnectionValidationError] = []
    node_ids = {node.node_instance_id for node in nodes}
    node_map: dict[int, Node] = {node.node_instance_id: node for node in nodes}

    # Check 1: Dangling references
    for connection in connections:
        if connection.from_node not in node_ids:
            errors.append(ConnectionValidationError(
                error_type="dangling_reference",
                message=f"Connection references unknown source node {connection.from_node}",
                node_instance_ids=[connection.from_node],
            ))
        if connection.to_node not in node_ids:
            errors.append(ConnectionValidationError(
                error_type="dangling_reference",
                message=f"Connection references unknown target node {connection.to_node}",
                node_instance_ids=[connection.to_node],
            ))
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 2: Self-connections
    for connection in connections:
        if connection.from_node == connection.to_node:
            errors.append(ConnectionValidationError(
                error_type="self_connection",
                message=f"Node {connection.from_node} cannot connect to itself",
                node_instance_ids=[connection.from_node],
            ))
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 3: Duplicate edges
    seen_edges: set[tuple[int, int]] = set()
    for connection in connections:
        edge = (connection.from_node, connection.to_node)
        if edge in seen_edges:
            errors.append(ConnectionValidationError(
                error_type="duplicate_edge",
                message=(
                    f"Duplicate connection from node {connection.from_node} "
                    f"to node {connection.to_node}"
                ),
                node_instance_ids=list(edge),
            ))
        seen_edges.add(edge)
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 4: Category compatibility
    # Destination nodes cannot have outgoing connections (unless conditional outputs allowed).
    # Source nodes cannot connect to other source nodes.
    for connection in connections:
        source_node = node_map[connection.from_node]
        target_node = node_map[connection.to_node]
        allowed_targets = source_node.allowed_target_categories

        if (
            source_node.node_type == NodeType.destinations.value
            and not source_node.can_have_conditional_outputs
        ):
            errors.append(ConnectionValidationError(
                error_type="category_incompatible",
                message=(
                    f"Node {source_node.node_instance_id} (destination) "
                    "cannot have outgoing connections"
                ),
                node_instance_ids=[source_node.node_instance_id, target_node.node_instance_id],
            ))
            continue

        if target_node.node_type not in allowed_targets:
            errors.append(ConnectionValidationError(
                error_type="category_incompatible",
                message=(
                    f"Node {source_node.node_instance_id} ({source_node.node_type}) "
                    f"cannot connect to node {target_node.node_instance_id} ({target_node.node_type})"
                ),
                node_instance_ids=[source_node.node_instance_id, target_node.node_instance_id],
            ))
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 5: Per-node max input constraints
    incoming_count: dict[int, int] = {node_id: 0 for node_id in node_ids}
    for connection in connections:
        incoming_count[connection.to_node] += 1

    for node in nodes:
        count = incoming_count[node.node_instance_id]
        if node.maximum_inputs is not None and count > node.maximum_inputs:
            errors.append(ConnectionValidationError(
                error_type="too_many_inputs",
                message=(
                    f"Node {node.node_instance_id} ({node.node_type}) "
                    f"accepts at most {node.maximum_inputs} input(s) but has {count}"
                ),
                node_instance_ids=[node.node_instance_id],
            ))
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 6: Graph completeness
    has_source = any(node.node_type == NodeType.source.value for node in nodes)
    has_destination = any(node.node_type == NodeType.destinations.value for node in nodes)

    if not has_source:
        errors.append(ConnectionValidationError(
            error_type="missing_source",
            message="Workflow must have at least one source node",
        ))
    if not has_destination:
        errors.append(ConnectionValidationError(
            error_type="missing_destination",
            message="Workflow must have at least one destination node",
        ))
    if errors:
        return WorkflowValidationResult(is_valid=False, errors=errors)

    # Check 7: Cycle detection using NetworkX
    graph = build_workflow_graph(nodes, connections)
    if not nx.is_directed_acyclic_graph(graph):
        cycle = nx.find_cycle(graph)
        cycle_node_ids = list({node_id for edge in cycle for node_id in edge})
        errors.append(ConnectionValidationError(
            error_type="cycle",
            message="Workflow graph contains a cycle",
            node_instance_ids=cycle_node_ids,
        ))
        return WorkflowValidationResult(is_valid=False, errors=errors)

    return WorkflowValidationResult(is_valid=True, errors=[])
```

**Step 6 — Verify the module imports cleanly**

```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/common
uv run python -c "from common.model.workflow_rules import validate_workflow_structure; print('OK')"
```

### Files to create
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/common/common/model/workflow_rules.py`

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/common/pyproject.toml` — add `"networkx>=3.0"` to dependencies

### Acceptance criteria
- [ ] `networkx>=3.0` added to `common/pyproject.toml` and `uv sync` runs without error
- [ ] `workflow_rules.py` exists and imports cleanly with the smoke test above
- [ ] `ConnectionValidationError` and `WorkflowValidationResult` are Pydantic `BaseModel` subclasses
- [ ] `validate_workflow_structure([], [])` returns `is_valid=False` with `missing_source` and `missing_destination` errors
- [ ] A self-connection (from_node == to_node) returns `error_type="self_connection"`
- [ ] A graph with `A->B, B->A` returns `error_type="cycle"`
- [ ] A destination node with 2 incoming connections returns `error_type="too_many_inputs"`
- [ ] A valid workflow (1 source -> 1 destination, correct connections) returns `is_valid=True`

### NOT in scope
- Do not wire this into dagster or server yet — those are DATA-3 and BE-2
- Do not write pytest test files — that is QA scope
- Do not remove the existing `topological_sort()` in `graph_builder.py`

---

## DATA-3: Wire validation into build_workflow_job()

**Assigned to:** Data Engineer
**Package:** `dagster/`
**Blocked by:** DATA-2. Do not start until DATA-2 is delivered and confirmed.
**Blocks:** Nothing
**Estimated time:** 1 hour

### Objective
Add a validation gate at the top of `build_workflow_job()` so Dagster refuses to build an invalid workflow graph, raising a clear ValueError with the validation messages.

### Context
File: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/dagster/dagster_orbitx/graph_builder.py`

`build_workflow_job()` starts at line 64. The existing `topological_sort()` (line 32) and `count_parents()` (line 23) are NOT being removed in this sprint — keep them exactly as they are.

The existing cycle detection inside `topological_sort()` at lines 52-59 raises `ValueError`. The new validation will run first, so `validate_workflow_structure()` catches cycles before `topological_sort()` is ever reached. Both can coexist.

### Implementation steps

**Step 1 — Add import to graph_builder.py**

Current imports end at line 16. Add `validate_workflow_structure` after the `from common.model.workflow import ...` line (line 4):

```python
from common.model.workflow_rules import validate_workflow_structure
```

Keep all existing imports.

**Step 2 — Add validation call at the top of build_workflow_job()**

`build_workflow_job()` starts at line 64. The first line of the function body is currently (line 65):
```python
    incoming_edges: dict[int, list[int]] = {
```

Insert before that line:

```python
def build_workflow_job(workflow: WorkflowData, job_name: str) -> JobDefinition:
    validation = validate_workflow_structure(workflow.nodes, workflow.connections)
    if not validation.is_valid:
        error_messages = "; ".join(error.message for error in validation.errors)
        raise ValueError(
            f"Workflow '{job_name}' has invalid structure: {error_messages}"
        )

    incoming_edges: dict[int, list[int]] = {
        # rest of existing code unchanged
```

**Step 3 — Verify no import errors**

```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/dagster
uv run python -c "from dagster_orbitx.graph_builder import build_workflow_job; print('OK')"
```

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/dagster/dagster_orbitx/graph_builder.py`

### Acceptance criteria
- [ ] `from common.model.workflow_rules import validate_workflow_structure` present in imports
- [ ] `build_workflow_job()` calls `validate_workflow_structure()` as the very first statement in its body (before `incoming_edges` dict)
- [ ] If validation fails, `ValueError` is raised with the error messages joined by `"; "`
- [ ] If validation passes, the rest of the function runs exactly as before
- [ ] The existing `topological_sort()` and `count_parents()` functions remain in the file untouched
- [ ] Import smoke test passes

### NOT in scope
- Do not replace `topological_sort()` with NetworkX — deferred
- Do not change `count_parents()`
- Do not modify any ops files

---

---

# BACKEND ENGINEER TASKS

---

## BE-1: Add WorkflowStructureError exception class

**Assigned to:** Backend Engineer
**Package:** `server/`
**Blocked by:** DATA-2. Do not start until DATA-2 is delivered and confirmed.
**Blocks:** BE-2
**Estimated time:** 30 minutes

### Objective
Add a `WorkflowStructureError` exception that carries the full validation error list and maps to HTTP 422.

### Context
File: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/server/server/services/exceptions.py`

Existing pattern: `ValidationError` (lines 88-98). All exceptions inherit from `OrbitXError` (line 9). The `status_code` class attribute is read by `orbitx_error_handler` in `main.py` (lines 76-82) to set the HTTP response code.

`OrbitXError.__init__` signature (line 14): `def __init__(self, message: str, details: str | None = None)`

The last class in the file is `TokenError` ending at line 111.

### Implementation steps

**Step 1 — Append the new class at the end of exceptions.py**

Add after line 111 (after `TokenError`):

```python
class WorkflowStructureError(OrbitXError):
    """Raised when workflow node connections violate structural rules."""

    status_code = 422

    def __init__(self, errors: list) -> None:
        messages = [error.message for error in errors]
        super().__init__(
            message="Workflow structure is invalid",
            details="; ".join(messages),
        )
        self.validation_errors = errors
```

Note: `errors` is typed as `list` (not `list[ConnectionValidationError]`) to avoid importing `common.model.workflow_rules` into the exceptions module. The caller (BE-2) passes the typed list.

**Step 2 — Verify import**

```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/server
uv run python -c "from server.services.exceptions import WorkflowStructureError; print(WorkflowStructureError.status_code)"
# Expected: 422
```

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/server/server/services/exceptions.py`

### Acceptance criteria
- [ ] `WorkflowStructureError` class added at end of `exceptions.py`
- [ ] `status_code = 422`
- [ ] Constructor accepts `list`, calls `super().__init__()` with `message="Workflow structure is invalid"` and `details` as joined messages
- [ ] `self.validation_errors` stores the original list
- [ ] Import smoke test prints `422`
- [ ] No existing exception classes modified

---

## BE-2: Wire validation into execute_workflow()

**Assigned to:** Backend Engineer
**Package:** `server/`
**Blocked by:** BE-1. Do not start until BE-1 is delivered and confirmed.
**Blocks:** BE-3
**Estimated time:** 1 hour

### Objective
Call `validate_workflow_structure()` inside `execute_workflow()` after fetching the workflow, before launching the Dagster run.

### Context
File: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/server/server/services/workflow.py`

`execute_workflow()` at lines 118-144. Current flow:
1. Line 120: validates `job_id` not empty
2. Lines 124-129: fetches workflow from MongoDB
3. Line 131: raises `WorkflowNotFoundError` if not found
4. Line 133: calls `dagster_client.launch_run()`

New validation call goes between line 131 and 133.

### Implementation steps

**Step 1 — Add imports to workflow.py**

Current import block (lines 1-13). Make two additions:

Add this import:
```python
from common.model.workflow_rules import validate_workflow_structure
```

Add `WorkflowStructureError` to the existing exceptions import block:
```python
from server.services.exceptions import (
    OrbitXError,
    ValidationError,
    WorkflowNotFoundError,
    WorkflowStructureError,
)
```

**Step 2 — Insert validation inside execute_workflow()**

Locate the block between the `WorkflowNotFoundError` check and the `dagster_client.launch_run()` call:

```python
    if not workflow:
        raise WorkflowNotFoundError(job_id)

    run_id = dagster_client.launch_run(
```

Insert the validation between them:

```python
    if not workflow:
        raise WorkflowNotFoundError(job_id)

    validation = validate_workflow_structure(workflow.nodes, workflow.connections)
    if not validation.is_valid:
        raise WorkflowStructureError(validation.errors)

    run_id = dagster_client.launch_run(
```

**Step 3 — Verify imports**

```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/server
uv run python -c "from server.services.workflow import execute_workflow; print('OK')"
```

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/server/server/services/workflow.py`

### Acceptance criteria
- [ ] `from common.model.workflow_rules import validate_workflow_structure` in imports
- [ ] `WorkflowStructureError` in the exceptions import block
- [ ] `validate_workflow_structure(workflow.nodes, workflow.connections)` called inside `execute_workflow()` after the workflow-not-found check and before `dagster_client.launch_run()`
- [ ] If `is_valid` is `False`, `WorkflowStructureError(validation.errors)` is raised
- [ ] `dagster_client.launch_run()` is NOT reached when validation fails
- [ ] `create_new_workflow()` and `update_workflow()` are NOT touched
- [ ] Import smoke test passes

---

## BE-3: Handle WorkflowStructureError in API route

**Assigned to:** Backend Engineer
**Package:** `server/`
**Blocked by:** BE-2. Do not start until BE-2 is delivered and confirmed.
**Blocks:** FE-3
**Estimated time:** 30 minutes

### Objective
Catch `WorkflowStructureError` in the execute endpoint and return a 422 JSON response with the structured error detail the frontend can parse.

### Context
File: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/server/server/api/workflow.py`

`execute_workflow_endpoint` (lines 57-65) currently has no try/except.

The global `orbitx_error_handler` in `main.py` (lines 76-82) already handles `OrbitXError` subclasses and returns `exc.message`. However, it does NOT include `exc.details` or `exc.validation_errors` in the response body. The frontend needs all three fields.

Adding a specific handler in the route overrides the global handler for this endpoint only, giving us full control over the response shape.

### Implementation steps

**Step 1 — Add WorkflowStructureError to imports**

Current line 13 in `workflow.py` (API file):
```python
from server.services.exceptions import WorkflowNotFoundError
```

Change to:
```python
from server.services.exceptions import WorkflowNotFoundError, WorkflowStructureError
```

**Step 2 — Wrap execute_workflow_endpoint with try/except**

Replace the current endpoint (lines 57-65):

```python
@router.post("/execute")
@limiter.limit(settings.rate_limit_expensive)
async def execute_workflow_endpoint(
    request: Request,
    job_request: JobIdRequest,
    _current_user: UserInDB = Depends(get_current_user),
):
    try:
        result = await execute_workflow(job_request.id)
        return result
    except WorkflowStructureError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": error.message,
                "details": error.details,
                "validation_errors": [
                    {"error_type": e.error_type, "message": e.message}
                    for e in error.validation_errors
                ],
            },
        ) from error
```

**Step 3 — Verify the response shape**

A 422 response from this endpoint will have body:
```json
{
  "detail": {
    "error": "Workflow structure is invalid",
    "details": "Node 1 cannot connect to itself",
    "validation_errors": [
      {"error_type": "self_connection", "message": "Node 1 cannot connect to itself"}
    ]
  }
}
```

This is the exact shape FE-3 will parse.

**Step 4 — Verify import**

```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/server
uv run python -c "from server.api.workflow import router; print('OK')"
```

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/server/server/api/workflow.py`

### Acceptance criteria
- [ ] `WorkflowStructureError` imported from `server.services.exceptions`
- [ ] `execute_workflow_endpoint` has try/except catching `WorkflowStructureError`
- [ ] On `WorkflowStructureError`, raises `HTTPException` with `status_code=422`
- [ ] `detail` dict has three keys: `error` (str), `details` (str or None), `validation_errors` (list of dicts)
- [ ] Each item in `validation_errors` has `error_type` and `message` keys
- [ ] All other endpoints in the file are unchanged
- [ ] Import smoke test passes

---

---

# FRONTEND ENGINEER TASKS

---

## FE-1: Create connectionRules.ts

**Assigned to:** Frontend Engineer
**Package:** `web/`
**Blocked by:** Nothing — start immediately (parallel with all DATA tasks)
**Blocks:** FE-2
**Estimated time:** 2 hours

### Objective
Create a pure TypeScript module with O(1) connection validation, called by React Flow on every mouse-drag event.

### Context
New file: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/workflow/connectionRules.ts`

Key types:
- `WorkflowNode` from `web/src/types/workflow.ts` — has `id`, `type` (`'source' | 'transform' | 'destination'`), `definitionId`, `inputs`, `outputs`, `name`, `data`
- `NodeSpec` from `web/src/workflow/node-specs/types.ts` — has `ports: Port[]`, `getDynamicPorts?: (params) => Port[]`
- `Port.io` is `'input' | 'output'`, `Port.multiple` is `boolean | undefined`
- `getNodeSpec(definitionId)` from `web/src/workflow/registry.ts`
- `WorkflowConnection` from `web/src/types/workflow.ts`

Port patterns observed in node specs:
- Source specs (`facebook.ads`, `google.ads`, etc.): ports = `[{ id: 'out', io: 'output' }]` only
- Standard transforms (`transform.sql`, `transform.rename`, `transform.unify`): ports = `[{ id: 'in', io: 'input' }, { id: 'out', io: 'output' }]`
- `transform.join`: ports = `[{ id: 'in', io: 'input', multiple: true }, { id: 'out', io: 'output' }]`
- Destination specs (`dest.mysql`, `dest.googlesheets`): ports = `[{ id: 'in', io: 'input' }]` only
- `dest.bigquery`: default ports = `[{ id: 'in', io: 'input' }]`, but `getDynamicPorts()` adds output when `params.pass_through === true`

### Implementation steps

**Step 1 — Write the imports**

```typescript
import { getNodeSpec } from './registry';
import type { WorkflowNode, WorkflowConnection } from '@/types/workflow';
```

**Step 2 — Define the category-level allowed targets**

```typescript
const ALLOWED_TARGET_CATEGORIES: Record<string, ReadonlySet<string>> = {
  source:      new Set(['transform', 'destination']),
  transform:   new Set(['transform', 'destination']),
  destination: new Set(),  // terminal — no outputs (BigQuery pass_through handled in rule 2)
};
```

**Step 3 — Write getMaxInputs() helper**

```typescript
function getMaxInputs(node: WorkflowNode): number | null {
  const spec = getNodeSpec(node.definitionId);
  if (!spec) return null;  // unknown node type — permissive

  // Use dynamic ports if available (BigQuery pass_through adds output port)
  const ports = spec.getDynamicPorts
    ? spec.getDynamicPorts(node.data)
    : spec.ports;

  const inputPort = ports.find((p) => p.io === 'input');
  if (!inputPort) return 0;        // no input port at all = source node
  if (inputPort.multiple) return null;  // unlimited = join node
  return 1;                        // exactly 1 input
}
```

**Step 4 — Define exported types**

```typescript
export type ConnectionRejectionReason =
  | 'self_connection'
  | 'category_incompatible'
  | 'duplicate_edge'
  | 'target_at_max_inputs'
  | 'source_has_no_output';

export interface ConnectionCheckResult {
  allowed: boolean;
  reason?: ConnectionRejectionReason;
  message?: string;
}
```

**Step 5 — Write isConnectionAllowed()**

```typescript
export function isConnectionAllowed(
  sourceNode: WorkflowNode,
  targetNode: WorkflowNode,
  existingConnections: WorkflowConnection[]
): ConnectionCheckResult {
  // Rule 1: No self-connections
  if (sourceNode.id === targetNode.id) {
    return {
      allowed: false,
      reason: 'self_connection',
      message: 'Cannot connect a node to itself',
    };
  }

  // Rule 2: Source node must have an output port
  const sourceSpec = getNodeSpec(sourceNode.definitionId);
  if (sourceSpec) {
    const sourcePorts = sourceSpec.getDynamicPorts
      ? sourceSpec.getDynamicPorts(sourceNode.data)
      : sourceSpec.ports;
    const hasOutput = sourcePorts.some((p) => p.io === 'output');
    if (!hasOutput) {
      return {
        allowed: false,
        reason: 'source_has_no_output',
        message: `${sourceNode.name} has no output port`,
      };
    }
  }

  // Rule 3: Category compatibility
  const allowedTargets = ALLOWED_TARGET_CATEGORIES[sourceNode.type];
  if (allowedTargets !== undefined && !allowedTargets.has(targetNode.type)) {
    return {
      allowed: false,
      reason: 'category_incompatible',
      message: `${sourceNode.type} nodes cannot connect to ${targetNode.type} nodes`,
    };
  }

  // Rule 4: No duplicate edges
  const alreadyConnected = existingConnections.some(
    (c) => c.sourceNodeId === sourceNode.id && c.targetNodeId === targetNode.id
  );
  if (alreadyConnected) {
    return {
      allowed: false,
      reason: 'duplicate_edge',
      message: 'These nodes are already connected',
    };
  }

  // Rule 5: Target node max inputs
  const maxInputs = getMaxInputs(targetNode);
  if (maxInputs !== null) {
    const currentInputCount = existingConnections.filter(
      (c) => c.targetNodeId === targetNode.id
    ).length;
    if (currentInputCount >= maxInputs) {
      return {
        allowed: false,
        reason: 'target_at_max_inputs',
        message: `${targetNode.name} already has the maximum number of inputs (${maxInputs})`,
      };
    }
  }

  return { allowed: true };
}
```

**Step 6 — Write getRejectionMessage() convenience export**

Used by FE-4 for the toast message:

```typescript
export function getRejectionMessage(
  sourceNode: WorkflowNode,
  targetNode: WorkflowNode,
  existingConnections: WorkflowConnection[]
): string | undefined {
  const result = isConnectionAllowed(sourceNode, targetNode, existingConnections);
  return result.allowed ? undefined : result.message;
}
```

**Step 7 — Verify TypeScript compiles**

```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web
npx tsc --noEmit 2>&1 | head -30
```

### Files to create
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/workflow/connectionRules.ts`

### Acceptance criteria
- [ ] File exports `isConnectionAllowed`, `getRejectionMessage`, `ConnectionCheckResult`, `ConnectionRejectionReason`
- [ ] Source node to source node: `allowed: false`, `reason: 'category_incompatible'`
- [ ] Source node to destination: `allowed: true`
- [ ] Duplicate edge (same source+target already connected): `allowed: false`, `reason: 'duplicate_edge'`
- [ ] Second edge to SQL transform (which already has 1 input): `allowed: false`, `reason: 'target_at_max_inputs'`
- [ ] Self-connection: `allowed: false`, `reason: 'self_connection'`
- [ ] Destination to anything: `allowed: false`, `reason: 'source_has_no_output'` OR `reason: 'category_incompatible'` (either is acceptable)
- [ ] TypeScript compiles with no new errors

### NOT in scope
- Do not wire into React Flow yet — that is FE-2
- Do not add cycle detection — server-side only
- Do not import from any server/common packages

---

## FE-2: Wire isValidConnection into ReactFlowCanvas

**Assigned to:** Frontend Engineer
**Package:** `web/`
**Blocked by:** FE-1. Do not start until FE-1 is delivered and confirmed.
**Blocks:** FE-4
**Estimated time:** 1 hour

### Objective
Pass a validation callback to React Flow so invalid edges are visually blocked (cursor changes, edge won't snap to handle) during drag operations.

### Context
File: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/components/workflow/reactflow/ReactFlowCanvas.tsx`

`<ReactFlow>` component is at line 474. Currently has `onConnect={handleConnect}` but no `isValidConnection` prop.

React Flow's `isValidConnection` prop: `(connection: Connection) => boolean`. Called on every mouse move during drag. Returns `false` = blocked cursor + edge won't snap. Must be fast.

`Connection` type from `@xyflow/react` (already imported at line 8): `{ source: string | null, target: string | null, sourceHandle: string | null, targetHandle: string | null }`.

`workflowNodes` and `workflowConnections` are already in scope (lines 108-110).

### Implementation steps

**Step 1 — Add import to ReactFlowCanvas.tsx**

After line 24 (`import { validateWorkflow, type NodeValidationResult } from '../WorkflowValidation';`):

```typescript
import { isConnectionAllowed } from '@/workflow/connectionRules';
```

**Step 2 — Write handleIsValidConnection callback**

Add inside `ReactFlowCanvasInner`, after `handleConnect` ends (approximately after line 271):

```typescript
const handleIsValidConnection = useCallback(
  (connection: Connection): boolean => {
    if (!connection.source || !connection.target) return false;
    const sourceNode = workflowNodes.find((n) => n.id === connection.source);
    const targetNode = workflowNodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;
    return isConnectionAllowed(sourceNode, targetNode, workflowConnections).allowed;
  },
  [workflowNodes, workflowConnections]
);
```

**Step 3 — Add the prop to ReactFlow JSX**

The `<ReactFlow>` at line 474. Add `isValidConnection` on the line after `onConnect`:

```tsx
onConnect={handleConnect}
isValidConnection={handleIsValidConnection}
```

**Step 4 — Verify TypeScript compiles**

```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web
npx tsc --noEmit 2>&1 | head -30
```

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/components/workflow/reactflow/ReactFlowCanvas.tsx`

### Acceptance criteria
- [ ] `isConnectionAllowed` imported from `@/workflow/connectionRules`
- [ ] `handleIsValidConnection` callback defined, memoized with `useCallback`, depends on `[workflowNodes, workflowConnections]`
- [ ] `<ReactFlow>` has `isValidConnection={handleIsValidConnection}` prop
- [ ] Dragging source -> source shows blocked cursor
- [ ] Dragging source -> destination snaps and creates edge
- [ ] Dragging second input to SQL transform (1 already connected) shows blocked cursor
- [ ] TypeScript compiles with no new errors

### NOT in scope
- Do not show a toast here — blocked cursor is the drag-time feedback
- Toast on blocked drop is FE-4

---

## FE-3: Parse 422 response and show error toast on execute

**Assigned to:** Frontend Engineer
**Package:** `web/`
**Blocked by:** BE-3. Do not start until BE-3 is delivered and confirmed.
**Blocks:** Nothing
**Estimated time:** 1 hour

### Objective
When the server returns HTTP 422 on execute, surface the specific validation error messages in a notification instead of a generic "Unknown error."

### Context
File: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/hooks/useWorkflowExecution.ts`

The `handleExecute` catch block (lines 56-64) currently:
```typescript
} catch (err) {
  console.error('Failed to execute workflow:', err);
  notify.error('Execute failed', err instanceof Error ? err.message : 'Unknown error');
  setTriggering(false);
  setExecuting(false);
}
```

The 422 response body from BE-3:
```json
{
  "detail": {
    "error": "Workflow structure is invalid",
    "details": "...",
    "validation_errors": [{"error_type": "...", "message": "..."}]
  }
}
```

**Before writing any code: read `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/services/workflowApiService.ts`** and find `executeWorkflow()`. Note exactly what it throws on a 4xx response — whether it throws an `Error` with a string message, or an object with the response body attached.

### Implementation steps

**Step 1 — Read workflowApiService.ts and identify what executeWorkflow throws**

Open the file and find the `executeWorkflow` method. Two common patterns:
- Pattern A: `throw new Error(response.statusText)` or `throw new Error(data.error)` — the catch gets an `Error` instance
- Pattern B: `throw data` or `throw response` — the catch gets the raw response object

Note which pattern is used. If Pattern A: the raw 422 detail is lost and you need to update the service. If Pattern B: the catch already has access to `detail.validation_errors`.

**Step 2 — If Pattern A: update workflowApiService.ts to preserve the response body**

If the service currently discards the response body on error, change it to attach the body:
```typescript
// Instead of: throw new Error(data.error)
// Do:
const error = new Error(data.error || 'Request failed') as Error & { detail?: unknown };
error.detail = data.detail || data;
throw error;
```

**Step 3 — Add type guard in useWorkflowExecution.ts**

Add before the `handleExecute` function:

```typescript
interface WorkflowValidationError {
  error_type: string;
  message: string;
}

interface WorkflowStructureErrorBody {
  error: string;
  details?: string;
  validation_errors: WorkflowValidationError[];
}

function isWorkflowStructureErrorBody(value: unknown): value is WorkflowStructureErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'validation_errors' in value &&
    Array.isArray((value as WorkflowStructureErrorBody).validation_errors)
  );
}
```

**Step 4 — Update the catch block**

```typescript
} catch (err) {
  console.error('Failed to execute workflow:', err);

  // Extract detail from the error — shape depends on how workflowApiService throws
  const detail =
    (err as any)?.detail ||
    (err instanceof Error ? null : err);

  if (isWorkflowStructureErrorBody(detail)) {
    const messages = detail.validation_errors.map((e) => e.message).join('\n');
    notify.error(
      'Workflow structure is invalid',
      messages || detail.details || 'Fix node connections before running'
    );
  } else {
    notify.error(
      'Execute failed',
      err instanceof Error ? err.message : 'Unknown error'
    );
  }

  setTriggering(false);
  setExecuting(false);
}
```

**Step 5 — Verify TypeScript compiles**

```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web
npx tsc --noEmit 2>&1 | head -30
```

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/hooks/useWorkflowExecution.ts`
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/services/workflowApiService.ts` (only if Step 1 reveals the service discards the 422 body)

### Acceptance criteria
- [ ] `WorkflowValidationError`, `WorkflowStructureErrorBody` interfaces defined in `useWorkflowExecution.ts`
- [ ] `isWorkflowStructureErrorBody()` type guard defined
- [ ] When server returns 422 with `validation_errors`, `notify.error()` is called with title `'Workflow structure is invalid'` and messages as the body
- [ ] When server returns any other error, behavior is unchanged
- [ ] TypeScript compiles with no new errors
- [ ] Manual test: trigger a 422 by connecting a destination to a destination, saving, then clicking Run — notification shows specific reason not "Unknown error"

### NOT in scope
- Do not change the Toolbar component
- Do not change `workflowApiService.executeWorkflow()` unless it discards the 422 body

---

## FE-4: Blocked-connection rejection tooltip

**Assigned to:** Frontend Engineer
**Package:** `web/`
**Blocked by:** FE-2. Do not start until FE-2 is delivered and confirmed.
**Blocks:** Nothing
**Estimated time:** 1.5 hours

### Objective
When the user drops a blocked edge onto a target node, show a `notify.warning()` toast explaining why the connection was rejected.

### Context
File: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/components/workflow/reactflow/ReactFlowCanvas.tsx`

React Flow does NOT fire `onConnect` for rejected connections. The built-in events available:
- `onConnectStart`: fires when user starts dragging from a handle, receives `{ nodeId, handleId, handleType }`
- `onConnectEnd`: fires when user releases mouse after dragging, regardless of whether connection succeeded

Strategy: track whether the most recent drag resulted in a successful `onConnect` call (via a ref). If `onConnectEnd` fires and no connection was made, and the mouse is over a node, call `getRejectionMessage()` and show the toast.

`useNotification` is NOT currently imported in ReactFlowCanvas.tsx. It must be added.

### Implementation steps

**Step 1 — Add imports**

After line 27 (existing imports), add:
```typescript
import { useNotification } from '@/hooks/useNotification';
import { getRejectionMessage } from '@/workflow/connectionRules';
```

**Step 2 — Add hook and refs inside ReactFlowCanvasInner**

After the existing `useRef` and `useState` declarations (around line 119):
```typescript
const { notify } = useNotification();
const pendingConnectionSourceRef = useRef<string | null>(null);
const connectionSucceededRef = useRef<boolean>(false);
```

**Step 3 — Add onConnectStart handler**

After `handleIsValidConnection` (the callback added in FE-2):
```typescript
const handleConnectStart = useCallback(
  (_event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null }) => {
    pendingConnectionSourceRef.current = params.nodeId;
    connectionSucceededRef.current = false;
  },
  []
);
```

**Step 4 — Modify handleConnect to mark success**

In the existing `handleConnect` callback (line 256), add `connectionSucceededRef.current = true` as the very first line:

```typescript
const handleConnect = useCallback(
  (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    connectionSucceededRef.current = true;  // ADD THIS LINE FIRST
    // rest unchanged
    const newConnection: WorkflowConnection = { ... };
    onWorkflowConnectionsChange((prev) => [...prev, newConnection]);
  },
  [onWorkflowConnectionsChange]
);
```

**Step 5 — Add onConnectEnd handler**

```typescript
const handleConnectEnd = useCallback(
  (event: MouseEvent | TouchEvent) => {
    if (connectionSucceededRef.current) {
      // Connection succeeded, no rejection to report
      pendingConnectionSourceRef.current = null;
      connectionSucceededRef.current = false;
      return;
    }

    const sourceNodeId = pendingConnectionSourceRef.current;
    if (!sourceNodeId) return;

    // Find which node the mouse landed on
    const targetElement = (event.target as Element)?.closest('[data-id]');
    const targetNodeId = targetElement?.getAttribute('data-id');

    if (targetNodeId && targetNodeId !== sourceNodeId) {
      const sourceNode = workflowNodes.find((n) => n.id === sourceNodeId);
      const targetNode = workflowNodes.find((n) => n.id === targetNodeId);

      if (sourceNode && targetNode) {
        const message = getRejectionMessage(sourceNode, targetNode, workflowConnections);
        if (message) {
          notify.warning('Connection not allowed', message);
        }
      }
    }

    pendingConnectionSourceRef.current = null;
    connectionSucceededRef.current = false;
  },
  [workflowNodes, workflowConnections, notify]
);
```

**Step 6 — Wire onConnectStart and onConnectEnd into ReactFlow JSX**

In `<ReactFlow>` at line 474, add alongside the existing `onConnect`:
```tsx
onConnect={handleConnect}
isValidConnection={handleIsValidConnection}
onConnectStart={handleConnectStart}
onConnectEnd={handleConnectEnd}
```

**Step 7 — Manual test**

Start dev server. Drag from a source node and release on another source node. A `warning` toast should appear: "Connection not allowed" with reason. If the user drops on empty canvas (no `data-id` attribute), no toast should appear.

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/components/workflow/reactflow/ReactFlowCanvas.tsx`

### Acceptance criteria
- [ ] `useNotification` and `getRejectionMessage` imported
- [ ] `notify`, `pendingConnectionSourceRef`, `connectionSucceededRef` defined inside `ReactFlowCanvasInner`
- [ ] `handleConnectStart` sets `pendingConnectionSourceRef` and resets `connectionSucceededRef`
- [ ] `handleConnect` sets `connectionSucceededRef.current = true` as first operation
- [ ] `handleConnectEnd` shows `notify.warning()` with rejection reason when connection was blocked
- [ ] `<ReactFlow>` has `onConnectStart` and `onConnectEnd` props
- [ ] Dragging source -> source and releasing on source node shows warning toast
- [ ] Valid connection: no warning toast
- [ ] Drop on empty canvas: no warning toast
- [ ] TypeScript compiles with no new errors

### NOT in scope
- Do not add tooltip decorations to the handle elements
- Do not add animation to rejected edge attempts

---

## FE-5: Enhance WorkflowValidation.tsx with connection rule checks

**Assigned to:** Frontend Engineer
**Package:** `web/`
**Blocked by:** Nothing — fully parallel, start immediately
**Blocks:** Nothing
**Estimated time:** 1.5 hours

### Objective
Update `WorkflowValidation.tsx` so the validation panel shows specific messages about illegal connection types, not just missing connections.

### Context
File: `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/components/workflow/WorkflowValidation.tsx`

Current `validateNodeConnections()` (lines 183-226) only checks connectivity:
- "Source not connected to any destination" (line 197)
- "Destination has no data source" (line 203)
- "Transform has no input/output" (lines 212-222)

These check whether connections EXIST. The new check will verify whether existing connections are VALID per the connection rules. These are complementary — both are needed.

The loop in `validateWorkflow()` at lines 348-360 where all issues are merged:
```typescript
for (const node of nodes) {
  const configIssues = validateNodeConfiguration(node);
  const connectionIssues = validateNodeConnections(node, connections, nodes);
  const allIssues = [...configIssues, ...connectionIssues];
```

### Implementation steps

**Step 1 — Add import**

After line 5 (`import { getNodeSpec } from '@/workflow/registry';`):
```typescript
import { isConnectionAllowed } from '@/workflow/connectionRules';
```

**Step 2 — Add findIllegalIncomingConnections() helper**

Add this function after `validateNodeConnections()` ends (after line 226):

```typescript
/**
 * Find connections INTO this node that violate connection rules.
 * Distinct from validateNodeConnections which checks whether connections exist at all.
 */
function findIllegalIncomingConnections(
  node: WorkflowNode,
  connections: WorkflowConnection[],
  allNodes: WorkflowNode[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const incomingConnections = connections.filter((c) => c.targetNodeId === node.id);

  for (const connection of incomingConnections) {
    const sourceNode = allNodes.find((n) => n.id === connection.sourceNodeId);
    if (!sourceNode) continue;

    const check = isConnectionAllowed(sourceNode, node, connections);
    if (!check.allowed && check.message) {
      issues.push({
        type: 'error',
        message: check.message,
      });
    }
  }

  return issues;
}
```

**Step 3 — Add the new check to the validateWorkflow() loop**

Find the loop in `validateWorkflow()` at approximately line 348:

```typescript
  for (const node of nodes) {
    const configIssues = validateNodeConfiguration(node);
    const connectionIssues = validateNodeConnections(node, connections, nodes);
    const allIssues = [...configIssues, ...connectionIssues];
```

Change it to:

```typescript
  for (const node of nodes) {
    const configIssues = validateNodeConfiguration(node);
    const connectionIssues = validateNodeConnections(node, connections, nodes);
    const illegalConnectionIssues = findIllegalIncomingConnections(node, connections, nodes);
    const allIssues = [...configIssues, ...connectionIssues, ...illegalConnectionIssues];
```

**Step 4 — Also update getNodeValidation() at line 388**

`getNodeValidation()` does its own per-node check independently of `validateWorkflow()`. Update it the same way:

```typescript
export function getNodeValidation(
  node: WorkflowNode,
  connections: WorkflowConnection[],
  allNodes: WorkflowNode[]
): NodeValidationResult {
  const configIssues = validateNodeConfiguration(node);
  const connectionIssues = validateNodeConnections(node, connections, allNodes);
  const illegalConnectionIssues = findIllegalIncomingConnections(node, connections, allNodes);
  const allIssues = [...configIssues, ...connectionIssues, ...illegalConnectionIssues];
  const status = determineNodeStatus(allIssues, node);
  // rest unchanged
```

**Step 5 — Verify TypeScript compiles**

```bash
cd /Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web
npx tsc --noEmit 2>&1 | head -30
```

### Files to modify
- `/Users/natthapon.sri/Desktop/NSR/elephix/orbitx/orbitx-monorepo/web/src/components/workflow/WorkflowValidation.tsx`

### Acceptance criteria
- [ ] `isConnectionAllowed` imported from `@/workflow/connectionRules`
- [ ] `findIllegalIncomingConnections()` function defined (private, not exported)
- [ ] `validateWorkflow()` loop includes `illegalConnectionIssues` in `allIssues`
- [ ] `getNodeValidation()` also includes `illegalConnectionIssues` in `allIssues`
- [ ] A node with a source -> source illegal incoming connection shows `type: 'error'` with the specific rejection message in its validation issues
- [ ] The existing "Destination node has no data source connected" (line 203) behavior is unchanged
- [ ] `ValidationBanner`, `NodeValidationIndicator`, `ValidationSummary` components are NOT modified
- [ ] TypeScript compiles with no new errors

### NOT in scope
- Do not add cycle detection to the frontend validation panel
- Do not change any of the three exported UI components
- Do not change `determineNodeStatus()` or `hasUserConfiguration()`

---

## Appendix: Connection Rule Matrix

```
FROM type      TO type         Allowed?  Reason on rejection
-------------------------------------------------------------------
source         source          NO        "source nodes cannot connect to source nodes"
source         transform       YES       --
source         destination     YES       --
transform      source          NO        "transform nodes cannot connect to source nodes"
transform      transform       YES       --
transform      destination     YES       --
destination    anything        NO        "has no output port" (no output port in spec)
bigquery*      transform       YES*      only when pass_through=true in node.data
bigquery*      destination     YES*      same condition
-------------------------------------------------------------------

Per-node max inputs (from ClassVar):
-------------------------------------------------------------------
All source nodes                  0 inputs (maximum_inputs = 0)
sql, rename, unify transforms     1 input  (maximum_inputs = 1)
join transform                    unlimited (maximum_inputs = None)
All destination nodes             1 input  (maximum_inputs = 1)
-------------------------------------------------------------------
```
