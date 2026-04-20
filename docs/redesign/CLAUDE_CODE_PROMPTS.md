# Claude Code Prompts — OrbitX Redesign Integration

**How to use this file.**
Every Claude Code session must start by pasting **SECTION 0 · Master Context**.
Then paste **one** phase prompt at a time (Phase 1 → 7). Don't skip.
Each phase ends with explicit acceptance criteria; don't move on until they pass.

Ground truth for visuals: `docs/redesign/full-mockup.html`.
Ground truth for architecture: `CLAUDE.md` (repo root) + `docs/redesign/INTEGRATION_PLAN.md`.

---

## SECTION 0 · Master Context (paste first, every session)

```
You are working on the OrbitX frontend redesign. OrbitX is a Marketing Data Intelligence Platform (FastAPI + MongoDB backend, React 18 + TypeScript + Vite + Tailwind + Zustand + React Flow frontend). The repo root has a CLAUDE.md you should read once.

The redesign is already spec'd as static HTML mockups in `docs/redesign/`. The canonical reference is `docs/redesign/full-mockup.html` — a single-file mockup with 10 navigable pages (Home, Pipelines, Builder, Runs, Connections, Destinations, Insights, Alerts, Reports, Settings). When you need visual details, open it and inspect the markup.

## Design system — Light Professional

Non-negotiables:
- NO hardcoded hex colors in TSX or CSS outside `index.css`. Use token classes only.
- NO gradient washes, NO colored glows. Shadows only for elevation.
- Brand is navy + electric-blue. Do not reintroduce violet/cyan gradient from earlier mockups.
- Respect `prefers-reduced-motion` on every animation.

### CSS tokens (defined in `web/src/index.css`)

Brand:
  --navy: #0B1A5E                  (sidebar/logo base, dark accents)
  --blue-primary: #1848F3          (primary CTA, links, active nav)
  --blue-primary-hover: #0E35C4
  --blue-soft: #EEF2FE             (selected rows, active nav bg)
  --blue-border: #C2D4F9

Surfaces:
  --bg-page: #F7F9FC               (app background)
  --bg-card: #FFFFFF
  --bg-row-alt: #FAFBFD            (zebra rows / group headers)
  --bg-row-hv: #F2F5FB             (row hover)
  --bg-muted: #F1F5F9               (input chrome, mono bg)

Hairlines (always 1px):
  --line-1: #E5EAF2                (default card border)
  --line-2: #D3DAE6                (stronger — inputs, dividers)
  --line-soft: #EEF2F7             (table row separators, subtle inner)

Text (4-tier):
  --text-1: #0E172A                (primary text, headings)
  --text-2: #3B4557                (secondary body)
  --text-3: #64748B                (meta, labels, helper text)
  --text-4: #94A2B8                (disabled, ghost separators)

Semantic:
  --success: #047857 / bg #ECFDF5 / border #A7F3D0
  --warning: #B45309 / bg #FFFBEB / border #FDE68A
  --danger:  #B91C1C / bg #FEF2F2 / border #FECACA
  --violet:  #6D28D9 / bg #F5F3FF / border #DDD6FE       (reserved for AI)

Shadows:
  --shadow-sm: 0 1px 2px rgba(15,23,42,.04)
  --shadow-md: 0 4px 12px rgba(15,23,42,.06)
  --shadow-lg: 0 12px 32px rgba(15,23,42,.08)

### Fonts

- Inter 400/500/600/700 (display + body)
- IBM Plex Sans Thai 400/500/600/700 (Thai fallback)
- JetBrains Mono 400/500/600 (numbers, IDs, code, data)

Body OpenType features: `cv11`, `ss01`, `ss03`
Mono OpenType features: `tnum`
Thai override: `:lang(th) { line-height: 1.55; letter-spacing: 0; }`

### Component vocabulary (all live under `web/src/components/`)

Atoms: Chip, Dot, Avatar, Sparkline, StatTile, SearchShell, SegmentedControl, Tabs, FlowChip, SelectionBar, FilterBar, Button, Card.
Layout: Sidebar, Topbar, Layout.
Page-specific: PipelineTable, RunsTimeline, NodeCard, BuilderCanvas, AIInsightCard.

## Working rules

- Use `cn()` from `web/src/lib/utils.ts` for class merging.
- Use `class-variance-authority` (CVA) for components with variants.
- Use Zod for any new form validation. No `any` types.
- Add a Vitest unit test for every new shared component.
- Commit messages: conventional commits (`feat(ui): …`, `refactor(pages): …`).
- One PR per phase in this file.
- Before committing, run `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web test`.
- If something in the mockup can't be built without backend changes, STOP and file it under "Backend asks" in the PR description.

When I ask you to do a phase, you must:
1. Read `docs/redesign/INTEGRATION_PLAN.md` for the big picture once.
2. Read the relevant mockup section in `docs/redesign/full-mockup.html` (search for `data-page="<pagename>"`).
3. Explore real files in `web/src/` before you touch anything.
4. List your plan (files to create, files to edit) and wait for my approval.
5. Execute. Keep commits small and focused.
6. End with the acceptance-criteria self-check.
```

