# OrbitX Frontend — UX/UI Layout Redesign

**Scope:** Layout structure, screen composition, component visuals, navigation, empty states, visual hierarchy.
**Out of scope:** audience/positioning, pricing, rollout plans, business-side localization strategy.
**Constraints:** Keep Tailwind + shadcn/ui. Thai-text layout accommodations only.

---

## 1. Overview of what changes

| Area | Change |
|---|---|
| App shell | Introduce a persistent left sidebar + top command bar. Today there is no unified shell. |
| Navigation | Seven top-level sections instead of four. Add explicit `Reports`, `Alerts`, `Data` surfaces that exist only as features today. |
| Dashboard | Rebuild `/dashboard` as `/home` — an answer-first layout (Today → Attention → Activity → Pipelines) instead of a workflow-list-with-stats-on-top. |
| Cards & rows | Collapse per-item actions behind a `⋯` menu. One consistent `StatusPill` shape across every screen. |
| Builder | Visual refresh only. React Flow stays. New node chrome, tokenized edges, right-panel tabs. |
| Design tokens | Pick one system. Semantic tokens in TSX (`text-text-primary`, `bg-surface-primary`, `text-brand-500`). Raw `primary`/`accent` scales become internal-to-tokens only. |
| Components | Stand up shadcn/ui primitives in `components/ui/`. Retire hand-rolled Modal/Sheet/Button in favor of generated shadcn + OrbitX variants. |
| Empty states | Every surface gets a parameterized `<EmptyState />` with a single primary action. |

---

## 2. Design principles (applied in priority order)

1. **Answer before canvas.** The first screen a signed-in user sees should show status and what needs them — not a blank workflow list.
2. **One token system in TSX.** No raw `*-primary-*` or `*-accent-*` classes in components. Only semantic tokens.
3. **Status is a first-class surface.** Every list row, card, and node shows health in the same shape and color set.
4. **Destructive actions are earned.** Delete / disconnect / force-run collapse into `⋯` menus. The current dashboard exposes `Pencil · Play · Trash · MoreHorizontal` on every card — too loud.
5. **Thai-safe layout.** Raised line-height floors, no `font-weight: 300`, IBM Plex Sans Thai fallback in the font stack.

---

## 3. Information architecture & navigation

### 3.1 Current routes (from `web/src/App.tsx`)

```
/               Landing
/login          Login
/dashboard      Workflow list + stats + run history (DashboardPage.tsx, 1,206 lines)
/workflows      → redirects to /dashboard
/workflows/builder   Builder (WorkflowBuilderPage.tsx, 1,126 lines)
/connections   Connections (ConnectionsPage.tsx, 563 lines)
/settings       Stub (25 lines)
```

### 3.2 Proposed routes

```
/                           Landing
/login · /signup

── App shell (sidebar + top bar) ──

/home                       Answer-first view (formerly /dashboard)
/pipelines                  List view (formerly the workflow list on dashboard)
/pipelines/:id              Detail: Overview | Runs | Schedule | Settings tabs
/pipelines/:id/edit         Canvas (formerly /workflows/builder)
/connections                Grouped by platform
/reports                    Scheduled + on-demand deliveries
/alerts                     Anomaly & failure rules
/data                       Dataset browser (unified marketing schema)
/settings/account
/settings/workspace
/settings/members
/settings/billing
/settings/api
```

### 3.3 App shell layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ┌────────────┐  ┌────────────────────────────────────────────────┐  │
│  │ Workspace▾ │  │ Search pipelines, connections, data…    ⌘K    │  │
│  ├────────────┤  └────────────────────────────────────────────────┘  │
│  │ 🏠 Home    │                                                      │
│  │ ⚙ Pipelines│                                                      │
│  │ 🔌 Connect.│                        PAGE CONTENT                  │
│  │ 📄 Reports │                                                      │
│  │ 🔔 Alerts  │                                                      │
│  │ 🗂 Data    │                                                      │
│  │            │                                                      │
│  │ Settings ▾ │                                                      │
│  │ ── user ── │                                                      │
│  └────────────┘                                                      │
└──────────────────────────────────────────────────────────────────────┘
  ↑ 240px sidebar        ↑ 56px top bar         ↑ max-width 1440, gutters 32
