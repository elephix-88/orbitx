# Pre-populate All Nodes as PENDING in ExecutionHistory

## Context

When a user clicks "Run", the frontend sets all canvas nodes to `pending` locally, but the backend creates an `ExecutionHistory` with an **empty `steps` dict**. Nodes only appear in `steps` once the engine starts processing them. This means if the page refreshes mid-execution, nodes that haven't started yet lose their "pending" status — there's no server-side record of what's waiting to run.

**Goal:** Insert all workflow nodes as `PENDING` in the `steps` dict when creating the `ExecutionHistory` document, so the backend is the source of truth from the start.

## Responsibility Split

```
Server  →  INSERT (create ExecutionHistory + all nodes as PENDING)
Engine  →  UPDATE (change PENDING → RUNNING → SUCCESS/FAILED directly in MongoDB)
Prefect →  No changes (just orchestrates tasks, unaware of our status tracking)
```

- **Server** owns creation — one atomic MongoDB write with the full execution state
- **Engine** owns mutation — updates each node's status as it executes via direct MongoDB writes
- **No middleman** — engine writes directly to MongoDB (shared DB), no HTTP calls back to server

## Changes

### 1. Server: Pre-populate steps in `execute_workflow()`

**File:** `server/server/services/workflow.py` (lines 140-149)

Build the `steps` dict from `workflow.nodes` before persisting:

```python
steps = {}
for node in workflow.nodes:
    key = str(node.node_instance_id)
    steps[key] = ExecutionStep(
        node_instance_id=key,
        node_id=node.node_id,
        node_type=node.node_type,
        status=Status.PENDING,
    )
```

Pass `steps=steps` into the `ExecutionHistory(...)` constructor.

**Import needed:** `ExecutionStep` from `common.common.model.execution`

### 2. Frontend: No changes needed

- `syncNodeStatusesFromExecution()` in `ExecutionLogPanel.tsx` already handles status mapping — `"PENDING".toLowerCase()` = `"pending"` which matches the frontend's `NodeStatus` type
- Local pending reset in `useWorkflowExecution.ts` stays for instant UI feedback before first poll

### 3. Engine: No changes needed

- `execute_with_status_tracking()` in `tasks.py` already updates node status (RUNNING → SUCCESS/FAILED) via `persist_node_status()` — this will now overwrite the PENDING status set by server

### 4. Prefect: No changes needed

- Prefect orchestrates task execution order only — status tracking is our own MongoDB system

## Files to modify

| File                                  | Change                                                             |
| ------------------------------------- | ------------------------------------------------------------------ |
| `server/server/services/workflow.py`  | Build `steps` dict from `workflow.nodes`, pass to `ExecutionHistory` |

## Verification

1. Run existing tests: `cd server && uv run pytest tests/test_workflow_service.py -v`
2. Manual: trigger a workflow run, immediately check MongoDB `execution_history` doc — all nodes should appear in `steps` with `status: "PENDING"`
3. Manual: refresh the page during execution — pending nodes should still show pending status from backend data
