# OrbitX Redesign — Integration Plan

> From static mockups (`docs/redesign/full-mockup.html`) into the live `web/` codebase.
> Status: **Proposal** · Target: Light Professional design system (navy + electric-blue)

---

## 1. TL;DR

The redesign touches **3 layers** of the frontend and needs to be sequenced to avoid a big-bang release:

1. **Foundation** — design tokens, fonts, atomic components, layout chrome (Sidebar + Topbar)
2. **Core pages** — Home, Pipelines, Builder, Runs (these exist today and get restyled/refactored)
3. **New surfaces** — Insights, Alerts, Reports, and a dedicated Destinations tab (net new, depend on backend work)

Timeline: **~8–10 weeks** for a solo engineer on Phases 1–6 (core). New surfaces (Phase 7) ship in a later milestone once backend endpoints exist.

---

## 2. Gap Analysis · Mockup → Real Code

| Page | Current file | Gap |
|---|---|---|
| Home | `web/src/pages/DashboardPage.tsx` | Major restyle. New KPI tiles, Needs Attention feed, AI Insight card, throughput bar chart. |
| Pipelines | `web/src/pages/WorkflowsPage.tsx` | Major refactor. Add client grouping, saved views, 7-day sparklines, selection bar, filter pills. |
| Builder | `web/src/pages/WorkflowBuilderPage.tsx` | Restyle React Flow nodes + canvas chrome. Keep graph engine, swap node components. |
| Run History | *(none)* | **New page.** Timeline chart + filterable dense table. |
| Connections | `web/src/pages/ConnectionsPage.tsx` | Restyle + possibly split into 2 tabs (Sources / Destinations). |
| Destinations | *(none)* | New — likely a tab within Connections for v1, standalone later. |
| Insights | *(none)* | **New page.** Ask-a-question bar, insight cards, trend charts. Backend dependency. |
| Alerts | *(none)* | **New page.** Rule table + channel management. Backend dependency. |
| Reports | *(none)* | **New page.** Scheduled report cards + template gallery. Backend dependency. |
| Settings | `web/src/pages/SettingsPage.tsx` | Light restyle. Token swap + minor layout polish. |

---

## 3. Foundation Work (Phase 1 — the base everything else rests on)

### 3.1 Design tokens — migrate to Light Professional palette

**File:** `web/src/index.css`

Add these CSS custom properties at `:root`:

```css
:root {
  /* Brand */
  --navy:#0B1A5E;
  --blue-primary:#1848F3; --blue-primary-hover:#0E35C4;
  --blue-soft:#EEF2FE; --blue-border:#C2D4F9;

  /* Surfaces */
  --bg-page:#F7F9FC; --bg-card:#FFFFFF;
  --bg-row-alt:#FAFBFD; --bg-row-hv:#F2F5FB; --bg-muted:#F1F5F9;

  /* Hairlines */
  --line-1:#E5EAF2; --line-2:#D3DAE6; --line-soft:#EEF2F7;

  /* 4-tier text */
  --text-1:#0E172A; --text-2:#3B4557; --text-3:#64748B; --text-4:#94A2B8;

  /* Semantic */
  --success:#047857; --success-bg:#ECFDF5; --success-border:#A7F3D0;
  --warning:#B45309; --warning-bg:#FFFBEB; --warning-border:#FDE68A;
  --danger :#B91C1C; --danger-bg :#FEF2F2; --danger-border :#FECACA;
  --violet :#6D28D9; --violet-bg :#F5F3FF; --violet-border :#DDD6FE;

  /* Shadows only (no glows) */
  --shadow-sm:0 1px 2px rgba(15,23,42,.04);
  --shadow-md:0 4px 12px rgba(15,23,42,.06);
  --shadow-lg:0 12px 32px rgba(15,23,42,.08);
}
```

**File:** `web/tailwind.config.js`