```

- **Sidebar** 240px desktop, collapsible to 64px (icons only) via a toggle at the bottom. Collapses automatically <1280.
- **Top bar** 56px tall: global `⌘K` command palette trigger (search + navigate + run), workspace context breadcrumb, notifications bell, user avatar.
- **Workspace switcher** is the first element in the sidebar. Even in single-workspace mode, it shows the current workspace name so the switcher has a visible affordance.
- **Content area** max-width 1440px, 32px horizontal gutters desktop, 16px mobile, 24px tablet.

### 3.4 Responsive breakpoints

| Breakpoint | Sidebar | Page grid |
|---|---|---|
| ≥1440 | 240px fixed | 12 col, 24px gutter |
| 1024–1439 | 240px, can collapse | 12 col, 16px gutter |
| 768–1023 | icon-only (64px) by default | 8 col |
| <768 | off-canvas drawer, hamburger in top bar | single column; canvas screens become read-only |

Mobile behavior on `/pipelines/:id/edit` (the canvas): read-only, pinch-to-pan; editing is desktop/tablet-only.

---

## 4. Design tokens — fix the ambiguity

Today `tailwind.config.js` declares both a raw `primary` blue scale (lines 40–51) **and** a CSS-variable `brand` scale (lines 64–75). TSX files use both. Plus `text-primary` as a semantic means "primary text color," which collides with `primary-500` meaning "brand blue 500."

**Rule going forward:**
- In TSX, only use semantic tokens: `text-text-primary`, `bg-surface-primary`, `text-brand-500`, `border-border`, `bg-success`.
- The raw `primary` and `accent` scales become internal-to-CSS-variables only (declared in `web/src/index.css`).
- Rename the `accent` CSS variable set to `highlight` to stop overloading the word.
- Add a lint rule: block `*-primary-[0-9]+`, `*-accent-[0-9]+` class names in `src/**/*.tsx`.

**Hardcoded colors to remove:**
- `#06C755` and `#E01E5A` in `components/workflow/ScheduleDeliverySheet.tsx`
- `#3F3F46` fallback in `components/workflow/reactflow/CustomEdge.tsx`
- Inline hex values inside `DashboardPage.tsx` sparkline (`#10B981`, `#EF4444`, `#3B82F6`, `#F59E0B` at lines ~107–115) and RunHistoryChart bars (`#EF4444`, `#10B981`, `#059669` at lines ~170–178) — pull from `success`, `error`, `info`, `warning` tokens.

**Typography adjustments for Thai:**
- Font stacks: add `'IBM Plex Sans Thai'` before `ui-sans-serif` in both `sans` and `display`.
- Raise `xs`, `sm`, `base` line-heights from 1.5 to 1.6.
- Ban `font-weight: 300` anywhere in the codebase.
- Mono voice (JetBrains Mono) limited to: execution IDs, durations, field names, SQL editors.

**Radius:** promote `rounded-lg` (12px) as the default card radius. Kill the current mix of `rounded-md` + `rounded-lg` noise.

**Shadow:** demote `shadow-glow` from decorative use. Glow means "live/running," nothing else.

**Motion:** keep 120 / 200 / 300 ms durations. Wrap every `animate-*` usage with `motion-safe:` to respect `prefers-reduced-motion`. The animated counters at `DashboardPage.tsx:42–70` and `LandingPage.tsx:73–80` currently ignore this.

---

## 5. Component system

### 5.1 Generate shadcn/ui primitives

`components.json` exists but `src/components/ui/` only holds `DateRangePicker`. Generate:

> `button`, `input`, `select`, `checkbox`, `switch`, `dialog`, `sheet`, `dropdown-menu`, `popover`, `tooltip`, `tabs`, `badge`, `card`, `table`, `scroll-area`, `toast` (sonner), `skeleton`, `separator`, `avatar`, `command` (⌘K), `form`.

### 5.2 Retire hand-rolled duplicates
- `components/shared/Button.tsx` → shadcn `button` + OrbitX variants (`brand`, `outline`, `ghost`, `destructive`, `link`).
- `components/shared/Modal.tsx` + `Sheet.tsx` → shadcn `dialog` + `sheet`.
- `components/form/*` → re-exports of shadcn form primitives with OrbitX tokens.
- `components/shared/Notification.tsx` → `sonner` toast.