---

## SECTION 1 · Phase 1 Prompt — Foundation

```
Execute Phase 1: Foundation.

Goal: land the design tokens, fonts, and atomic components so every subsequent phase has a toolbox to draw from. No pages change yet.

### Tasks

1. **CSS tokens** — edit `web/src/index.css`:
   - Keep existing tokens as aliases during migration; do NOT delete them.
   - Add the full Light Professional token block at `:root` (see Master Context for exact values).
   - Add `:lang(th) { line-height: 1.55; letter-spacing: 0; }`.
   - Add `.font-mono { font-feature-settings: 'tnum'; }`.
   - On `body`: set `font-family: 'Inter','IBM Plex Sans Thai',system-ui,sans-serif;` and `font-feature-settings: 'cv11','ss01','ss03';` and `-moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;`.

2. **Font loading** — at the top of `web/src/index.css` replace the existing Google Fonts `@import` with:
   ```
   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
   ```

3. **Tailwind config** — edit `web/tailwind.config.js`:
   - Under `theme.extend.colors` add aliases that reference the new CSS vars:
     - `navy`, `blue-primary`, `blue-primary-hover`, `blue-soft`, `blue-border`
     - `bg-page`, `bg-card`, `bg-row-alt`, `bg-row-hv`, `bg-muted`
     - `line-1`, `line-2`, `line-soft`
     - `text-1`, `text-2`, `text-3`, `text-4`
     - `success`, `success-bg`, `success-border` (same for warning/danger/violet)
   - Under `theme.extend.fontFamily`:
     - `sans: ['Inter', 'IBM Plex Sans Thai', 'ui-sans-serif', 'system-ui', 'sans-serif']`
     - `mono: ['JetBrains Mono', 'ui-monospace', 'monospace']`
     - `display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']`
   - Under `theme.extend.boxShadow`: add `sm`, `md`, `lg` referencing the CSS var `--shadow-*`.