Extend `colors` with aliases that resolve to the new vars (so we can write `bg-blue-primary`, `text-text-3`, etc. from TSX).

**Migration strategy:** the current brand is indigo (`primary-500 ≈ #3B82F6`). Two options:

- **A (recommended):** Replace indigo globally. Use a one-time codemod to rewrite `text-primary-*` / `bg-primary-*` / `border-primary-*` → `blue-primary` variants. Keep legacy classes as aliases for 2 sprints.
- **B (safer but slower):** Wrap each redesigned page in a `.light-professional` class that overrides the vars locally. Lets us ship page-by-page without breaking unrestyled ones.

**Recommendation:** Start with **B** for Home + Pipelines (so we can ship incrementally), then flip to **A** at the end of Phase 3 once ≥50% of pages are migrated.

### 3.2 Fonts

**File:** `web/src/index.css` (top)

Replace the existing Google Fonts import with:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

On `body`:

```css
font-family:'Inter','IBM Plex Sans Thai',system-ui,sans-serif;
font-feature-settings:'cv11','ss01','ss03';
-moz-osx-font-smoothing:grayscale;
text-rendering:optimizeLegibility;
```

Add Thai rule:

```css
:lang(th){ line-height:1.55; letter-spacing:0; }
```

Mono with tabular numbers:

```css
.font-mono{ font-feature-settings:'tnum'; }
```

**Tailwind:** update `fontFamily.sans` to the same stack so utilities stay consistent.

### 3.3 Layout chrome — Sidebar + Topbar

**Files to refactor:**
- `web/src/components/Layout.tsx`
- *(new)* `web/src/components/layout/Sidebar.tsx`
- *(new)* `web/src/components/layout/Topbar.tsx`

Changes:
- Sidebar fixed (no collapse on desktop ≥1024px; keep collapse as mobile drawer)
- Sidebar background: white card on page bg; nav item active state uses `--blue-soft` + `--blue-primary` text
- Topbar: breadcrumb left, search-shell / notifications / Feedback / primary CTA right
- ⌘K palette is a future milestone — ship a visual placeholder first

### 3.4 Atomic components

Create under `web/src/components/shared/`:

| Component | Notes |
|---|---|
| `Chip.tsx` | Variants: `success` `warning` `danger` `blue` `violet` `soft`. Pill + border + muted text. |
| `Dot.tsx` | 8px status dot. Optional `pulseRing` prop for running state. Respects `prefers-reduced-motion`. |
| `Avatar.tsx` | Initials avatar with deterministic bg from string hash. |
| `Sparkline.tsx` | 7 bars, height 18px, color-coded (success/warning/danger/blue). Accepts `Status[]`. |
| `StatTile.tsx` | KPI card: label / value / delta. Delta accepts `up`/`down` direction + text. |
| `SearchShell.tsx` | Muted input shell with icon + optional kbd hint. |
| `SegmentedControl.tsx` | `seg` pattern (None/Client/Status/Schedule, Today/7d/30d/90d). |
| `Tabs.tsx` | `tab` pattern (saved views with counts + chip badges). |
| `FlowChip.tsx` | `Source → Destination` inline chip with arrow. |
| `SelectionBar.tsx` | Blue-soft bar shown when ≥1 row selected; accepts action slots. |
| `FilterBar.tsx` | Horizontal strip: search + filter pills + group-by seg + view toggle. |

Refactor existing:

| Component | Change |
|---|---|
| `Button.tsx` | Add `danger` variant. Swap colors to `--blue-primary`/`--blue-primary-hover`. |
| `Card.tsx` | Flat white, `--line-1` border, `--shadow-sm`. No gradient bg. |
| `Modal.tsx` / `Notification.tsx` | Token swap only. |

---

## 4. Page-by-Page Rollout

### Phase 2 — Home (Week 2–3)