### 5.3 New OrbitX-owned domain components
- `<StatusPill status="success|failed|running|paused|idle" />` — the one true status shape. Replaces four inline implementations currently scattered across Dashboard, Builder, History, Connections.
- `<PipelineCard />` — replaces the inline card JSX inside `DashboardPage.tsx`.
- `<PipelineRow />` — table-row variant for denser views.
- `<ConnectionHealth />` — OAuth validity + last-sync indicator.
- `<Sparkline />` — extracted from `DashboardPage.tsx:100–127`, tokenized.
- `<RunTimeline />` — extracted from `DashboardPage.tsx:133–202`, tokenized.
- `<EmptyState variant="…" icon={…} primary={…} secondary={…} />` — one primitive, many presets.
- `<WorkspaceSwitcher />` — sidebar org picker (even if single-workspace today, the slot exists).
- `<SchemaChip field="campaign_id" type="string" />` — schema browser atom.
- `<CommandPalette />` — `⌘K` navigation + actions.

### 5.4 Split the giants

| File | Today | Split into |
|---|---|---|
| `pages/DashboardPage.tsx` | 1,206 | `pages/HomePage.tsx` (~150) + `features/home/TodayPanel.tsx` + `features/home/AttentionList.tsx` + `features/home/RunTimeline.tsx` + `features/home/PipelineGrid.tsx` |
| `pages/WorkflowBuilderPage.tsx` | 1,126 | `pages/PipelineEditorPage.tsx` (~200) + reuse existing `workflow/reactflow/*`, `workflow/Toolbar.tsx`, `workflow/Sidebar.tsx`, `node-config/NodeConfigPanel.tsx` |
| `pages/LandingPage.tsx` | 817 | `pages/LandingPage.tsx` (~120) composing `features/landing/Hero`, `Proof`, `HowItWorks`, `UseCases`, `Pricing`, `FAQ`, `CTA` |
| `components/workflow/ScheduleDeliverySheet.tsx` | 884 | `features/reports/ReportScheduler.tsx` + sub-components for Cron, Delivery, Preview |

### 5.5 Store cleanup

`src/stores/` is empty and unused. Delete it; keep everything in `src/store/`. No migration.

### 5.6 Proposed folder layout

```
web/src/
├─ app/                  router, providers, error boundary, layout shell
├─ features/
│  ├─ home/
│  ├─ pipelines/         list + detail + editor (canvas)
│  ├─ connections/
│  ├─ reports/
│  ├─ alerts/
│  ├─ data/
│  ├─ settings/
│  ├─ auth/
│  └─ landing/
├─ components/
│  ├─ ui/                shadcn primitives (generated, minimal edits)
│  ├─ domain/            OrbitX-owned (PipelineCard, StatusPill, …)
│  └─ icons/
├─ workflow/             React Flow canvas + node registry (unchanged logic)
├─ nodes/Editors/        per-node config forms (unchanged logic)
├─ store/                single Zustand source of truth
├─ services/ · hooks/ · lib/ · utils/
└─ styles/
```

---

## 6. Home (`/home`) — detailed layout

### 6.1 Desktop ≥1280

```
┌─────────────────────────────────────────────────────────────────────┐
│  SIDEBAR   │                                                        │
│            │   ┌──────────────────── Today ────────────────────┐   │
│            │   │  Runs          Failed       Attention    Saved │   │
│            │   │   142             3             2         12h  │   │
│            │   └──────────────────────────────────────────────┘   │
│            │                                                      │
│            │   ┌──── Needs attention (3) ────────────────────┐   │
│            │   │  ● Facebook Ads token expires in 2 days [Fix]│   │
│            │   │  ● "Weekly Client Report" failed 2h ago [See]│   │
│            │   │  ● No runs on "TikTok → BQ" in 48h      [See]│   │
│            │   └──────────────────────────────────────────────┘   │
│            │                                                      │
│            │   ┌── Run activity ── 7d ─ workspace ──────────┐   │
│            │   │   ▇    ▅    ▇    ▇    ▆    ▇    ▇         │   │
│            │   │   M    T    W    T    F    S    S         │   │
│            │   └──────────────────────────────────────────────┘   │
│            │                                                      │
│            │   ┌── Your pipelines ─── filter ▾ ─ [grid ▢][table ≡]│
│            │   │ [PipelineCard]  [PipelineCard]  [PipelineCard] ││
│            │   │ [PipelineCard]  [PipelineCard]  [+ New]         ││
│            │   └──────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────┘
```

