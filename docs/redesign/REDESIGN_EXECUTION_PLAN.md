# OrbitX Frontend Redesign — End-to-End Plan

## Context

The OrbitX web app is moving from an indigo-branded interface to a **Light Professional** design system (navy + electric-blue, flat white surfaces, token-based theming, Inter + IBM Plex Sans Thai + JetBrains Mono). The canonical spec is `docs/redesign/full-mockup.html`, which contains 10 page states.

We already have:
- A working app at `web/` with 5 live pages (Dashboard, Workflows, Builder, Connections, Settings) + layout chrome.
- A detailed rollout proposal in `docs/redesign/INTEGRATION_PLAN.md`.
- Phase-by-phase prompts authored by the user covering Foundation, Home, Pipelines, Builder, Runs, Secondary, Cleanup.

The goal is to land the full redesign incrementally across 7 phases, keeping each PR small, avoiding regressions on unmigrated pages, and flagging any backend work that must happen out-of-band. Phase 7 surfaces (Insights / Alerts / Reports) are **out of scope** — they need backend endpoints that don't exist yet.

---

## Execution order

```
Phase 1 (FE foundation) ──► Phase 2 (FE layout chrome) ──► Phase 3 (FE Home)
                │
                └─► B1 (BE workflow enrich) ──────────► Phase 4 (FE Pipelines)
                │
                └─► B2 (BE exec-history filters) ────► Phase 6 (FE Runs)
                │
                └─► B3 (BE connections enrich) ──────► Phase 7 (FE Secondary)

Phase 5 (FE Builder) has no backend dependency — slot in between Phase 3 and Phase 6.

Phase 8 (Cleanup) after everything else lands.
```

Backend phases B1/B2/B3 can run in parallel with each other and with FE Phases 2/3/5. No backend work blocks Phase 1, 2, 3, or 5.

---

## Critical findings from exploration

### Backend gaps that block parts of the spec

| Gap | Blocks | Impact |
|---|---|---|
| `GET /api/workflows` returns only `id, user_id, job_name, schedule_expression, status, created_at, updated_at` | Phase 4 Pipelines table (needs `last_run_at`, `next_run`, `owner_name`, `source_type`, `destination_type`, `token_status`) | **Hard blocker** if we don't want N+1 fetches. User's Phase 4 prompt explicitly says "STOP and file a backend ask". |
| No `workspace_id` / `client` metadata on workflows | Phase 4 "Group by client" | Grouping has nothing to group on. Needs a decision. |
| Execution history endpoints: fixed 30-day lookback, no status/trigger/pipeline filters, no hourly rollup | Phase 3 throughput chart, Phase 6 Runs timeline + filters | Throughput chart can still bucket from raw list client-side. Runs page filters/pagination can't hit backend. |
| Connections: no `token_expires_at`, `scopes`, `used_by_count` exposed | Phase 7 Sources tab columns | Columns render as "—" or soft-fallbacks until backend exposes them. |
| No anomaly/alert/report endpoints | Sections marked Future in Section 9 | Already out of scope. |

### Reusable code we will lean on

- **Hooks**: `useWorkflows`, `useWorkflowExecution`, `useNotification`, `useDeferredLoading`, `useResponsiveLayout`, `useElementSize`, `useSessionTimeout`.
- **Stores**: `authStore` (user name for greeting), `workflowStore` (builder state), `themeStore`.
- **Services**: `executionHistoryService` (list + dashboard stats), `workflowApiService`, `connectionService`, all OAuth services.
- **Components**: existing `Button`, `Card`, `Modal`, `Notification`, `Sheet`, `Skeleton`, `PageLoader` + `components/shared/form/*` — we refactor in place, not rewrite.
- **Tests**: vitest already configured, `tests/setup.ts` in place, jest-dom available.

### Risks to manage

