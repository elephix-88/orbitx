# Branch Review: feat/redesign-web — Cleanup Items

## Clean Areas (no action needed)

- **Deleted file imports** — All 30+ deleted files have zero remaining imports. Clean migration.
- **New files** — All new services, components, and utilities are actually imported and used. Nothing dead.
- **Orchestration refactor** — Old `engine/workflow.py` (496 lines) was cleanly split into the orchestration layer. No duplication with the old code.
- **Unused imports** — No significant unused imports found across server/engine.

---

## Issues Found

### 1. Duplicate workflow ownership verification (Server)

The same `{"_id": workflow_id, "user_id": user_id}` query pattern is reimplemented in **6 service files** with 3 different function names.

| File                                           | Function                      | Error Handling         |
| ---------------------------------------------- | ----------------------------- | ---------------------- |
| `server/server/services/step_run.py`           | `load_workflow_for_user()`    | raises WorkflowNotFoundError |
| `server/server/services/execution_debug.py`    | `verify_workflow_ownership()` | raises WorkflowNotFoundError |
| `server/server/services/error_workflow.py`     | `load_workflow()`             | returns None           |
| `server/server/services/execution_delivery.py` | inline query (2 places)       | returns None + logs    |
| `server/server/services/execution_history.py`  | inline query                  | returns empty list     |
| `server/server/services/workflow_field.py`     | inline query (3 places)       | raises WorkflowNotFoundError |

**Impact Assessment:**

- **Blast radius:** ~21 API endpoints across 6 services
- **Risk: MEDIUM-HIGH** — There are **two distinct error handling strategies**:
  - **Strict** (raise on miss): step_run, execution_debug, workflow_field
  - **Graceful** (return None): error_workflow, execution_delivery, execution_history
- **Cannot use a single function** — Need two variants:
  - `get_user_workflow(workflow_id) -> WorkflowData` (raises on miss)
  - `find_user_workflow(workflow_id) -> WorkflowData | None` (returns None)
- `workflow_field.py` uses `update_one()` match_count check (different pattern) — must stay separate
- **Testing:** 9 test files cover these services. All must pass after refactor.

**Recommendation:** Create two shared functions. Migrate strict callers first, then graceful callers. Leave `workflow_field.py` as-is (different pattern).

### 2. Inconsistent fetch pattern (Web)

`executionHistoryService.ts` and `authService.ts` use raw `fetch()` while 11 other services extend `BaseApiService`.

**Impact Assessment:**

- **executionHistoryService — SAFE to migrate (Risk: LOW)**
  - Pure data service, no auth dependencies
  - 4 components import it (DashboardPage, WorkflowBuilderPage, ExecutionLogPanel, ExecutionHistoryModal)
  - Same public interface after migration, zero breaking changes

- **authService — DO NOT migrate (Risk: CRITICAL)**
  - **Circular dependency:** `BaseApiService` → `fetchClient` → `authService.getAuthHeader()` / `authService.refreshToken()`
  - If `authService` extends `BaseApiService`, `refreshToken()` would call `fetchClient` which calls `refreshToken()` again → infinite loop
  - Auth endpoints have intentionally different error semantics (silent logout, 401 retry fallback)
  - Current raw `fetch()` usage is correct by design

**Recommendation:** Migrate only `executionHistoryService`. Leave `authService` as-is.

### 3. Root-level markdown files

AI-generated planning docs committed to repo root (~2,700+ lines).

**Impact Assessment:**

- **Risk: ZERO** — None referenced in code, config, Docker, or CI/CD
- **Exception: `STYLE_GUIDE.md`** is referenced in `CLAUDE.md` line 76 ("see STYLE_GUIDE.md"). However, `STYLE_GUIDE.md` is already deleted locally (shown in git status) — so the CLAUDE.md reference is already broken.
- Only 6 of the 10 files actually exist on disk: `AUDIT.md`, `CHANGELOG.md`, `COMPETITIVE_STRATEGY.md`, `GO_TO_MARKET.md`, `PRODUCT_ROADMAP.md`, `UX_UI_IMPROVEMENTS.md`
- The other 4 (`FRONTEND_IMPROVEMENTS_SUMMARY.md`, `PRODUCTION_READINESS.md`, `QUICK_WINS_SUMMARY.md`, `STYLE_GUIDE.md`) are already deleted

**Recommendation:** Delete the remaining 6 files. Update CLAUDE.md to remove the STYLE_GUIDE.md reference.

### 4. Unused exception types (Engine)

`engine/engine/exceptions.py` defines `ConfigurationException` (line 48) and `WorkflowExecutionException` (~line 206).

**Impact Assessment:**

- **Risk: ZERO** — Only appear in `engine/tests/test_exceptions.py` (test-only). Never imported, raised, or caught in production code.
- Remove the exceptions and their test cases.

### 5. Duplicate `ColumnInfo` model (Server)

Identical definition in `server/server/services/preview.py` and `server/server/models/pin.py`.

**Impact Assessment:**

- **Risk: ZERO** — Same 2-field model (`name: str`, `data_type: str`). `preview.py` doesn't import anything from `pin.py` currently.
- Simple one-line change: replace class definition with import.

---

## Action Plan (priority order)

| # | Action | Risk | Effort | Endpoints Affected |
|---|--------|------|--------|--------------------|
| 1 | Delete 6 root .md files + fix CLAUDE.md reference | Zero | 5 min | 0 |
| 2 | Remove unused exceptions + their tests | Zero | 5 min | 0 |
| 3 | Dedupe `ColumnInfo` in preview.py | Zero | 2 min | 0 |
| 4 | Migrate `executionHistoryService` to `BaseApiService` | Low | 30 min | 0 (same interface) |
| 5 | Consolidate workflow ownership (two functions) | Medium-High | 2-3 hrs | ~21 endpoints |

Items 1-3 are safe to do immediately. Item 4 is low risk. Item 5 requires careful testing.
