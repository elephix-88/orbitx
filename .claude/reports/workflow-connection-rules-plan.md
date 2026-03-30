# Plan: Workflow Node Connection Rules

## Context

OrbitX's workflow builder currently has **almost zero connection validation**. Users can wire any node to any node, save invalid workflows, and only discover failures at runtime — often silently. The rules are implicit: scattered across React Flow handle definitions, `parent_ids[0]` assumptions in `graph_builder.py`, and a hand-rolled Kahn's algorithm in topological sort. This plan adds a proper connection rule system across all three layers (common → server/dagster → web) with a single source of truth.

## Connection Rules

```
FROM → TO        Source   Transform   Destination
─────────────────────────────────────────────────
Source             ✗         ✓           ✓
Transform          ✗         ✓           ✓
Destination        ✗         ✗*          ✗*

* Unless BigQuery with pass_through=true → gets 1 output
```

**Per-node constraints:**

| Node | Min Inputs | Max Inputs | Multiple Per Port | Notes |
|------|-----------|-----------|-------------------|-------|
| All sources | 0 | 0 | - | Produces data only |
| sql, rename, column_editor, unify | 1 | 1 | No | Single upstream |
| join | 2 | unlimited | Yes | Multi-source merge |
| All destinations | 1 | 1 | No | Consumes data |
| bigquery (pass_through) | 1 | 1 | No | Conditional output |

**Graph-level rules:**
- No self-connections
- No cycles
- No duplicate edges
- Must have >=1 source and >=1 destination

---

## Architecture: Validation Flow

```
┌──────────────────────────────────────────────────────────┐
│  COMMON (Single Source of Truth)                         │
│  common/common/model/workflow.py                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ BaseNode has ClassVar port constraints             │  │
│  │ Each subclass defines its own rules                │  │
│  │ Category rules derived from NodeType               │  │
│  │ NetworkX for graph operations                      │  │
│  │ validate_workflow_structure() — pure function      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────┬──────────────────────┬────────────────────────┘
           │                      │
     ┌─────▼──────┐        ┌─────▼──────┐
     │  SERVER    │        │  DAGSTER   │
     │  validate  │        │  validate  │
     │  on save   │        │  on build  │
     │  → 422     │        │  → error   │
     └────────────┘        └────────────┘

┌──────────────────────────────────────────────────────────┐
│  WEB (TypeScript mirror for real-time UX)                │
│  web/src/workflow/connectionRules.ts                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Rules derived from NodeSpec ports + category       │  │
│  │ isConnectionAllowed() — O(1), no API calls         │  │
│  │ ReactFlow isValidConnection callback (built-in)    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Port constraints live on the Pydantic node classes — no separate lookup tables

Instead of maintaining a dict of rules, each node class declares its own constraints via `ClassVar`:

```python
class BaseNode(BaseModel):
    node_instance_id: int
    node_type: str
    display_name: str | None = None

    # Subclasses override these
    minimum_inputs: ClassVar[int] = 0
    maximum_inputs: ClassVar[int | None] = None
    allows_multiple_inputs_per_port: ClassVar[bool] = False
    can_have_conditional_outputs: ClassVar[bool] = False
    # What categories this node can connect TO (default: transforms + destinations)
    allowed_target_categories: ClassVar[set[str]] = {"transform", "destinations"}


# Sources: no inputs, can output to transforms + destinations (inherits default)
class FacebookAdsNode(BaseNode):
    node_id: Literal["facebook_ads"]
    parameters: FacebookAdsConfig
    maximum_inputs: ClassVar[int] = 0


# Standard transforms: exactly 1 input, can output to transforms + destinations (inherits default)
class SQLTransformNode(BaseNode):
    node_id: Literal["sql"]
    parameters: SQLTransformConfig
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1


# Join: 2+ inputs, multiple per port
class JoinTransformNode(BaseNode):
    node_id: Literal["join"]
    parameters: JoinTransformConfig
    minimum_inputs: ClassVar[int] = 2
    allows_multiple_inputs_per_port: ClassVar[bool] = True


# Destinations: exactly 1 input, can't output (override default)
class MySQLDestinationNode(BaseNode):
    node_id: Literal["mysql"]
    parameters: MySQLDestinationConfig
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    allowed_target_categories: ClassVar[set[str]] = set()  # dead end


class BigQueryDestinationNode(BaseNode):
    node_id: Literal["bigquery"]
    parameters: BigQueryDestinationConfig
    minimum_inputs: ClassVar[int] = 1
    maximum_inputs: ClassVar[int] = 1
    allowed_target_categories: ClassVar[set[str]] = set()  # dead end (unless pass_through)
    can_have_conditional_outputs: ClassVar[bool] = True