- Four modules stack vertically. Module order matters: KPIs → Attention → Activity → Grid.
- **Today strip**: four KPI tiles, 1×4 on desktop, 2×2 on tablet, 1×4 scroll on mobile.
- **Attention** module collapses to a single row of pills on narrow screens.
- **Run activity** uses the extracted `<RunTimeline />`. 7-day stacked bars (success vs. failed).
- **Pipeline grid**: 3 columns ≥1280, 2 columns 1024–1279, 1 column <1024. `[grid | table]` toggle stored in sidebar-scoped preference.

### 6.2 PipelineCard

```
┌──────────────────────────────────────────────┐
│  ● Success       Weekly Client Report    ⋯   │
│  Meta · Google · TikTok  →  BigQuery         │
│  ▇▇▇▅▇▇▇▆▇▇   Ran 2h ago · 1m 24s            │
│  ┌──────┐  ┌──────┐                          │
│  │ Run  │  │ Open │                          │
│  └──────┘  └──────┘                          │
└──────────────────────────────────────────────┘
```

- `<StatusPill />` top-left.
- Title one line, truncates with tooltip.
- Source→destination one line of brand chips.
- 10-bar `<Sparkline />` reused from current implementation.
- Primary row: `Run` (brand button), `Open` (ghost button). Everything else — Edit, Duplicate, Delete, Schedule, Pause — lives in `⋯`.
- Card-level hover: border color moves from `border-subtle` → `border` + `shadow-sm`. No scale/lift — it looks toy-like on dense grids.

### 6.3 Dense (table) view

When the `[table ≡]` toggle is on, the grid becomes a shadcn `table`:

| ● | Name | Source → Dest | Last run | Next run | Sparkline | ⋯ |
|---|---|---|---|---|---|---|
| ● | Weekly Client Report | Meta, Google, TikTok → BQ | 2h ago | Mon 9:00 | ▇▇▇▅▇▇▇▆▇▇ | ⋯ |

Used heavily by operators watching many pipelines. Sorts by status first (failed → running → idle → success → paused), then last-run descending.

---

## 7. Pipelines list (`/pipelines`)

Two-tier layout. Top: filter bar. Bottom: `[grid | table]` just like Home.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Pipelines                                            [+ New]        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Search…    Status ▾   Source ▾   Destination ▾   Owner ▾    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  [grid ▢] [table ≡]                                                  │
│                                                                       │
│  Pipeline cards (same as Home) or table                              │
└──────────────────────────────────────────────────────────────────────┘
```

Empty state: "Start from a template or a blank canvas." `[Browse templates]` `[New from blank]`.

---

## 8. Pipeline detail (`/pipelines/:id`)

Four tabs. URL param `?tab=runs` preserves state.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◀  Weekly Client Report                        [Run] [Open editor]  │
│  ● Success · Ran 2h ago · 1m 24s                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Overview | Runs | Schedule | Settings                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  [tab content]                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

- **Overview:** mini canvas preview (read-only React Flow), last-run summary, next schedule, source/destination list.
- **Runs:** table from the current execution-history components. Row-click opens side sheet with full log panel (today's `ExecutionLogPanel.tsx` lives here).
- **Schedule:** the content of today's `ScheduleDeliverySheet` (884 lines), but restructured as a page, not a bottom sheet.
- **Settings:** name, description, owner, pause toggle, delete (guarded).

---

## 9. Pipeline editor (`/pipelines/:id/edit`)

React Flow stays. Visual-only refresh.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◀  Weekly Client Report              [Save] [Run] [Schedule]  [⋯]   │
│  ┌────────────────┬─────────────────────────────┬─────────────────┐  │
│  │                │                             │                 │  │
│  │  LEFT RAIL     │         CANVAS              │  RIGHT PANEL    │  │
│  │                │                             │  (node config)  │  │
│  │  Sources       │       [Source]──▶[Transform]│  Tabs:          │  │
│  │  Transforms    │           │                 │  Config         │  │
│  │  Destinations  │           ▼                 │  Schema         │  │
│  │                │        [Destination]        │  Preview        │  │
│  │                │                             │  Test           │  │
│  │  [+ add]       │                             │                 │  │
│  │                │                             │                 │  │
│  └────────────────┴─────────────────────────────┴─────────────────┘  │
│  Status strip: valid ● · 3 nodes · 2 edges · last saved 2m ago       │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.1 Node chrome

```
┌──────────────────────────┐
│ ▎ Facebook Ads      ● ok │    ← left 3px colored rail = category
│   Account: Acme Ltd      │
│   8 fields · daily       │
└──────────────────────────┘
```

- Left 3px rail color = category (source=blue, transform=purple, destination=emerald). Today the whole node is colored; too heavy.
- Status dot in top-right shows run status when a run is active (otherwise hidden).
- Node title (bold) + one-line summary (secondary text).
- Handles: single input left, single output right. Multi-in/out nodes show count chips on the handle.

### 9.2 Edges

- Default: neutral token, 1.5px.
- Hover: brand-500, 2px.
- During live run: brand-500, 2px, dashed with a slow `motion-safe:` dash animation. Kill the `#3F3F46` fallback.