4. **Atomic components** — create under `web/src/components/shared/`. Each file must:
   - Be a .tsx with a named export + default re-export.
   - Use CVA for variants.
   - Have a companion `.test.tsx` with at least render + variant smoke tests.

   Components and their prop contracts:

   **`Chip.tsx`**
   ```ts
   type ChipProps = {
     variant: 'success' | 'warning' | 'danger' | 'blue' | 'violet' | 'soft';
     children: ReactNode;
     className?: string;
   }
   ```
   Inline-flex, 2px×8px padding, 11.5px font, pill border-radius, 1px border in matching `*-border` token. Source of truth for classes: `.chip-*` rules in `full-mockup.html`.

   **`Dot.tsx`**
   ```ts
   type DotProps = {
     variant: 'success' | 'warning' | 'danger' | 'blue' | 'muted';
     pulseRing?: boolean;   // shows animated ring; disabled under prefers-reduced-motion
   }
   ```
   8px × 8px round. The pulse animation's keyframes live in `index.css` (`@keyframes pulse`, 1.6s infinite). Wrap `@media (prefers-reduced-motion: reduce) { animation: none; }`.

   **`Avatar.tsx`**
   ```ts
   type AvatarProps = {
     name: string;          // "Nattha Sri" → initials "NS"
     size?: 'sm' | 'md';    // 22px / 28px
     tone?: 'navy' | 'auto';// auto = deterministic hash → pastel bg
     className?: string;
   }
   ```
   `tone='auto'` should produce stable colors from the name (use a small hash → pastel palette: `#DBEAFE #FEF3C7 #DCFCE7 #FEE2E2 #F3E8FF #CFFAFE #E0E7FF`). Initials uppercased, 1px `--line-1` border.

   **`Sparkline.tsx`**
   ```ts
   type SparkPoint = { status: 'success'|'warning'|'danger'|'blue'|'muted'; height: number /* 0..1 */ };
   type SparklineProps = { points: SparkPoint[]; className?: string };
   ```
   Renders `<span class="spark">` with 7 inner `<i>` bars (width 4px, gap 2px, max height 18px). Colors come from semantic tokens.

   **`StatTile.tsx`**
   ```ts
   type StatTileProps = {
     label: string;
     value: ReactNode;      // can be number or formatted string
     delta?: { direction: 'up'|'down'|'flat'; text: string };
     mono?: boolean;        // applies font-mono to value
   };
   ```
   White card, 1px `--line-1` border, 14px/16px padding. `delta-up` = `--success`, `delta-down` = `--danger`.

   **`SearchShell.tsx`**
   ```ts
   type SearchShellProps = {
     placeholder: string;
     value?: string;
     onChange?: (v: string) => void;
     kbdHint?: string;      // e.g. "⌘K"
     width?: 'full'|'md'|'lg'; // lg = 320px
   };
   ```
   Muted background shell with search icon. Single input inside. If `kbdHint` provided, show a `<kbd>` at right.

   **`SegmentedControl.tsx`**
   ```ts
   type SegOption<T extends string> = { value: T; label: string };
   type SegmentedControlProps<T extends string> = {
     options: SegOption<T>[];
     value: T;
     onChange: (v: T) => void;
     size?: 'sm'|'md';
   };
   ```
   Background `--bg-muted`, active chip is white card with shadow-sm.

   **`Tabs.tsx`**
   ```ts
   type TabItem = { id: string; label: string; count?: number; badge?: ReactNode };
   type TabsProps = {
     items: TabItem[];
     activeId: string;
     onChange: (id: string) => void;
     trailingAction?: ReactNode;   // for "+ Save view"
   };
   ```
   Underline-style tabs, 2px indicator in `--blue-primary`.

   **`FlowChip.tsx`**
   ```ts
   type FlowChipProps = { source: string; destination: string };
   ```
   `<node> → <node>` with a thin arrow SVG in the middle. Each node pill uses `--bg-muted` + 1px `--line-1` border.

   **`SelectionBar.tsx`**
   ```ts
   type SelectionBarProps = {
     count: number;
     actions: { label: string; onClick: () => void; destructive?: boolean }[];
     onClear: () => void;
   };
   ```
   Sticky-candidate bar with `--blue-soft` bg, `--blue-border` border. Only render when `count > 0`.

   **`FilterBar.tsx`**
   ```ts
   type FilterBarProps = {
     search: { placeholder: string; value: string; onChange: (v: string) => void };
     filters: { label: string; value: string; options?: string[]; onSelect: (v: string) => void }[];
     groupBy?: { options: SegOption<string>[]; value: string; onChange: (v: string) => void };
     viewToggle?: { options: SegOption<string>[]; value: string; onChange: (v: string) => void };
   };
   ```
   Horizontal strip that wraps on narrow widths. Filter pills are secondary buttons with a `▾` affordance.

5. **Button refactor** — `web/src/components/shared/Button.tsx`:
   - Keep existing API. Add a new `danger` variant: `bg-white text-danger border-danger-border hover:bg-danger-bg`.
   - Migrate primary variant from indigo to `--blue-primary` / `--blue-primary-hover`.

6. **Card refactor** — `web/src/components/shared/Card.tsx`:
   - Drop any gradient background.
   - Default: `bg-card border border-line-1 rounded-xl shadow-sm`.
   - Add `hoverable` prop that adds `hover:border-line-2 hover:shadow-md transition-[box-shadow,border-color]`.

### Acceptance criteria

