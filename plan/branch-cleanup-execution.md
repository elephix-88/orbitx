# Branch Cleanup: feat/redesign-web — All 5 Items

## Context

Branch review found 5 cleanup items: dead md files, unused exceptions, duplicate model, inconsistent fetch pattern, and duplicate ownership queries. Executing all of them.

---

## Item 1: Delete root .md planning files + fix CLAUDE.md reference

**Risk: ZERO | Effort: 5 min**

Delete these 6 files from repo root:
- `AUDIT.md`
- `CHANGELOG.md`
- `COMPETITIVE_STRATEGY.md`
- `GO_TO_MARKET.md`
- `PRODUCT_ROADMAP.md`
- `UX_UI_IMPROVEMENTS.md`

Fix `CLAUDE.md` line 76: remove "(see STYLE_GUIDE.md)" since STYLE_GUIDE.md is already deleted.

---

## Item 2: Remove unused exceptions + their tests

**Risk: ZERO | Effort: 5 min**

**File:** `engine/engine/exceptions.py`
- Remove `ConfigurationException` (lines 48-51)
- Remove `WorkflowExecutionException` (lines 206-230)

**File:** `engine/tests/test_exceptions.py`
- Remove `TestConfigurationException` class (lines 56-68)
- Remove `TestWorkflowExecutionException` class (lines 155-169)
- Remove both from the import block (lines 3-14)
- Remove both from the `test_exception_can_be_caught_by_base_class` list (lines 231, 237)

---

## Item 3: Dedupe `ColumnInfo` in preview.py

**Risk: ZERO | Effort: 2 min**

**File:** `server/server/services/preview.py`
- Remove the `ColumnInfo` class definition (lines 26-28)
- Add import: `from server.models.pin import ColumnInfo`

---

## Item 4: Migrate `executionHistoryService` to `BaseApiService`

**Risk: LOW | Effort: 30 min**

**File:** `web/src/services/executionHistoryService.ts`

Current: raw `fetch()` with manual error handling.
Target: extend `BaseApiService` with `this.get()`.

**Key behavioral difference to preserve:**
- `getExecutionHistory()` — throws on error (same as BaseApiService 4xx behavior)
- `getDashboardStats()` — returns empty stats on error (need try/catch around `this.get()`)

**DO NOT migrate `authService`** — circular dependency with `fetchClient` would cause infinite recursion on token refresh.

**Consumers (4 files, verify after):**
- `web/src/pages/DashboardPage.tsx`
- `web/src/pages/WorkflowBuilderPage.tsx`
- `web/src/components/workflow/ExecutionLogPanel.tsx`
- `web/src/components/workflow/ExecutionHistoryModal.tsx`

---

## Item 5: Consolidate workflow ownership verification

**Risk: MEDIUM-HIGH | Effort: 2 hrs**

### The Problem

6 services have the same `{"_id": workflow_id, "user_id": user_id}` pattern but with **two different error strategies**:

| Strategy            | Services                                        | Behavior                         |
| ------------------- | ----------------------------------------------- | -------------------------------- |
| **Strict** (raise)  | step_run, execution_debug                       | `raise WorkflowNotFoundError`    |
| **Graceful** (None) | error_workflow, execution_delivery, exec_history | return None / empty list         |

`workflow_field.py` uses `update_one()` match_count — different pattern, leave as-is.

### Solution: Two shared functions

**New file:** `server/server/services/workflow_utils.py`

```python
from common.database.mongodb import find_one
from common.model.workflow import WorkflowData
from server.configs.config import settings
from server.services.exceptions import WorkflowNotFoundError


async def get_user_workflow(workflow_id: str, user_id: str) -> WorkflowData:
    """Load a workflow with ownership check. Raises on miss."""
    workflow = await find_one(
        settings.workflow_collection,
        {"_id": workflow_id, "user_id": user_id},
        WorkflowData,
    )
    if workflow is None:
        raise WorkflowNotFoundError(workflow_id)
    return workflow


async def find_user_workflow(workflow_id: str, user_id: str) -> WorkflowData | None:
    """Load a workflow with ownership check. Returns None on miss."""
    return await find_one(
        settings.workflow_collection,
        {"_id": workflow_id, "user_id": user_id},
        WorkflowData,
    )
```

### Migration map

| File                          | Current                       | Replace with                                |
| ----------------------------- | ----------------------------- | ------------------------------------------- |
| `services/step_run.py`        | `load_workflow_for_user()`    | `get_user_workflow()` — delete local fn     |
| `services/execution_debug.py` | `verify_workflow_ownership()` | `get_user_workflow()` — delete local fn     |
| `services/error_workflow.py`  | `load_workflow()`             | `find_user_workflow()` — delete local fn    |
| `services/execution_delivery` | inline queries (2 places)     | `find_user_workflow()` — replace inline     |
| `services/execution_history`  | inline query                  | `find_user_workflow()` — replace inline     |
| `services/workflow_field.py`  | `update_one()` match check    | **Leave as-is** (different pattern)         |

---

## Verification

1. **Engine tests:** `cd engine && uv run pytest tests/test_exceptions.py -v`
2. **Server tests:** `cd server && uv run pytest -v`
3. **Web build:** `cd web && npm run build` (catches broken imports)
4. **Specific server tests for item 5:**
   - `uv run pytest tests/test_workflow_service.py -v`
   - `uv run pytest tests/test_step_run.py -v`
   - `uv run pytest tests/test_execution_debug.py -v`
   - `uv run pytest tests/test_error_workflow.py -v`
   - `uv run pytest tests/test_execution_history.py -v`