1. **Shadows**: the new `--shadow-*` tokens are flatter than today's `boxShadow.sm/md/lg`. Overwriting will nudge every card in the app. Spec says overwrite; we accept the nudge.
2. **`DashboardPage`** (1,206 lines) has hand-rolled counter animations and hardcoded hex for sparklines. Cleaner to rewrite from scratch than to refactor.
3. **`WorkflowBuilderPage`** (1,126 lines) wraps React Flow with lots of lazy-loaded panels and a debug overlay. Keep the engine + editors; only swap node rendering + chrome.
4. **Existing Tailwind config** already has a nested `text: { primary, secondary, ... }` object. New flat keys `text-1..4` won't collide (different color namespace). Same holds for `line-*`, `bg-page`, etc.
5. **Indigo removal**: `text-primary-500`, `bg-primary-600`, etc. appear across ~40+ files. A codemod pass lives in Phase 8 cleanup, not earlier, to avoid churn mid-redesign.

---

## Phase 1 — Foundation (tokens + fonts + atoms + Button/Card refactor)

### Files to edit
- `web/src/index.css`
  - Replace the top `@import` with the Inter + IBM Plex Sans Thai + JetBrains Mono URL.
  - Add the Light Professional token block at `:root` (keep old `--brand-*`, `--surface-*`, etc. as aliases during migration).
  - Add `:lang(th) { line-height: 1.55; letter-spacing: 0; }`.
  - Add `.font-mono { font-feature-settings: 'tnum'; }`.
  - Update `body` font-family, `font-feature-settings: 'cv11','ss01','ss03'`, smoothing, text-rendering.
  - Add `@keyframes pulse` (1.6s ease-out infinite, opacity + scale) and a `.pulse-ring::after` helper.
  - Existing `prefers-reduced-motion` block already zeroes animation duration — leave it.
- `web/tailwind.config.js`
  - Add flat color keys: `navy`, `blue-primary`, `blue-primary-hover`, `blue-soft`, `blue-border`, `bg-page`, `bg-card`, `bg-row-alt`, `bg-row-hv`, `bg-muted`, `line-1`, `line-2`, `line-soft`, `text-1..4`, `success-bg`, `success-border`, `warning-bg`, `warning-border`, `danger`, `danger-bg`, `danger-border`, `violet`, `violet-bg`, `violet-border`.
  - Update `fontFamily.sans` to prepend `'IBM Plex Sans Thai'`. Add `display` stack = Inter.
  - **Overwrite** `boxShadow.sm/md/lg` to `var(--shadow-sm|md|lg)` per spec. Keep `glow*`/`dark*` keys.
- `web/src/components/shared/Button.tsx`
  - Rewire `primary` variant classes from `.btn-primary` (indigo via CSS var) to explicit `bg-blue-primary hover:bg-blue-primary-hover text-white`.
  - Add `danger` variant: `bg-white text-danger border border-danger-border hover:bg-danger-bg`.
  - Props/API unchanged.
- `web/src/components/shared/Card.tsx`
  - Default variant → `bg-card border border-line-1 rounded-xl shadow-sm`.
  - Add `hoverable` prop → adds `hover:border-line-2 hover:shadow-md transition-[box-shadow,border-color]`.
  - Swap remaining variants (`interactive`, `selected`, `connection`) to new tokens.
- `web/src/App.tsx`
  - Add `/_dev/atoms` route gated by `import.meta.env.DEV`. Public (not wrapped in `ProtectedRoute`) — it's a dev-only playground.

### Files to create
`web/src/components/shared/`:
- `Chip.tsx` + `Chip.test.tsx` — variants `success|warning|danger|blue|violet|soft`. CVA.
- `Dot.tsx` + `Dot.test.tsx` — variants `success|warning|danger|blue|muted`, optional `pulseRing`.
- `Avatar.tsx` + `Avatar.test.tsx` — initials, `size sm|md`, `tone navy|auto`. `auto` uses a 7-color pastel palette keyed off a stable name hash.
- `Sparkline.tsx` + `Sparkline.test.tsx` — 7 bars, heights `0..1`, color via semantic tokens.
- `StatTile.tsx` + `StatTile.test.tsx` — label / value / optional delta. `mono` prop adds `font-mono`.
- `SearchShell.tsx` + `SearchShell.test.tsx` — input + icon + optional kbd hint. `width: full|md|lg`.
- `SegmentedControl.tsx` + `SegmentedControl.test.tsx` — generic `<T extends string>`.
- `Tabs.tsx` + `Tabs.test.tsx` — underline indicator 2px `--blue-primary`. `trailingAction` slot.
- `FlowChip.tsx` + `FlowChip.test.tsx` — `<source> → <destination>` with inline arrow SVG.
- `SelectionBar.tsx` + `SelectionBar.test.tsx` — conditional render (only when `count > 0`).
- `FilterBar.tsx` + `FilterBar.test.tsx` — search + filter pills + groupBy + viewToggle.