- [ ] `pnpm --filter web typecheck` passes.
- [ ] `pnpm --filter web lint` passes.
- [ ] `pnpm --filter web test` passes (new atom tests included).
- [ ] Running `pnpm --filter web dev` boots without console errors.
- [ ] Opening any existing page doesn't visually regress (indigo may still appear where unmigrated; that's fine for Phase 1).
- [ ] No hardcoded hex in any new component source.
- [ ] Each new component has a screenshot-free "Kitchen Sink" playground route at `/_dev/atoms` (gated behind `import.meta.env.DEV`). Render every variant of every atom in a single page so I can eyeball it.

### Commit plan

- `feat(ui): add Light Professional design tokens + fonts`
- `feat(ui): extend Tailwind config with new color, font, shadow tokens`
- `feat(ui): add atomic components — Chip, Dot, Avatar, Sparkline`
- `feat(ui): add atomic components — StatTile, SearchShell, Segmented, Tabs`
- `feat(ui): add atomic components — FlowChip, SelectionBar, FilterBar`
- `refactor(ui): migrate Button + Card to new tokens`
- `feat(dev): add /_dev/atoms playground route`
```

---

## SECTION 2 · Phase 2 Prompt — Layout Chrome (Sidebar + Topbar)

```
Execute Phase 2: Layout Chrome.

Goal: the shell every page renders inside (sidebar + topbar) matches the mockup.

Reference: `docs/redesign/full-mockup.html` — the `<aside class="sidebar">` and `<header class="topbar">` blocks.

### Tasks