```

Adding a new node type? Just set `ClassVar` values on the class. No separate file to update. Sources and transforms inherit `allowed_target_categories = {"transform", "destinations"}` from `BaseNode`. Destinations override it to `set()` (empty).

### 2. NetworkX replaces hand-rolled graph algorithms

Add `networkx` as a dependency to `common/`. Use it for:
- **Cycle detection**: `nx.is_directed_acyclic_graph(graph)`
- **Topological sort**: `nx.topological_sort(graph)` — replaces the Kahn's algorithm in `graph_builder.py`
- **Self-loop detection**: `nx.selfloop_edges(graph)`
- **Graph building**: `nx.DiGraph()` from nodes + connections

This also simplifies `dagster/dagster_orbitx/graph_builder.py` — the existing `topological_sort()` function can be replaced with NetworkX.

### 3. Category rules live on the Pydantic classes too

No separate matrix. `BaseNode.allowed_target_categories` defaults to `{"transform", "destinations"}`. Destination subclasses override to `set()`. The validation function just reads `node.allowed_target_categories` from each instance.

### 4. React Flow's built-in `isValidConnection` — already available, just unused

No custom library needed on the web side. React Flow's `<ReactFlow isValidConnection={fn}>` prop handles the UX (cursor change, edge blocking). We just provide the validation function.

---

## Implementation

### Phase 1: Common Layer — Pydantic + NetworkX

**Add dependency: `networkx` to `common/pyproject.toml`**

**Modify: `common/common/model/workflow.py`**

Add `ClassVar` port constraints to `BaseNode` and each subclass (as shown above). No structural change to the models — `ClassVar` fields are not serialized, won't affect MongoDB.

**New file: `common/common/model/workflow_rules.py`**

Small file with:

```python
import networkx as nx
from common.model.workflow import BaseNode, Connection, Node, NodeType


class ConnectionValidationError(BaseModel):
    error_type: str
    message: str
    node_instance_ids: list[int] = []


class WorkflowValidationResult(BaseModel):
    is_valid: bool
    errors: list[ConnectionValidationError]


def build_workflow_graph(
    nodes: list[Node], connections: list[Connection]
) -> nx.DiGraph:
    """Build a NetworkX directed graph from workflow nodes and connections."""
    graph = nx.DiGraph()
    for node in nodes:
        graph.add_node(node.node_instance_id, node=node)
    for connection in connections:
        graph.add_edge(connection.from_node, connection.to_node)
    return graph


def validate_workflow_structure(
    nodes: list[Node], connections: list[Connection]
) -> WorkflowValidationResult:
    """Pure validation function. Checks:
    1. Self-connections — nx.selfloop_edges()
    2. Duplicate edges — set comparison
    3. Dangling references — from_node/to_node exist in nodes
    4. Category compatibility — source→source forbidden, etc.
    5. Port constraints — node.minimum_inputs / maximum_inputs
    6. Graph completeness — >=1 source, >=1 destination
    7. Cycles — nx.is_directed_acyclic_graph()
    """
```

**Modify: `dagster/dagster_orbitx/graph_builder.py`**

- Replace `topological_sort()` with `nx.topological_sort(graph)` via the new `build_workflow_graph()`
- Add `validate_workflow_structure()` call at top of `build_workflow_job()`
- Remove hand-rolled `topological_sort()` and `count_parents()` functions
- NetworkX handles all graph operations now

```python
from common.model.workflow_rules import (
    build_workflow_graph,
    validate_workflow_structure,
)
import networkx as nx

def build_workflow_job(workflow: WorkflowData, job_name: str) -> JobDefinition:
    # Validate structure
    validation = validate_workflow_structure(workflow.nodes, workflow.connections)
    if not validation.is_valid:
        error_messages = "; ".join(e.message for e in validation.errors)
        raise ValueError(f"Workflow '{job_name}' is invalid: {error_messages}")

    # Build graph and sort
    graph = build_workflow_graph(workflow.nodes, workflow.connections)
    sorted_nodes = [
        graph.nodes[node_id]["node"]
        for node_id in nx.topological_sort(graph)
    ]

    # Parent lookup via NetworkX
    # graph.predecessors(node_id) replaces incoming_edges dict
    ...
```

---

### Phase 2: Server Layer — Reject Before Save

**Modify: `server/server/services/exceptions.py`**

Add `WorkflowStructureError`:

```python
class WorkflowStructureError(OrbitXError):
    status_code = 422

    def __init__(self, errors: list):
        messages = [error.message for error in errors]
        super().__init__(
            message="Workflow structure is invalid",
            details="; ".join(messages),
        )
        self.validation_errors = errors
```

**Modify: `server/server/services/workflow.py`**

Add validation to `create_new_workflow()`, `update_workflow()`, and `execute_workflow()`:

```python
from common.model.workflow_rules import validate_workflow_structure
from server.services.exceptions import WorkflowStructureError

# Before MongoDB insert/update:
result = validate_workflow_structure(workflow_data.nodes, workflow_data.connections)
if not result.is_valid:
    raise WorkflowStructureError(result.errors)