- Refactor `DashboardPage.tsx` to the mockup layout: 5-tile KPI row, Needs Attention card, 24h throughput bar chart, Recent Runs table, AI Insight card, Pipeline Health, Quick Actions, Team Activity.
- Build `components/insights/AIInsightCard.tsx`.
- Wire KPI tiles to existing hooks (`useWorkflows`, `executionHistoryService`). Most math is client-side aggregation over data already fetched.

**PR:** `pages/home-redesign` · **Size:** M (~4–5 days)

### Phase 3 — Pipelines (Week 3–4)

- Build `components/pipelines/PipelineTable.tsx` (dense table with grouping, sparkline column, row actions, selection).
- Implement client-side grouping on `workflows[]` by `workspace.client` (or metadata field).
- Saved views = Zustand store slice `pipelineViewsStore` with `{name, filter, groupBy}` entries.
- Filter pills read from the same store.

**Data contract check:** confirm the `Workflow` shape in `common/common/model/` exposes enough to compute `status`, `last_run`, `owner`, `source_type`, `destination_type` without N+1 lookups. If not, request a backend change to denormalize these into the list response.

**PR:** `pages/pipelines-redesign` · **Size:** M (~5–6 days)

### Phase 4 — Builder (Week 4–5)

- Build `components/builder/NodeCard.tsx` as the new React Flow node type.
- Register in existing `nodeTypes` prop. Keep port positions, animation pulse for running nodes.
- Refactor canvas chrome: dot-grid background, floating toolbar top-left, validity chip top-right, minimap bottom-right.
- Right config panel: swap existing drawer for the new field-mapping + preview layout.

**Risk:** React Flow's internal CSS may conflict with new styles — test edge routing and zoom levels first.

**PR:** `pages/builder-redesign` · **Size:** M (~4–5 days)

### Phase 5 — Runs (Week 5)

- New `pages/RunsPage.tsx` + route in `App.tsx`.
- New `components/runs/RunsTimeline.tsx` — hourly stacked bars (success / failed / running).
- Table of runs with filters (pipeline / status / trigger / time range).
- Aggregation happens client-side for v1. Server-side rollup endpoint can come later if row counts explode.

**PR:** `pages/runs` · **Size:** M (~3–4 days)

### Phase 6 — Connections, Destinations, Settings (Week 6)

- `ConnectionsPage.tsx`: add tabs (Sources / Destinations). Token-status chip per account. Reconnect CTA for expired tokens.
- `SettingsPage.tsx`: token swap, section layout polish.

**PR:** `pages/secondary-redesign` · **Size:** S (~2–3 days)

### Phase 7 — New surfaces (post-launch)

Gate on backend readiness:
- **Insights** → needs anomaly detection service + LLM-backed Q&A endpoint
- **Alerts** → needs alert-rule CRUD + Slack/email/SMS delivery
- **Reports** → needs report scheduler + template engine + PDF/XLSX renderer

Each is a standalone sprint. The mockups in `full-mockup.html` are the spec.

---

## 5. Data Layer — where the UI meets the API

| Surface | Endpoint(s) | Notes |
|---|---|---|
| Home KPIs | `GET /api/workflow/workflows`, `GET /api/execution/history?range=24h` | All aggregation client-side for v1. |
| Throughput chart | `GET /api/execution/history?range=24h` | Bucket by hour in JS. |
| Pipelines list | `GET /api/workflow/workflows` | May need denormalized `status`, `last_run`, `next_run`, `owner` fields to avoid N+1. |
| Pipeline grouping | client-side on `workspace` / `client` metadata | No backend change needed. |
| Runs | `GET /api/execution/history` with filter params | Confirm it accepts `time_range`, `status`, `pipeline_id`, `trigger_type`. |
| Builder | existing `useWorkflows` + React Flow state | No backend changes. |
| Connections | `GET /api/connections/list` | Confirm response exposes `token_expires_at`, `scopes`, `used_by_count`. |

**Action:** verify `ExecutionHistory` list endpoint supports the filter set Runs needs. If not, open a backend ticket before Phase 5.