1. **Create `web/src/components/layout/Sidebar.tsx`.**
   - Fixed-width 240px on ≥lg, collapses to a drawer on <lg.
   - Content sections (match mockup order):
     - Brand block: 28px navy logo square + workspace name + plan tier line.
     - `SearchShell` with kbd `⌘K` (hint only for Phase 2; functional palette is a later phase).
     - `Workspace` group: Home, Pipelines (count badge), Builder, Run History.
     - `Connect` group: Connections (count), Destinations (count).
     - `Intelligence` group: Insights (with violet AI chip), Alerts (count), Reports.
     - Footer: Settings + user card.
   - Active state: `--blue-soft` bg, `--blue-primary` text, matching icon color.
   - Counts come from a `useSidebarCounts()` hook you create in `web/src/hooks/useSidebarCounts.ts` that reads from existing stores/services. For anything without a real source yet, hard-code and mark `// TODO: wire to API` with a unique comment tag `SIDEBAR-COUNTS-TODO`.
   - Use `NavLink` from `react-router-dom`. Routes to wire (create route stubs if they don't exist — empty pages are fine):
     `/`, `/pipelines`, `/builder`, `/runs`, `/connections`, `/destinations`, `/insights`, `/alerts`, `/reports`, `/settings`.

2. **Create `web/src/components/layout/Topbar.tsx`.**
   - 48px tall, white, 1px `--line-1` bottom border, sticky top.
   - Left: breadcrumb ("OrbitX / <current page>"). Current page resolves from route.
   - Right slot: `Feedback` ghost button, notification bell with red dot indicator, primary "New pipeline" CTA.
   - Accept a `rightSlot?: ReactNode` prop so pages can inject page-specific actions on top of the defaults.

3. **Rewire `web/src/components/Layout.tsx`:**
   - Use the new Sidebar and Topbar.
   - Main content area: `bg-page` background, `px-6 py-5`.
   - Preserve existing auth + route guards untouched.

4. **Test plan:** update/add Vitest specs for Sidebar active state + collapse behavior.

### Acceptance criteria

- [ ] Every existing page still loads under the new chrome.
- [ ] Active nav item highlights match the mockup.
- [ ] Sidebar collapses below `lg` breakpoint; topbar gets a hamburger on mobile.
- [ ] `⌘K` kbd hint shows but does not intercept keys yet.
- [ ] Counts render; TODO comments are in place for the unwired ones.
- [ ] No console errors, typecheck + lint + test green.

### Commit plan

- `feat(layout): implement Sidebar with grouped nav + counts`
- `feat(layout): implement Topbar with breadcrumb + actions`
- `refactor(layout): wire Layout.tsx to new chrome`
```

---

## SECTION 3 · Phase 3 Prompt — Home

```
Execute Phase 3: Home page.

Goal: `DashboardPage.tsx` matches the Home section of `full-mockup.html` (search `data-page="home"`).

### Visual structure (top to bottom)

1. Greeting block — "สวัสดี <first-name> 👋" + subtitle. Use the authenticated user's name from the auth store; fallback to "there".
2. Time range `SegmentedControl` (Today / 7d / 30d / 90d) + Refresh `Button`.
3. 5-column KPI row using `StatTile`:
   - Active pipelines
   - Rows synced · 24h (mono)
   - Successful runs · 24h
   - Failed runs · 24h (red value)
   - Spend captured · 7d (mono, ฿)
4. Two-column grid (2/3 left, 1/3 right):
   - Left column:
     - **Needs attention** `Card`: header with red alert icon + chip count. List items: `Dot` + pipeline name + reason + status `Chip` + secondary action `Button` (Reconnect / Retry / Refresh / Review).
     - **Throughput** `Card`: header + legend. 24 hourly bars rendered from `execution_history` aggregated client-side. X-axis labels 00:00 / 06:00 / 12:00 / 18:00 / now.
     - **Recent runs** table using the shared `<Table>`: 6 rows, columns: status dot, pipeline name, trigger chip, duration (mono), rows (mono), started (relative), status `Chip`.
   - Right column:
     - **AI Insight** `Card` with violet chip, headline, body, primary + ghost buttons. Use `--violet-bg` soft gradient background, `--blue-border` outline.
     - **Pipeline health** `Card`: 5 rows (Healthy / Running / Token expiring / Failed / Paused) each showing label + mono count + tiny progress bar in matching semantic color.
     - **Quick actions** `Card`: 2×2 secondary buttons (New pipeline, Connect source, Add destination, Schedule report). Each routes via `navigate()`.
     - **Team activity** `Card`: 4 list items with `Avatar` + "<name> <verb> <object>" + relative time.

### Data wiring

- KPIs + Recent Runs: use `executionHistoryService.getHistory({ range: selected })` and `useWorkflows()`.
- Aggregation (KPI math, hourly bucketing) lives client-side in a new `web/src/pages/home/aggregations.ts` module with unit tests.
- Needs Attention: derive from workflows where `status === 'failed'` OR `token_expires_in_days <= 7`.
- AI Insight: use a fixture service `web/src/pages/home/mockAiInsights.ts` returning a typed stubbed insight; leave a `SIDEBAR-COUNTS-TODO`-style marker `HOME-AI-API-TODO` so we can swap to the real endpoint later.
- Team activity: use `useActivityFeed()` if it exists; otherwise stub similarly.

### Acceptance criteria

- [ ] Matches mockup layout + spacing on ≥1280px width.
- [ ] No hardcoded hex. All colors via tokens.
- [ ] Time range switch actually refetches and re-aggregates.
- [ ] `aggregations.ts` is 100% covered by Vitest.
- [ ] Zero console errors.
- [ ] Loading + empty + error states exist for every data card (use existing shared Skeleton/EmptyState if present; otherwise create minimal ones under `components/shared/`).

### Commit plan

- `feat(home): redesign page shell + KPI row`
- `feat(home): needs attention + throughput chart`
- `feat(home): recent runs table + right column cards`
- `test(home): aggregation unit tests`
```

---

## SECTION 4 · Phase 4 Prompt — Pipelines (the hard one)

```
Execute Phase 4: Pipelines page.

Goal: `WorkflowsPage.tsx` matches `data-page="pipelines"` in the mockup. This is the densest page in the app — take it carefully.

### Required new components

- `web/src/components/pipelines/PipelineTable.tsx` — headless dense table with:
  - checkbox column
  - status dot column
  - pipeline name + optional paused chip
  - `FlowChip` (source → destination)
  - schedule text
  - last run (relative time or error chip)
  - 7-day `Sparkline`
  - duration (mono)
  - owner `Avatar`
  - row actions (kebab menu)
  - group-header rows (avatar, client name, summary counts, expand caret, "Showing N of M")
  - selection state lives in `pipelineViewsStore`

- `web/src/store/pipelineViewsStore.ts` — Zustand slice:
  ```ts
  type SavedView = { id: string; name: string; filter: PipelineFilter; groupBy: GroupKey | null };
  interface PipelineViewsStore {
    savedViews: SavedView[];
    activeViewId: string;
    search: string;
    filters: PipelineFilter;
    groupBy: GroupKey | null;
    viewMode: 'table' | 'grid';
    selectedIds: Set<string>;
    // actions
    setActiveView(id: string): void;
    saveView(name: string): void;
    toggleSelect(id: string): void;
    clearSelection(): void;
    setFilter(patch: Partial<PipelineFilter>): void;
    ...
  }
  ```
  Persist `savedViews` + `activeViewId` in localStorage under key `orbitx.pipelineViews.v1`.

### Page structure

1. Page header: title + live stats chip (see `<h1>Pipelines</h1>` block in mockup). Totals come from aggregating the full workflows list.
2. `Tabs` for saved views: All / Needs attention / Running / Failed this week / My pipelines / Shared with me / `+ Save view`.
3. `FilterBar` underneath: search + 5 filter pills (Status, Source, Destination, Schedule, Owner) + group-by seg (None / Client / Status / Schedule) + view toggle (Table / Grid).
4. `SelectionBar` — shown conditionally when `selectedIds.size > 0`. Actions: Run, Pause, Move to folder, Delete (destructive).
5. `PipelineTable` — scrollable within a `Card`.
6. Table footer: "Showing N of M" + rows-per-group seg.

### Grouping + filtering logic

- All client-side for v1. Implement in `web/src/pages/pipelines/groupAndFilter.ts` — unit tested.
- When `groupBy === 'client'`, group by `workflow.workspace_id` or `workflow.metadata.client`, whichever exists in the data model.
- Default collapsed state: first 2 groups expanded, rest collapsed.
- Pagination is per-group (Rows per group: 8 / 25 / 100 / All).

### Grid view (stub for Phase 4)

Switching to Grid view should render a placeholder card grid with 6 dummy cards and a `TODO: grid view` note. Don't spend time on the grid yet — it's a Phase 7 concern.

### Data asks

If the `GET /api/workflow/workflows` response doesn't include `status`, `last_run_at`, `source_type`, `destination_type`, `owner`, or `token_status` on each item, STOP and file a backend ask at the top of the PR description. Don't do N+1 fetches to fill the table.

### Acceptance criteria

- [ ] Can group by client and expand/collapse groups.
- [ ] Saved views persist across reloads.
- [ ] Selection bar + bulk actions work (actions can be no-ops for Phase 4, but toast a confirmation).
- [ ] Sparkline renders with real 7-day status history from `executionHistoryService`.
- [ ] Typecheck + lint + test green. `groupAndFilter.ts` has ≥90% coverage.
- [ ] Page handles 500+ workflows without lag (virtualize the table body if needed — use `@tanstack/react-virtual`; add it as a dep).

### Commit plan

- `feat(pipelines): add pipelineViewsStore (Zustand + persist)`
- `feat(pipelines): PipelineTable component + grouping logic`
- `feat(pipelines): filter bar, saved views, selection bar`
- `feat(pipelines): wire WorkflowsPage to store + service`
- `test(pipelines): groupAndFilter unit tests`
```

---

## SECTION 5 · Phase 5 Prompt — Builder

```
Execute Phase 5: Builder redesign.

Goal: `WorkflowBuilderPage.tsx` matches `data-page="builder"` in the mockup. Keep the React Flow engine; only the node rendering + canvas chrome change.

### Tasks

1. **Create `web/src/components/builder/NodeCard.tsx`** — the new React Flow node type. API:
   ```ts
   type NodeCardProps = NodeProps<{
     kind: 'source' | 'transform' | 'destination';
     title: string;                   // "Facebook Ads", "Unified Schema", ...
     subtitle?: string;               // account / table / config summary
     meta?: string;                   // small muted line (e.g. "Last 90d · 24 fields")
     iconSlot?: ReactNode;            // brand glyph
     status: 'healthy' | 'warning' | 'error' | 'running' | 'idle';
   }>;
   ```
   Visual: white card, 1px `--line-1` border, `--shadow-sm`, 200px wide. Header (title + small icon + status `Dot`). Body (subtitle + meta in text-3). Left/right ports styled as 10px circles with 2px border; active ports use `--blue-primary` ring.

2. **Register node types** in the existing React Flow setup (search for `nodeTypes={...}` usage). Map every existing node kind to `NodeCard` but keep original child renderers (editors/drawers) untouched.

3. **Create `web/src/components/builder/BuilderCanvas.tsx`** — the canvas chrome that wraps React Flow:
   - Dot-grid background: `radial-gradient(circle, #DDE4F0 1px, transparent 1px) 0 0 / 20px 20px, var(--bg-page)`.
   - Floating top-left toolbar `Card` shadow-sm: Fit, Zoom in, Zoom out, zoom %, Undo, Redo.
   - Floating top-right status chip: validity `Chip` (success/warning) + "N nodes · M edges" in text-3.
   - Floating bottom-right minimap (use React Flow's `<MiniMap />` with custom styles).

4. **Builder page shell** — `WorkflowBuilderPage.tsx`:
   - Header with breadcrumb link to Pipelines, workflow name + rename button, saved-at text + version, health `Chip`.
   - Right-side segmented control (Edit / Preview / Runs / Settings) — Edit is the default; the others route to subpages (stubs for now).
   - Actions: Pause, Save draft, primary Run now.
   - Three-column layout (220px node palette · canvas · 320px config panel).

5. **Node palette (left column)**: rebuild as a simple list grouped by Sources / Transforms / Destinations. Draggable items — use React Flow's drag-and-drop pattern. Items beyond the top N should show "+ N more" that opens a modal (stub for Phase 5; file a TODO).

6. **Config panel (right column)**: keep the existing per-node editor; wrap it in the new card chrome and update typography. Field mapping + data preview blocks should use `.font-mono` tokenized fragments. If mapping UI doesn't exist yet, create a minimal version that reads from the node's current config — no invented fields.

### Acceptance criteria

- [ ] Existing workflows still load, run, save.
- [ ] Visual regression budget: side-by-side with mockup at 1440px width, node cards and canvas chrome match.
- [ ] Zoom / pan / minimap still work.
- [ ] Selection state on node highlights with `--blue-primary` 3px ring.
- [ ] Pulse-ring shows on nodes with `status === 'running'`.
- [ ] Typecheck / lint / test green.

### Commit plan

- `feat(builder): NodeCard component + react-flow registration`
- `feat(builder): BuilderCanvas chrome (toolbar, status, minimap)`
- `refactor(builder): WorkflowBuilderPage shell + three-column layout`
- `feat(builder): node palette with drag-and-drop`
- `refactor(builder): config panel typography + tokens`
```

---

## SECTION 6 · Phase 6 Prompt — Runs (new page)

```
Execute Phase 6: Runs page.

Goal: create a new `RunsPage.tsx` matching `data-page="runs"` in the mockup.

### Tasks

1. **Routing** — add `/runs` route in `web/src/App.tsx` + `RunsPage.tsx` under `web/src/pages/`.

2. **Components**:
   - `web/src/components/runs/RunsTimeline.tsx` — stacked-bar chart, 24 bars for a 24h window. Stack order: success (green) on top, failed (red), running (blue). Include legend. Tooltip on hover shows exact counts. No chart library dep yet; render with divs (same pattern as mockup). If more granular ranges need a chart library later, that's Phase 7.
   - `web/src/pages/runs/runsAggregations.ts` — pure functions: `bucketByHour`, `bucketByDay`, `bucketByWeek`. 100% unit tested.

3. **Page structure**:
   - Header: "Run history" + "N runs · last 24h".
   - Time range `SegmentedControl` (24h / 7d / 30d / Custom). Custom opens a date range popover (can be a stub modal for now).
   - Export `Button`.
   - `RunsTimeline` card.
   - `FilterBar`: search + Pipeline / Status / Trigger filters.
   - `<Table>` with columns: status dot, pipeline name, trigger chip, started (mono), duration (mono), rows (mono), status chip, action kebab.
   - Pagination footer.

4. **Data**:
   - Use `executionHistoryService.getHistory({ range, filters, page, pageSize })`. If any filter/param isn't supported, file a backend ask.
   - Expected total for the footer comes from the same endpoint's `total`.

### Acceptance criteria

- [ ] 24h timeline renders correct counts against fixtures.
- [ ] Filter + pagination state live in URL search params so deep links work.
- [ ] Clicking a row opens a detail drawer (stub: right-side `Card` showing raw JSON + node-level status list).
- [ ] Reduced-motion respected on the pulse-ring for running rows.
- [ ] Typecheck / lint / test green.

### Commit plan

- `feat(runs): RunsPage scaffolding + route`
- `feat(runs): RunsTimeline component + bucketing helpers`
- `feat(runs): runs table + filter bar`
- `feat(runs): run detail drawer stub`
- `test(runs): bucketing tests`
```

---

## SECTION 7 · Phase 7 Prompt — Secondary pages (Connections, Destinations, Settings)

```
Execute Phase 7: Connections, Destinations, Settings.

Goal: restyle existing pages with the new tokens; introduce Destinations as a tab within Connections; polish Settings.

### Tasks

1. **ConnectionsPage.tsx**
   - Add a top `Tabs`: "Sources" (active by default) and "Destinations".
   - Sources view: header, 4 summary stat tiles (Connected / Healthy / Expiring / Broken), table of OAuth accounts with `FlowChip`-less columns (Platform icon, account id, scopes, used-by count, last sync, token expiry, status chip, actions). "Available sources" grid below.
   - Destinations view: same pattern adapted — 4 warehouse cards (Snowflake, BigQuery, Postgres, Sheets) with stats + top tables list.

2. **SettingsPage.tsx**
   - Two-column layout: left 200px sidebar nav (Workspace / Team / Billing / API keys / Audit log / Profile / Notifications / Security); right content.
   - Workspace section: form fields with new input styling.
   - Team section: member table with avatars, role chip, last active.
   - Billing section: plan summary + 4 stat tiles + next invoice.
   - API keys section: table with masked keys + "New key" CTA.
   - Danger zone: red-tinted card at the bottom with Transfer + Delete actions.

3. **Shared form inputs** — if `web/src/components/shared/form/` doesn't already match the look (muted bg, `--line-1` border, 6px radius), create a thin wrapper `Input.tsx` that does. Don't overhaul the whole form system for Phase 7.

### Acceptance criteria

- [ ] Existing functionality preserved (OAuth flows, member invites, API key rotation).
- [ ] Visual parity with the mockup at 1440px.
- [ ] No regressions in form validation.
- [ ] Typecheck / lint / test green.

### Commit plan

- `refactor(connections): redesign with tabs + summary tiles`
- `feat(destinations): destinations tab in ConnectionsPage`
- `refactor(settings): redesign with sidebar layout`
- `feat(ui): Input wrapper matching Light Professional style`
```

---

## SECTION 8 · After Phase 7 · Cleanup prompt

```
Run the Light Professional cleanup pass.

1. Audit `web/src/` for any remaining:
   - Hardcoded hex colors → replace with token classes
   - References to deprecated `--brand-*` or `--primary-*` vars where the Light Professional equivalent now exists
   - Indigo class names (`text-primary-500`, `bg-primary-600`, etc.) → run a codemod to map to `blue-primary` variants
   - Violet/cyan gradient backgrounds from the earlier mockup iteration → delete
2. Delete `docs/redesign/home-mockup-v2-light.html` (superseded by `full-mockup.html#home`).
3. Delete the `.light-professional` wrapper class if every page is now migrated.
4. Update `CLAUDE.md` "Design System" section to reflect the new palette.
5. Run `pnpm --filter web build` to make sure the bundle still builds.

Produce a final summary report:
- Files touched
- Tokens retired
- Deprecation warnings added
- Any remaining `*-TODO` tags in the codebase
```

---

## SECTION 9 · Future (not part of the initial redesign scope)

- Insights page → gate on backend: anomaly detection service + LLM Q&A endpoint
- Alerts page → gate on backend: alert-rule CRUD + Slack/email/SMS delivery
- Reports page → gate on backend: scheduler + template engine + PDF/XLSX renderer
- Dark mode variant of Light Professional tokens
- ⌘K command palette (functional, not just visual hint)
- Grid view for Pipelines
- Full i18n (react-i18next) once we have translated strings beyond the existing Thai sprinkling

Each is a standalone sprint. Use `full-mockup.html` as the visual spec when the time comes.