### 9.3 Right panel tabs

The 700-line `NodeConfigPanel.tsx` becomes a `sheet` with 4 tabs:

- **Config** — the existing node-specific editor form.
- **Schema** — list of fields with types (`<SchemaChip />` grid).
- **Preview** — sample of upstream data (10 rows).
- **Test** — one-click "run this node only" with log output.

### 9.4 Toolbar

Trim to essentials: `Save`, `Run`, `Schedule`, `History`, `Share`. Everything else (Rename, Duplicate, Export, Import) goes to the `⋯` menu and `⌘K`.

---

## 10. Connections (`/connections`)

Grouped by category, not a flat list.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Connections                                          [+ Connect]    │
│                                                                       │
│  Ads                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Meta Ads     │  │ Google Ads   │  │ TikTok Ads   │                │
│  │ 3 accounts   │  │ 1 account    │  │ 0 accounts   │                │
│  │ ● all ok     │  │ ● token 2d   │  │ — not conn.  │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                       │
│  Web analytics · E-commerce · Warehouse · Messaging (same layout)    │
└──────────────────────────────────────────────────────────────────────┘
```

Click a platform card → detail view with account rows (token-expiry chip, last-sync time, `Reauth` button).

---

## 11. Reports / Alerts / Data

Three surfaces that don't exist today as pages. Layouts at the sketch level:

- **Reports** — list of scheduled deliveries, `[+ New report]`, each row shows destination (Slack / email / LINE), cadence, last sent. Create flow reuses the content of `ScheduleDeliverySheet.tsx`, but as a full page with tabs: `Content`, `Schedule`, `Delivery`, `Preview`.
- **Alerts** — rule list, `[+ New rule]`, each rule: "If [metric] [condition] over [window] then [notify]." Single-page form, not a canvas.
- **Data** — left: dataset list. Right: schema + preview table using shadcn `table` with sticky header. Schema viewer uses `<SchemaChip />` atoms.

---

## 12. Settings

Sidebar-within-page. Five sections: Account / Workspace / Members / Billing / API.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Settings                                                             │
│  ┌────────────────┬─────────────────────────────────────────────┐   │
│  │ Account        │                                             │   │
│  │ Workspace      │                                             │   │
│  │ Members        │        Section content                      │   │
│  │ Billing        │                                             │   │
│  │ API            │                                             │   │
│  └────────────────┴─────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

Replaces today's 25-line stub.

---

## 13. Landing page layout

Single column, alternating background surfaces.

1. **Hero** — left: headline (display font), subhead, two CTAs (`Get started` brand, `See demo` ghost). Right: single product screenshot (not a gradient).
2. **Proof strip** — "Powers X pipelines / Y clients / Z platforms" (no external logos until you have them).
3. **How it works** — three steps with icons: Connect · Build · Ship.
4. **Use cases** — three cards: in-house marketer / agency / analyst.
5. **Feature grid** — six tiles: unified schema, scheduled reports, anomaly alerts, warehouse destinations, no-SQL builder, team access.
6. **Pricing** — three tier cards (Free · Team · Agency) from CLAUDE.md.
7. **FAQ** — accordion, shadcn `accordion`.
8. **Footer CTA** — full-width banner.

Spacing: 96–128px vertical rhythm between sections. Max content width 1200px within sections.

---

## 14. Empty state playbook

Every surface uses `<EmptyState />` with one primary CTA.

| Surface | Copy | Primary | Secondary |
|---|---|---|---|
| `/home` — no pipelines | "Connect an ad platform to see your first pipeline in under 2 minutes." | Connect Meta Ads | Browse templates |
| `/home` — no connections | "OrbitX needs access to at least one ad platform." | Connect Meta Ads | Connect Google Ads |
| `/pipelines` — no pipelines | "Start from a template or a blank canvas." | Browse templates | New from blank |
| `/pipelines/:id/runs` — no runs | "This pipeline hasn't run yet." | Run now | Schedule |
| `/connections` — no connections | Platform grid directly, no blank screen | — | — |
| `/reports` — no reports | "Schedule a weekly report to Slack or email." | New report | — |
| `/alerts` — no alerts | "Get pinged when spend spikes or a pipeline fails." | New alert | — |
| `/data` — no datasets | "Run a pipeline to populate your unified marketing schema." | Go to pipelines | — |

**First-time detection:** if both `pipelines.length === 0 && connections.length === 0`, show a full-screen 3-step onboarding: pick a platform → OAuth → auto-generated starter pipeline from a template. Closes USER_JOURNEY_TASKS gaps 1.1 / 1.2 / 2.1.

---

## 15. Interaction patterns

- **⌘K command palette** — navigate to any page, run any pipeline, open any connection. Global shortcut.
- **Row hover** — background shifts to `surface-tertiary`, cursor pointer. No transform.
- **Destructive confirms** — shadcn `alert-dialog`, not a custom modal. Requires typing the resource name for delete.
- **Toasts** — `sonner`, bottom-right, 4s default. Success = check icon, error = x icon, info = info icon. All from status tokens.
- **Loading states** — shadcn `skeleton` for data-dense surfaces; `<Spinner />` only for button-level states.
- **Focus rings** — 2px brand-500 outline with 2px offset. Never remove.
- **Keyboard shortcuts** — `g h` Home, `g p` Pipelines, `g c` Connections, `n` New, `/` search, `?` shortcuts help.

---

## 16. Accessibility layout checks

- Every status pill pairs icon + text (not color alone). Today's `StatusDot` at `DashboardPage.tsx:208–216` is color-only.
- Canvas nodes get ARIA labels that describe type, status, and edge connections.
- Right-panel sheets are focus-trapped.
- `prefers-reduced-motion` disables: counter animation, pulse on running status dot, edge dash animation, card hover lift.

---

## 17. Appendix — grounding references

- `web/src/App.tsx` — current routes
- `web/tailwind.config.js` lines 10–156 — token system
- Duplicate token systems: `primary` (40–51) vs. `brand` (64–75)
- `web/src/pages/DashboardPage.tsx` (1,206 lines) — Sparkline 100–127, RunHistoryChart 133–202, StatusDot 208–216
- `web/src/pages/WorkflowBuilderPage.tsx` (1,126 lines)
- `web/src/pages/LandingPage.tsx` (817 lines)
- `web/src/pages/ConnectionsPage.tsx` (563 lines)
- `web/src/pages/SettingsPage.tsx` (25 lines — stub)
- `web/src/components/workflow/ScheduleDeliverySheet.tsx` (884 lines; hex violations `#06C755`, `#E01E5A`)
- `web/src/components/workflow/reactflow/CustomEdge.tsx` (fallback `#3F3F46`)
- `web/src/components/workflow/node-config/NodeConfigPanel.tsx` (700 lines)
- Empty `web/src/stores/` directory
- `web/USER_JOURNEY_TASKS.md` Tasks 1.1, 1.2, 2.1 — onboarding gaps