---

## 6. Decisions You Need to Make

| # | Question | Default recommendation |
|---|---|---|
| D1 | Replace indigo brand with navy + electric-blue globally, or keep indigo as fallback? | **Replace**, via a codemod + `.light-professional` wrapper during transition. |
| D2 | Dark mode scope — ship light-only, or produce dark tokens too? | **Light-only for v1.** Dark mode is a later milestone — the mockup doesn't specify it. |
| D3 | Thai i18n — class-based CSS only, or full i18n library? | **Class-based for v1** (`:lang(th)` + font-family chain). Add `react-i18next` only when we need translated strings. |
| D4 | Sidebar — keep collapse or fix it open? | **Fixed ≥1024px**, collapse as mobile drawer. Matches mockup, simplifies layout math. |
| D5 | Connections vs Destinations — split pages or one page with tabs? | **One page, two tabs** for v1. Split to two routes once Destinations has its own detail views. |
| D6 | React Flow — keep or replace? | **Keep.** Build a new `NodeCard` node type; don't touch the engine. |
| D7 | Rollout cadence — ship per-page behind a flag, or big bang after Phase 6? | **Per-page behind `redesign_v2` feature flag.** Internal users on the flag from Phase 2. External flip after Phase 6. |

---

## 7. Effort Summary

| Workstream | Size |
|---|---|
| Tokens + fonts | S (1–1.5 days) |
| Atomic components | M (3–4 days) |
| Layout chrome (Sidebar + Topbar) | M (2–3 days) |
| Home | M (4–5 days) |
| Pipelines | M (5–6 days) |
| Builder | M (4–5 days) |
| Runs (new) | M (3–4 days) |
| Connections + Destinations | S (2 days) |
| Settings | S (1 day) |
| QA + bug-fix + responsive | M (3–4 days) |
| **Core total** | **~8–10 weeks** for 1 eng |
| Insights / Alerts / Reports | each L (2–3 weeks + backend) |

---

## 8. File Manifest

### New files
- `web/src/components/shared/{Chip,Dot,Avatar,Sparkline,StatTile,SearchShell,SegmentedControl,Tabs,FlowChip,SelectionBar,FilterBar}.tsx`
- `web/src/components/layout/{Sidebar,Topbar}.tsx`
- `web/src/components/pipelines/PipelineTable.tsx`
- `web/src/components/runs/RunsTimeline.tsx`
- `web/src/components/builder/{NodeCard,BuilderCanvas}.tsx`
- `web/src/components/insights/AIInsightCard.tsx`
- `web/src/pages/RunsPage.tsx`
- `web/src/store/pipelineViewsStore.ts`

### Refactored files
- `web/src/index.css` — tokens, fonts, Thai rule
- `web/tailwind.config.js` — color + font extensions
- `web/src/components/Layout.tsx` — delegate to new Sidebar/Topbar
- `web/src/components/shared/{Button,Card,Modal,Notification}.tsx`
- `web/src/pages/{DashboardPage,WorkflowsPage,WorkflowBuilderPage,ConnectionsPage,SettingsPage}.tsx`
- `web/src/App.tsx` — add RunsPage route

### Backend tickets to file
- `workflows` list: include denormalized `status`, `last_run_at`, `owner`, `source_type`, `destination_type`
- `execution_history` list: confirm filter params (`time_range`, `status`, `pipeline_id`, `trigger_type`) + hourly bucketed rollup endpoint
- `connections` list: expose `token_expires_at`, `scopes`, `used_by_count`

---

## 9. Recommended Next Step

Before any code lands, confirm the 7 decisions in Section 6 (especially D1 brand replacement and D7 rollout cadence). Those two alone dictate the PR structure for the whole project.

Once confirmed, first PR to ship is **Phase 1 (Foundation)** as a single atomic change — tokens + fonts + atomic components + layout chrome. Everything after that is pure page work.