`web/src/pages/_dev/`:
- `AtomsPage.tsx` — kitchen sink rendering every variant of every atom.

### Verification
- `pnpm --filter web type-check`
- `pnpm --filter web lint`
- `pnpm --filter web test:run`
- `pnpm --filter web dev` → visit `/_dev/atoms`, eyeball every variant, check console is clean.
- Visit `/dashboard`, `/workflows`, `/connections`, `/settings` → confirm they still render (indigo may linger; that's acceptable for Phase 1).

### Commits (7)
As listed in the user's Phase 1 prompt.

---

## Phase 2 — Layout chrome (Sidebar + Topbar)

Not spec'd in the user's prompts but listed in `INTEGRATION_PLAN.md` §3.3. Treat as a small, separate PR before Phase 3 so Home can land into the new chrome.

### Files to edit
- `web/src/components/Layout.tsx` — delegate to new Sidebar + Topbar.

### Files to create
- `web/src/components/layout/Sidebar.tsx` — fixed 240px on ≥1024px, mobile drawer below. Nav items with `--blue-soft` active state + `--blue-primary` icon. Sections: Workspace, Connect, Intelligence, Settings.
- `web/src/components/layout/Topbar.tsx` — breadcrumb slot · `SearchShell` (⌘K visual hint only) · notifications bell · Feedback link · primary CTA slot.
- Each with a `.test.tsx`.

### Verification
- Every existing page still renders inside the new chrome.
- Active nav item highlights correctly across route changes.
- Reduced-motion respected on any transitions.

### Commits (2)
- `feat(layout): new Sidebar component`
- `feat(layout): new Topbar + Layout delegation`

---

## Backend workstream — Phases B1, B2, B3

These three backend PRs unblock the most data-heavy frontend phases. They can start as soon as Phase 1 is green and run **in parallel** with Phase 2 (layout chrome) and Phase 3 (Home). Phase 4 waits on B1, Phase 6 waits on B2, Phase 7 waits on B3.

Stack: Python 3.13 · FastAPI · MongoDB (Motor) · Pydantic · pytest · dynaconf · loguru. Follow the patterns already in `server/server/` and the global CLAUDE.md coding rules (no underscore-private members, no abbreviations, Pydantic everywhere, loguru only).

### Phase B1 — Workflow list enrichment (blocks Phase 4)

Extend the workflow list response so Pipelines table renders without N+1 fetches, and add a grouping field.

**Files to edit**
- `common/common/model/workflow.py` — add optional `workspace_id: str | None`, `client: str | None` to `Workflow` model.
- `server/server/api/workflow.py` — extend the `WorkflowSummary` (or equivalent) model returned at line ~214. Add:
  - `status: WorkflowStatus` (already present — confirm it rides through)
  - `last_run_at: datetime | None`
  - `last_run_status: 'success' | 'failed' | 'running' | None`
  - `next_run_at: datetime | None` (parse from `schedule_expression` + timezone)
  - `owner_name: str | None` (join against user collection)
  - `source_type: str | None`, `destination_type: str | None` (derived from first extractor + last loader node in `workflow.nodes`)
  - `token_status: 'healthy' | 'expiring' | 'expired' | None` (aggregate of all connections the workflow uses)
  - `workspace_id: str | None` / `client: str | None` (pass-through from model)
- `server/server/services/workflow.py` — extend the list query to enrich in one aggregation pipeline (MongoDB `$lookup` into `execution_history`, `users`, `connections`). Avoid one-by-one queries.

**Files to create**
- `server/server/services/workflow_enrichment.py` — pure helper that takes raw workflow docs + execution summaries + user docs + connection docs and returns the enriched summaries. Unit tests in `tests/services/test_workflow_enrichment.py`.

**Schedule parsing**
- Use `croniter` (add to `server/pyproject.toml` if not present) to compute `next_run_at` from the cron + IANA timezone stored on the workflow.

**Verification**
- `pytest server/tests/services/test_workflow_enrichment.py` — covers every derived field.
- `curl /api/workflows` manual smoke — response includes the new fields.
- Query-count assertion: enriching 500 workflows issues exactly 1 Mongo aggregation call (or ≤ 4 if lookups are split by collection).

**Commits (3)**
- `feat(workflow): add workspace_id/client to Workflow model`
- `feat(workflow): enrich GET /workflows with status, last_run, owner, flow, token_status`
- `test(workflow): enrichment unit tests`

---

### Phase B2 — Execution history filters + hourly rollup (blocks Phase 6)

Extend `GET /api/execution-history` to accept filters and pagination, and add a bucketed rollup endpoint for the timeline.

**Files to edit**
- `server/server/api/execution_history.py`
  - Extend the list endpoint (line ~29–143) to accept query params: `time_range: Literal['24h','7d','30d','custom']`, `start: datetime | None`, `end: datetime | None`, `status: Literal['success','failed','running'] | None`, `pipeline_id: str | None`, `trigger_type: Literal['schedule','manual','webhook'] | None`, `page: int = 1`, `page_size: int = 50`. Response shape: `{ items: [...], total: int, page: int, page_size: int }`.
  - Replace the hardcoded 30-day lookback and 100-item cap.
- `server/server/services/execution_history.py` — implement the filter + paginate logic using a single Mongo aggregation (`$match` → `$sort` → `$facet` for items + total).

**Files to create**
- New endpoint `GET /api/execution-history/rollup`:
  - Params: `bucket: Literal['hour','day','week']`, `range: Literal['24h','7d','30d']`, optional `pipeline_id`.
  - Response: `Array<{ bucket_start: datetime; success: int; failed: int; running: int }>`.
  - Service: `ExecutionHistoryService.rollup(...)` using Mongo `$bucket` or `$dateTrunc`.
- `server/tests/api/test_execution_history_filters.py`, `server/tests/api/test_execution_history_rollup.py` — each filter + bucket path covered with fixtures.

**Verification**
- `pytest server/tests/api/test_execution_history_*.py`.
- Manual: `curl '/api/execution-history?time_range=24h&status=failed&page=1&page_size=20'` and `curl '/api/execution-history/rollup?bucket=hour&range=24h'`.

**Commits (4)**
- `feat(execution): add filters + pagination to history list`
- `feat(execution): add hourly/daily/weekly rollup endpoint`
- `refactor(execution): replace hardcoded lookback with time_range param`
- `test(execution): filter + rollup integration tests`

---

### Phase B3 — Connections enrichment (blocks Phase 7 Sources tab)

Expose token expiry, OAuth scopes, and usage count on the connections list.

**Files to edit**
- `common/common/model/connection.py` (or equivalent location) — add optional fields to `ConnectionItem`: `token_expires_at: datetime | None`, `scopes: list[str] | None`, `used_by_count: int | None`, `token_status: 'healthy' | 'expiring' | 'expired' | None`.
- `server/server/api/connection/connections.py` (line 13–30) — extend the list endpoint to include the new fields.
- `server/server/services/connections.py` (or wherever the connection list is built) — surface `token_expires_at` / `scopes` from the OAuth params blob (varies per service; handle Facebook, Google, TikTok, BigQuery, Google Sheets). Compute `used_by_count` via a `$lookup` into workflows that reference the connection.

**Token-status derivation**
- `healthy` — expires in > 7d or no expiry.
- `expiring` — expires in ≤ 7d.
- `expired` — past expiry.

**Verification**
- `pytest server/tests/api/test_connections_list.py` — every service's token path covered.
- Manual: `curl /api/connections` — token_expires_at/scopes/used_by_count populated for each OAuth connection.

**Commits (2)**
- `feat(connections): expose token_expires_at, scopes, used_by_count`
- `test(connections): enrichment tests`

---

## Phase 3 — Home (Dashboard)

### Approach
Rewrite `DashboardPage.tsx` instead of refactoring — the existing 1,206-line file has too much legacy animation code. Keep imports from `useWorkflows`, `executionHistoryService`, `authStore`.

### Files to create
- `web/src/pages/home/aggregations.ts` — pure functions:
  - `computeKpis(workflows, history, range)` → `{ activePipelines, rowsSynced24h, successfulRuns24h, failedRuns24h, spendCaptured7d }`.
  - `bucketThroughputHourly(history)` → `Array<{ hour: number; rows: number; success: number; failed: number }>`.
  - `deriveNeedsAttention(workflows)` → `Array<{ id, name, reason, status, action }>`.
- `web/src/pages/home/aggregations.test.ts` — 100% coverage.
- `web/src/pages/home/mockAiInsights.ts` — typed stub returning one insight. Marker comment: `// HOME-AI-API-TODO: swap to real endpoint when available`.
- `web/src/components/insights/AIInsightCard.tsx` + test — violet chip, headline, body, primary + ghost buttons.
- `web/src/components/shared/EmptyState.tsx` (if none exists) + test.

### Files to edit
- `web/src/pages/DashboardPage.tsx` — full rewrite to match the Home mockup structure (greeting, time-range segmented, 5 KPIs, 2/3-1/3 grid).

### Data wiring
- Greeting: `authStore.user?.name?.split(' ')[0] ?? 'there'`. Use `สวัสดี <first> 👋` format.
- KPIs + throughput + recent runs: `executionHistoryService.getDashboardStats(...)` (existing) + `useWorkflows()`. All heavy aggregation client-side in `aggregations.ts`.
- Needs Attention: derive from `workflows[]` where `status === 'failed'` or (where available) `token_expires_in_days <= 7`. Real token-expiry data isn't in the model — show failed-status items only for v1, flag `NEEDS-TOKEN-EXPIRY-FIELD` comment.
- AI Insight: `mockAiInsights.ts` returns one hard-coded item.
- Team activity: no endpoint exists → stub 4 items with `// HOME-ACTIVITY-FEED-TODO`.

### Loading / empty / error states
Every card has:
- Loading → `Skeleton` (existing)
- Empty → `EmptyState`
- Error → inline small red text + retry button

### Verification
- `pnpm --filter web test:run` — `aggregations.test.ts` at 100%.
- `pnpm --filter web dev` → /dashboard: layout matches mockup at ≥1280px, time-range switch refetches, no console errors.

### Commits (4)
Per user's Phase 3 prompt.

---

## Phase 4 — Pipelines (densest page)

> **PARKED (2026-04-17):** Phase 4 and its prerequisite **B1** are backlog. Skipped during the initial redesign push; revisit once there's bandwidth to land the backend enrichment PR.
>
> Depends on Phase **B1** (backend enrichment) — see Backend section below.

### Files to create
- `web/src/store/pipelineViewsStore.ts` — Zustand slice with `persist` middleware, storage key `orbitx.pipelineViews.v1`. Stores `savedViews`, `activeViewId`, `search`, `filters`, `groupBy`, `viewMode`, `selectedIds` (Set).
- `web/src/pages/pipelines/groupAndFilter.ts` — pure functions `filterPipelines(...)`, `groupPipelines(...)`, `paginateGroups(...)`. Accept a normalized `Pipeline` type.
- `web/src/pages/pipelines/groupAndFilter.test.ts` — ≥90% coverage.
- `web/src/components/pipelines/PipelineTable.tsx` + test — headless dense table. Uses `Chip`, `Dot`, `FlowChip`, `Sparkline`, `Avatar`. Virtualize body with `@tanstack/react-virtual` (new dep) once row count > 100.
- `web/src/components/pipelines/PipelineGridPlaceholder.tsx` — 6 dummy cards + `// TODO: Phase 7 — grid view`.

### Files to edit
- `web/src/pages/WorkflowsPage.tsx` — new shell: page header with live stats chips, `Tabs` for saved views, `FilterBar`, conditional `SelectionBar`, `PipelineTable` inside a `Card`, pagination footer.
- `web/package.json` — add `@tanstack/react-virtual`.

### Normalized Pipeline type
Because backend gaps exist, introduce a frontend `Pipeline` type that is the shape the table needs and a normalizer `toPipeline(workflow, execSummary)` that fills known fields and leaves optional ones undefined. This lets us ship the UI today and wire in real values as the backend delivers.

### Verification
- Group-by-client expand/collapse works (against normalized type).
- Saved views persist across reloads.
- Selection bar bulk actions toast a confirmation.
- Sparkline pulls 7-day history from `executionHistoryService`.
- `groupAndFilter.test.ts` ≥90% coverage.
- Virtualized body: seed 500 fixture rows in a test and confirm scroll is smooth.

### Commits (5)
Per user's Phase 4 prompt.

---

## Phase 5 — Builder (React Flow restyle)

### Strategy
Keep the React Flow engine, `workflowStore`, editors, preview/logs panels. Replace only the node rendering + canvas chrome + shell typography.

### Files to create
- `web/src/components/builder/NodeCard.tsx` + test — the new React Flow node type. Props exactly as spec'd. Uses `Dot` for status. Pulse-ring when `status === 'running'`.
- `web/src/components/builder/BuilderCanvas.tsx` + test — wraps `<ReactFlow>` with dot-grid bg, floating toolbar, status chip, styled `<MiniMap />`.
- `web/src/components/builder/NodePalette.tsx` + test — left column, grouped Sources/Transforms/Destinations, draggable. Uses React Flow's drag pattern. "+ N more" opens a modal stub with a TODO.

### Files to edit
- `web/src/pages/WorkflowBuilderPage.tsx` — swap chrome only. New header (breadcrumb + name + saved-at + health chip + Edit/Preview/Runs/Settings seg + Pause/Save/Run actions). Three-column layout (220 · flex · 320). Keep lazy-loaded editor panels.
- React Flow `nodeTypes` registration — map every existing node kind to `NodeCard`. Existing editor/drawer children untouched.
- Config panel (right column) — wrap the existing editors in new card chrome; use `.font-mono` for field mapping preview.

### Backend asks
None. All changes are visual.

### Verification
- Load an existing workflow → still opens, runs, saves.
- Zoom / pan / minimap still work.
- Node selection shows 3px `--blue-primary` ring (via `--blue-soft` offset shadow).
- Running node shows pulse-ring (respects reduced motion).
- Typecheck / lint / test green.

### Commits (5)
Per user's Phase 5 prompt.

---

## Phase 6 — Runs (new page)

> Depends on Phase **B2** (execution-history filters + rollup) — see Backend section below.

### Files to create
- `web/src/pages/RunsPage.tsx` — header, seg control, export button, `RunsTimeline`, `FilterBar`, `<Table>`, detail drawer.
- `web/src/pages/runs/runsAggregations.ts` — `bucketByHour`, `bucketByDay`, `bucketByWeek`.
- `web/src/pages/runs/runsAggregations.test.ts` — 100% coverage.
- `web/src/components/runs/RunsTimeline.tsx` + test — 24 stacked bars, divs only, with legend + hover tooltip.
- `web/src/components/runs/RunDetailDrawer.tsx` + test — right-side `Card`, raw JSON + node-level status list.

### Files to edit
- `web/src/App.tsx` — add `/runs` route (ProtectedRoute).

### URL state
Filter + pagination live in search params via `useSearchParams` — deep links work out of the box.

### Verification
- Timeline buckets correctly against a fixed fixture.
- Clicking a row opens the detail drawer.
- Reduced-motion respected on running-row pulse.
- Typecheck / lint / test green.

### Commits (5)
Per user's Phase 6 prompt.

---

## Phase 7 — Connections · Destinations · Settings

### Files to edit
- `web/src/pages/ConnectionsPage.tsx` — add top `Tabs` (Sources | Destinations). Sources view: 4 stat tiles + accounts table + "Available sources" grid. Destinations view: 4 warehouse cards with stats + top-tables list. Keep all OAuth flows untouched.
- `web/src/pages/SettingsPage.tsx` — two-column layout (200px nav + content). Sections: Workspace, Team, Billing, API keys (+ Audit log, Profile, Notifications, Security as stubs). Danger zone at bottom.

### Files to create
- `web/src/components/shared/form/Input.tsx` — if the existing `form/Input.tsx` doesn't match Light Professional (muted bg, `--line-1` border, 6px radius). Thin wrapper, don't overhaul the system.
- `web/src/components/connections/DestinationsTab.tsx` + test.
- `web/src/components/settings/*` — small section components (WorkspaceSection, TeamSection, BillingSection, ApiKeysSection, DangerZone). Each with a test.

### Backend dependencies
- Connections enrichment comes from Phase **B3** (see Backend section).
- Settings team/billing/API-keys/workspace-transfer are out of scope for this redesign — stubbed with `// SETTINGS-API-TODO` markers. Those endpoints are future work, not part of the redesign.

### Verification
- OAuth flows still complete end-to-end (manual test against real Google / Facebook if tokens on hand).
- Form validation unchanged (Zod schemas untouched).
- Typecheck / lint / test green.

### Commits (4)
Per user's Phase 7 prompt.

---

## Phase 8 — Cleanup

### Audit + codemod
1. Ripgrep for hardcoded hex in `web/src/**/*.{ts,tsx,css}` (excluding `index.css`). Replace each with a token class.
2. Ripgrep for deprecated references:
   - `var(--brand-`, `var(--primary-`, `rgb(var(--brand-`, `rgb(var(--primary-`
   - `text-primary-[0-9]`, `bg-primary-[0-9]`, `border-primary-[0-9]`, `ring-primary-[0-9]`
   - `from-primary-`, `to-primary-`, `via-primary-` (gradient utilities)
3. Codemod the indigo class names to `blue-primary` variants. Write a one-off script under `web/scripts/codemod-indigo.mjs` that runs once.
4. Delete violet/cyan gradient bg usages that predate Light Professional.

### Deletions (all need user confirmation)
- `docs/redesign/home-mockup-v2-light.html` — superseded.
- `.light-professional` wrapper class (if we ever added one — per spec we may skip the wrapper since we never enter option B).
- Any `--brand-*` / `--surface-*` / `--primary-*` CSS vars that have zero remaining references after the codemod.

### Docs
- Update `CLAUDE.md` Design System section: new palette + new fonts + new component vocabulary.

### Verification
- `pnpm --filter web build` succeeds.
- Final summary report: files touched, tokens retired, deprecation warnings added, remaining `*-TODO` markers.

### Commits (3–4)
- `refactor(ui): codemod indigo classes to blue-primary`
- `chore(ui): retire deprecated --brand-* tokens`
- `docs: update CLAUDE.md for Light Professional`
- `chore: delete superseded mockup files`

---

## Out of scope (Section 9 / future)

- Insights page (needs anomaly service + LLM Q&A)
- Alerts page (needs alert-rule CRUD + Slack/email/SMS delivery)
- Reports page (needs scheduler + template engine + PDF/XLSX renderer)
- Dark mode variant of Light Professional tokens
- ⌘K command palette (functional)
- Grid view for Pipelines
- Full i18n via `react-i18next`

---

## Decisions (locked)

1. **Shadows** — overwrite `shadow-sm/md/lg` in Tailwind with `var(--shadow-*)`. Accept small visual nudge on unmigrated pages.
2. **`/_dev/atoms`** — public dev-only (gated by `import.meta.env.DEV`, not `ProtectedRoute`).
3. **Phase 4 grouping** — block Phase 4 on backend (see Phase B1 below). Ship B1 first, then Phase 4.
4. **Phase 6 launch** — ship backend filter/rollup endpoints alongside (see Phase B2). No degraded-data intermediate state.

---

## End-to-end verification

After **each phase**:
- `pnpm --filter web type-check`
- `pnpm --filter web lint`
- `pnpm --filter web test:run`
- `pnpm --filter web dev` → smoke the page end-to-end against the mockup at 1280px and 1440px.

After **Phase 8**:
- `pnpm --filter web build` must succeed.
- Manual 30-minute smoke test: login → dashboard → run a workflow → view history → edit a connection → change a setting.