```

**Important:** `get_workflow_builder()` does NOT validate — existing workflows in MongoDB may violate new rules. Validation only on write/execute paths.

---

### Phase 3: Web Layer — Real-Time Blocking

**New file: `web/src/workflow/connectionRules.ts`**

Derives rules from existing `NodeSpec` ports and category — no duplication of the Python constants. The rules are inherent in the node spec definitions:

```typescript
import { getNodeSpec, nodeRegistry } from './registry';
import type { WorkflowNode, WorkflowConnection } from '@/types/workflow';

/**
 * Category-level connection rules.
 * Derived from node types — sources produce, destinations consume.
 */
const ALLOWED_TARGET_CATEGORIES: Record<string, Set<string>> = {
  source:      new Set(['transform', 'destination']),
  transform:   new Set(['transform', 'destination']),
  destination: new Set(),  // no outputs unless conditional
};

/**
 * Get max allowed inputs for a node based on its spec ports.
 */
function getMaxInputs(node: WorkflowNode): number | null {
  const spec = getNodeSpec(node.definitionId);
  if (!spec) return null;  // unknown node, permissive
  const inputPort = spec.ports.find(p => p.io === 'input');
  if (!inputPort) return 0;  // no input port = source
  if (inputPort.multiple) return null;  // unlimited (join)
  return 1;  // single input
}

/**
 * O(1) check — called by React Flow on every mouse move during drag.
 */
export function isConnectionAllowed(
  sourceNode: WorkflowNode,
  targetNode: WorkflowNode,
  existingConnections: WorkflowConnection[],
): { allowed: boolean; reason?: string } {
  // 1. Self-connection
  if (sourceNode.id === targetNode.id)
    return { allowed: false, reason: 'Cannot connect a node to itself' };

  // 2. Category check
  if (!ALLOWED_TARGET_CATEGORIES[sourceNode.type]?.has(targetNode.type))
    return { allowed: false, reason: `${sourceNode.type} cannot connect to ${targetNode.type}` };

  // 3. Duplicate edge
  const duplicate = existingConnections.some(
    c => c.sourceNodeId === sourceNode.id && c.targetNodeId === targetNode.id
  );
  if (duplicate)
    return { allowed: false, reason: 'Connection already exists' };

  // 4. Max inputs check
  const maxInputs = getMaxInputs(targetNode);
  if (maxInputs !== null) {
    const currentInputs = existingConnections.filter(
      c => c.targetNodeId === targetNode.id
    ).length;
    if (currentInputs >= maxInputs)
      return { allowed: false, reason: `${targetNode.name} already has maximum inputs` };
  }

  return { allowed: true };
}
```

**Modify: `web/src/components/workflow/reactflow/ReactFlowCanvas.tsx`**

Wire `isValidConnection` into React Flow:

```typescript
import { isConnectionAllowed } from '@/workflow/connectionRules';

const handleIsValidConnection = useCallback((connection: Connection) => {
  const sourceNode = workflowNodes.find(n => n.id === connection.source);
  const targetNode = workflowNodes.find(n => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;
  return isConnectionAllowed(sourceNode, targetNode, workflowConnections).allowed;
}, [workflowNodes, workflowConnections]);

// In JSX:
<ReactFlow isValidConnection={handleIsValidConnection} ... >
```

**Modify: `web/src/components/workflow/WorkflowValidation.tsx`**

Enhance `validateNodeConnections()` to use the shared rules for:
- Input count validation per node
- Category violation detection
- More specific error messages

---

## Files Summary

| File | Action | Layer |
|------|--------|-------|
| `common/pyproject.toml` | ADD networkx dependency | Common |
| `common/common/model/workflow.py` | ADD ClassVar constraints to BaseNode + subclasses | Common |
| `common/common/model/workflow_rules.py` | NEW — validation function using NetworkX | Common |
| `dagster/dagster_orbitx/graph_builder.py` | REFACTOR — replace hand-rolled graph ops with NetworkX | Dagster |
| `server/server/services/exceptions.py` | ADD WorkflowStructureError class | Server |
| `server/server/services/workflow.py` | ADD validation calls on create/update/execute | Server |
| `web/src/workflow/connectionRules.ts` | NEW — derives rules from NodeSpec, fast validation | Web |
| `web/src/components/workflow/reactflow/ReactFlowCanvas.tsx` | ADD isValidConnection callback | Web |
| `web/src/components/workflow/WorkflowValidation.tsx` | ENHANCE with shared rules | Web |

## Backward Compatibility

- `ClassVar` fields are NOT serialized — no impact on MongoDB documents
- Existing workflows are NOT re-validated on read
- Validation only triggers on create/update/execute
- `GenericNode` (unknown node_id) gets permissive defaults from `BaseNode`

## Verification

1. **Unit test the pure function** — create workflows with known invalid structures, verify errors
2. **Test server rejection** — POST invalid workflow to `/api/workflows`, expect 422
3. **Test Dagster build** — invalid workflow raises ValueError with clear message
4. **Test web UX** — drag source→source in React Flow, cursor shows "not allowed"
5. **Test backward compat** — existing workflows load and execute without validation errors
6. **Test NetworkX integration** — verify topological sort matches previous behavior
