# OrbitX Frontend — Redesign Brief & IA Map

**Status:** Draft v0.1 · for review
**Owner:** NSR
**Scope:** Full frontend redesign (UX + IA + component system + visual refresh + repositioning)
**First surface:** Dashboard + empty states
**Constraints:** Keep Tailwind + shadcn/ui. Thai/SEA localization-ready.

---

## 1. Executive summary

OrbitX has a healthy technical foundation — modern stack, a real design-token system, a production-grade node-based workflow builder — but the product currently *feels* like a powerful internal tool, not a consumer-grade SaaS product. The redesign is not a repaint. It is three things done together:

1. **Reposition the product story** around the two people who actually pay: the performance marketer who wants answers, and the agency operator who wants leverage across clients.
2. **Rebuild the information architecture** around a "Connect → Build → Monitor → Act" loop, with explicit empty-state onboarding at every entry point.
3. **Consolidate the component system** onto a first-class shadcn/ui foundation, eliminate four 700–1,200 line pages, and remove the two-token-system ambiguity (raw `primary`/`accent` vs. CSS-variable `brand`/`surface`).

Everything below is a means to those three ends.

---

## 2. Audience repositioning

Today's landing page is feature-forward (Database, GitBranch, BarChart3, Shield…). The redesign leads with outcomes for two buyers and one champion.

### 2.1 Primary buyers

| Persona | What they buy | Current UX pain |
|---|---|---|
| **The Performance Marketer** (in-house at a D2C brand, SEA) | "I want to know which ad is actually working across Meta + Google + TikTok, without waiting for my analyst." | Must build a workflow from a blank canvas to see a single unified number. No defaults, no templates, no starter view. |
| **The Agency Operator** (running 5–30 client accounts) | "I want one place to watch every client's pipelines and catch broken connectors before the client does." | Dashboard shows workflows, not *clients*. No workspace/org separation, no per-client health rollup. |

### 2.2 Champion (internal user inside the buyer's company)

**The Marketing Analyst.** Already comfortable with SQL, sheets, BigQuery. They build the workflows. They need the builder to be powerful but *fast to teach to a junior*. This is who defends the product internally.

### 2.3 Positioning line (draft — to workshop)

> **OrbitX is the marketing data layer for SEA.** Unify Meta, Google, and TikTok ads into one warehouse-ready schema, catch broken campaigns before your client does, and ship a weekly report without writing SQL.

**Tag in Thai for SEA-first landing:** _"รวมข้อมูลโฆษณาทุกแพลตฟอร์มไว้ที่เดียว — แจ้งเตือนเมื่อแคมเปญพัง, สรุปรายสัปดาห์อัตโนมัติ"_

**What the redesign removes from the current story:** "workflow automation," "node-based builder," "extractors/transformers/loaders." These are implementation words. They stay in-product; they leave the landing page.

---

## 3. Design principles

Five principles, applied in this priority order when they conflict.

1. **Answer before canvas.** A new user should see a useful view (even if mocked with sample data) before touching the builder. Today's entry-point is a blank workflow.
2. **One token system.** Every color in a TSX file must come from a semantic token. The raw `primary`/`accent` palette stays in `tailwind.config.js` as an internal reference for the CSS variables only.
3. **Status is a first-class surface.** Every list item, card, and row must show health at a glance (success / running / failed / paused / idle) in a consistent shape and color, across Dashboard, Connections, Builder, and History.
4. **Thai-first typography.** Line-height floors raised; don't rely on font weights that break in Thai; reserve a mono voice only for IDs, durations, and code.
5. **Destructive actions are earned.** Delete / disconnect / force-run must have two gestures. The current Dashboard mixes Pencil / Trash / MoreHorizontal on every card — we'll collapse that.

---

## 4. Information architecture — current vs. proposed

### 4.1 Current IA (as implemented in `web/src/App.tsx`)

```
/                    Landing
/login               Login
/dashboard           Workflow list + stats + run history (1,206 lines, one file)
/workflows           → redirects to /dashboard
/workflows/builder   Workflow Builder (1,126 lines, React Flow canvas)
/connections        Connections list (563 lines)
/settings            Stub (708 bytes)
```

Problems:
- Dashboard carries three jobs (list, stats, run history) and has grown to 1,206 lines in `pages/DashboardPage.tsx`.
- No concept of "client" or "workspace" → blocks the agency use case.
- No Reports/Alerts surface even though CLAUDE.md names them as current priorities (#4 and #5).
- `/settings` is empty — account, team, billing, tokens have no home.

### 4.2 Proposed IA

```
/                              Landing (repositioned, SEA-first)
/login · /signup · /invite

── App shell (left sidebar, workspace switcher on top) ──

/home                          "Today" — the answer-first view
/pipelines                     formerly "Workflows" — list + filter by client/source
/pipelines/:id                 overview, runs, schedule, settings tabs
/pipelines/:id/edit            Builder (canvas)
/connections                   grouped by platform; health-first
/reports                       scheduled + on-demand deliveries (Slack/email)
/alerts                        anomaly & failure rules
/data                          dataset browser (normalized marketing schema)
/settings/
  ├─ account                   profile, password, MFA
  ├─ workspace                 name, logo, locale (th-TH default for SEA)
  ├─ members                   invite/roles (Owner, Editor, Viewer)
  ├─ billing                   plan, invoices
  └─ api                       tokens, webhooks
```

**Renames, explained:**
- **"Workflows" → "Pipelines."** Marketers understand "data pipeline." "Workflow" collides with Zapier/Asana mental models.
- **"Dashboard" → "Home."** The home route is the answer view, not a workflow index. The workflow index lives at `/pipelines`.
- **New: `/reports`, `/alerts`, `/data`.** These aren't greenfield — CLAUDE.md already names them as priorities #4 and #5. The redesign finally gives them addresses.

### 4.3 Workspace / agency layer (new)

A **workspace switcher** in the top-left of the sidebar. A workspace groups: connections, pipelines, reports, alerts, members, billing. An agency operator swaps workspaces to move between clients; an in-house marketer has exactly one. This is the single biggest unlock for the agency persona and is near-free because the data model already separates things by user/org in the backend auth layer.

---

## 5. Design token & visual language plan

### 5.1 Fix the two-token ambiguity

The config in `web/tailwind.config.js` defines both a raw `primary` blue scale (lines 40–51) **and** a CSS-variable `brand` scale (lines 64–75) that aliases to the same values. TSX files inconsistently use both (e.g. `text-primary-500` vs `text-brand-500`). Plus `text-primary` as a semantic means "primary *text color*," which collides with `primary-500` meaning "brand blue 500."

**Rule going forward:**
- **Semantic-only in TSX.** `bg-surface-primary`, `text-text-primary`, `text-brand-500`, `border-border`, `bg-success`, etc.
- **`primary` and `accent` raw scales become internal-only**, referenced only from `:root` CSS variable declarations in `web/src/index.css`. A lint rule (or codemod) flags `text-primary-*`, `bg-primary-*`, `text-accent-*` usage in `src/**/*.tsx`.
- **Rename "accent" to "highlight"** in CSS variables to stop overloading. Amber is rarely a true brand accent; it's a highlight for pending/attention states.

### 5.2 Color
- **Brand:** keep blue-500 (`#3B82F6`) as primary. This is already in landing, dashboard, mockup — it's equity.
- **Highlight (was accent):** amber stays, but *only* for "needs attention" (pending auth, stale data, upcoming schedule).
- **Status:** keep success / warning / error / info. Add **`status-neutral`** for "paused/disabled" to stop reusing `neutral-300` ad-hoc (see `StatusDot` in `DashboardPage.tsx:214–215`).
- **Remove three hardcoded-color violations**: `#06C755` and `#E01E5A` in `components/workflow/ScheduleDeliverySheet.tsx`, and the `#3F3F46` fallback in `components/workflow/reactflow/CustomEdge.tsx`. LINE green and Slack red should live in the `BrandIcons.tsx` token set alongside Google/Facebook.

### 5.3 Typography — Thai-ready

Current:
- Display: Space Grotesk
- Body: Inter
- Mono: JetBrains Mono
- Font sizes xs=11px, sm=13px, base=14px — tight for Thai

Proposed:
- **Add Thai fallbacks** in the `fontFamily.sans` and `fontFamily.display` stacks: `'IBM Plex Sans Thai'` (open-source, pairs with Inter and Space Grotesk) before `ui-sans-serif`.
- **Raise line-height floors** for xs/sm/base to `1.6` (from `1.5`) to accommodate Thai's tone marks and sara-i/sara-u stacking. Keep heading line-heights as-is.
- **Drop `font-weight: 300`** anywhere it's used. Thai at 300 is unreadable on most screens.
- **Introduce a `locale`-aware letter-spacing**: `tracking-normal` default, `tracking-tight` only on Latin-only headings (display font).
- **Mono voice** restricted to: execution IDs, durations, field names in the schema viewer, SQL in the SQL transform node. Never for UI labels.

### 5.4 Radius, shadow, motion
- Radius scale is fine. Promote `rounded-lg` (12px) as the **default card radius** everywhere; the current mix of `rounded-md` and `rounded-lg` is noisy.
- Remove `shadow-glow` and `shadow-glow-sm` from general use. Glow implies status; keep it only for "live/running" states to reinforce principle #3.
- Keep motion durations (120/200/300ms). They're good. Add a `motion-safe:` wrapper pass to respect `prefers-reduced-motion` — the animated counters in `DashboardPage.tsx:42–70` and `LandingPage.tsx:73–80` currently ignore this.

---

## 6. Component system plan

### 6.1 Collapse into a proper shadcn/ui layer

`components.json` exists but `src/components/ui/` only contains `DateRangePicker`. We'll generate the shadcn primitives and align naming.

**Shadcn primitives to introduce (phase 1):**
`button`, `input`, `select`, `checkbox`, `switch`, `dialog`, `sheet`, `dropdown-menu`, `popover`, `tooltip`, `tabs`, `badge`, `card`, `table`, `scroll-area`, `toast` (sonner), `skeleton`, `separator`, `avatar`, `command` (for ⌘K), `form`.

**Retire / rewrite on top of shadcn:**
- `components/shared/Button.tsx` → shadcn `button` with OrbitX variants (brand, outline, ghost, destructive, link).
- `components/shared/Modal.tsx` and `Sheet.tsx` → shadcn `dialog` + `sheet`.
- `components/form/*` → one file per primitive, re-exporting shadcn with OrbitX tokens.
- `components/shared/Notification.tsx` → `sonner` toast.

**New domain components (OrbitX-owned, not shadcn):**
- `<WorkspaceSwitcher />` — org picker in sidebar
- `<StatusPill status="success|failed|running|paused|idle" />` — the one true status shape, replacing four inline implementations
- `<ConnectionHealth />` — OAuth validity + last-sync
- `<PipelineCard />` — replaces the inline card in `DashboardPage.tsx`
- `<PipelineRow />` — table row variant for denser views
- `<EmptyState variant="…" />` — parameterized empty states (see §8)
- `<SchemaChip field="campaign_id" type="string" />` — for the normalized schema viewer
- `<RunTimeline />` — replaces the inline `RunHistoryChart` at `DashboardPage.tsx:133–202`
- `<CommandPalette />` — ⌘K navigation + actions

### 6.2 Split the four giants

| File | Lines today | Split into |
|---|---|---|
| `pages/DashboardPage.tsx` | 1,206 | `pages/HomePage.tsx` (150) + `features/home/TodayPanel.tsx` + `features/home/PipelineGrid.tsx` + `features/home/RunTimeline.tsx` + `features/home/AttentionList.tsx` |
| `pages/WorkflowBuilderPage.tsx` | 1,126 | `pages/PipelineEditorPage.tsx` (200) + keep `workflow/reactflow/*`, `workflow/NodeConfigPanel.tsx`, `workflow/Toolbar.tsx`, `workflow/Sidebar.tsx` |
| `pages/LandingPage.tsx` | 817 | `pages/LandingPage.tsx` (120) composing `features/landing/Hero`, `Proof`, `HowItWorks`, `UseCases`, `Pricing`, `FAQ`, `CTA` |
| `components/workflow/ScheduleDeliverySheet.tsx` | 884 | `features/reports/ReportScheduler.tsx` + sub-components for Cron, Delivery, Preview |

### 6.3 Store cleanup

`src/stores/` is empty. Delete it and keep everything in `src/store/`. No migration needed — it's not imported.

### 6.4 Folder layout (proposed)

```
web/src/
├─ app/                      # router, providers, error boundary, layout shell
├─ features/                 # one folder per IA section
│  ├─ home/
│  ├─ pipelines/             # list + detail + editor (canvas)
│  ├─ connections/
│  ├─ reports/
│  ├─ alerts/
│  ├─ data/
│  ├─ settings/
│  ├─ auth/
│  └─ landing/
├─ components/
│  ├─ ui/                    # shadcn primitives (generated, minimal edits)
│  ├─ domain/                # OrbitX-owned (PipelineCard, StatusPill, ...)
│  └─ icons/
├─ workflow/                 # keep — React Flow canvas + node registry (crown jewel, don't touch)
├─ nodes/Editors/            # keep — per-node config forms
├─ store/                    # single source of truth for client state
├─ services/                 # API clients
├─ lib/ · hooks/ · utils/
└─ styles/
```

---

## 7. Dashboard (Home) redesign — detailed wireframe

The current `/dashboard` is a workflow list with stats on top. The new `/home` is the **answer view** — what happened since you last logged in, what needs you, and where to go next.

### 7.1 Layout (desktop ≥1280)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌────────────┐  ┌──────────────────────────────────────────────┐   │
│  │ Workspace ▾│  │ Search pipelines, connections, data…    ⌘K  │   │
│  ├────────────┤  └──────────────────────────────────────────────┘   │
│  │ 🏠 Home    │                                                     │
│  │ ⚙ Pipelines│   ┌───────────────────── Today ─────────────────┐   │
│  │ 🔌 Connect.│   │ 142 runs   3 failed   2 attention   12h saved│   │
│  │ 📄 Reports │   └──────────────────────────────────────────────┘   │
│  │ 🔔 Alerts  │                                                     │
│  │ 🗂 Data    │   ┌──── Needs attention (3) ─────────────────────┐  │
│  │            │   │ • Facebook Ads token expires in 2 days  [Fix]│  │
│  │ Settings ▾ │   │ • "Weekly Client Report" failed 2h ago  [See]│  │
│  │            │   │ • No runs on "TikTok → BQ" in 48h       [See]│  │
│  │ ── user ── │   └──────────────────────────────────────────────┘  │
│  └────────────┘                                                     │
│                   ┌── Run activity ─── 7 days ─── this workspace ──┐│
│                   │    ▇  ▅  ▇  ▇  ▆  ▇  ▇                         ││
│                   │    M  T  W  T  F  S  S                         ││
│                   └────────────────────────────────────────────────┘│
│                                                                     │
│                   ┌── Your pipelines ────────── filter ▾ · grid ▢ ─┐│
│                   │ [PipelineCard] [PipelineCard] [PipelineCard]   ││
│                   │ [PipelineCard] [PipelineCard] [+ New pipeline] ││
│                   └────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 The four home modules (in order of priority)

1. **Today strip** — four KPIs, animated, respect `prefers-reduced-motion`. Numbers: runs, failed, needs-attention, time saved (derived from successful-run × estimated-manual-minutes).
2. **Needs attention** — the most important module. Ranked list of pipelines and connections that require a human. Each row has one primary action. Replaces "go hunt for failures in a list."
3. **Run activity (7 days)** — existing `RunHistoryChart` (in `DashboardPage.tsx:133–202`), extracted into `<RunTimeline />`, workspace-scoped.
4. **Your pipelines** — the existing grid, but cards are lighter and all-in-card actions collapse behind a single `…` menu. Primary gesture on a card is **click to open** the pipeline detail, not to edit.

### 7.3 PipelineCard spec

```
┌────────────────────────────────────────────┐
│  ● Success       Weekly Client Report   ⋯  │
│  Meta · Google · TikTok  →  BigQuery       │
│  ▇▇▇▅▇▇▇▆▇▇  Ran 2h ago · 1m 24s           │
│  ┌──────┐  ┌──────┐                        │
│  │ Run  │  │ Open │                        │
│  └──────┘  └──────┘                        │
└────────────────────────────────────────────┘
```
- Status pill (one of five, from `<StatusPill />`).
- Title truncates with tooltip showing full name.
- Source→destination summary as a single line of small brand chips.
- 10-bar sparkline shows last 10 runs (already exists as `Sparkline` at `DashboardPage.tsx:100–127`, extract and tokenize colors).
- Primary action row: **Run** (brand) + **Open** (ghost). Everything else (Edit, Duplicate, Delete, Schedule, Pause) lives in `⋯`.

This removes the current `Pencil · Play · Trash · MoreHorizontal` lineup on every card, which violates principle #5.

### 7.4 Dense view (for agency operators)

Same screen, `[grid ▢ | table ≡]` toggle on the "Your pipelines" header. Table rows show: status, name, workspace (only in "All workspaces" view), source→dest, last run, next run, sparkline, actions. One workspace picker in the sidebar cycles through clients; an **"All workspaces"** item rolls up. This is the agency differentiator — it lets one operator keep 20 clients healthy from one screen.

---

## 8. Empty-state playbook

USER_JOURNEY_TASKS.md calls out the empty-dashboard problem. A blank canvas kills new users. Every surface gets an **explicit, action-oriented empty state** built on a single `<EmptyState />` primitive.

| Surface | Empty state | Primary action | Secondary |
|---|---|---|---|
| `/home` (no pipelines yet) | Illustration + "Connect an ad platform to see your first pipeline in under 2 minutes." | **Connect Meta Ads** | Browse templates |
| `/home` (no connections yet) | Illustration + "OrbitX needs access to at least one ad platform." | **Connect Meta Ads** | Connect Google Ads |
| `/pipelines` (no pipelines) | "Start from a template or a blank canvas." | **Browse templates** | New from blank |
| `/pipelines/:id/runs` (no runs) | "This pipeline hasn't run yet." | **Run now** | Schedule |
| `/connections` (no connections) | Platform grid (Meta / Google / TikTok / Shopify / GA4 / LinkedIn) | Click to connect | — |
| `/reports` (no reports) | "Schedule a weekly report to Slack or email." | **New report** | — |
| `/alerts` (no alerts) | "Get pinged when spend spikes or a pipeline fails." | **New alert** | — |
| `/data` (no datasets yet) | "Run a pipeline to populate your unified marketing schema." | **Go to pipelines** | — |

**First-time detection:** if `pipelines.length === 0 && connections.length === 0`, show a full-screen, three-step onboarding: pick a primary platform → OAuth → auto-generate a starter pipeline from a template. This maps directly to USER_JOURNEY_TASKS Tasks 1.1–2.1.

---

## 9. Other surfaces (sketch level — to detail in later revs)

### 9.1 Connections
Grouped by category (Ads / Web analytics / E-commerce / Warehouse / Messaging). Each platform card shows: logo, #connected accounts, aggregate health, "+ Add." Click into a platform to see account rows with token-expiry chip, last-sync, reauth button. Fixes the current flat list in `ConnectionsPage.tsx` (563 lines).

### 9.2 Pipeline editor (canvas)
Keep React Flow. Visual changes only:
- **Node redesign:** one consistent shape; category color on the left 3px rail instead of the whole node; status pill in bottom-right when a run is active.
- **Edges:** tokenize the `#3F3F46` fallback in `CustomEdge.tsx`; animate only during a live run.
- **Right panel (`components/workflow/node-config/NodeConfigPanel.tsx`, 700 lines):** move to a `sheet` with `tabs` (Config / Schema / Preview / Test). Extract each tab into its own file.
- **Toolbar:** reduce to: Run, Schedule, Share, History, Deploy. Everything else → ⌘K.

### 9.3 Reports
New surface. Takes the best of `ScheduleDeliverySheet.tsx` (884 lines — oversized) and hoists it to a proper page with a list of scheduled reports and a create flow. Destinations: Slack, email, LINE (SEA-specific).

### 9.4 Alerts
Rule builder on top of the existing `transform.anomaly-detector` node. "If [metric] [condition] then [deliver to]." One-page form, not a canvas.

### 9.5 Data
Browsable unified schema + dataset list. Preview table. Kicks off CLAUDE.md priority #1 (unified marketing schema).

### 9.6 Settings
Sidebar with five sections (Account / Workspace / Members / Billing / API). Fills the current 708-byte stub. Members uses shadcn `table` + role dropdown.

### 9.7 Landing
New hero: outcome-led headline, two-line subhead, `Connect your ads →` primary CTA, real screenshot (not marketing gradients). Below: logos of supported platforms, three use cases (in-house marketer / agency / analyst), pricing from CLAUDE.md ($79 Team / $249 Agency), FAQ, CTA. Thai `lang="th"` toggle persists via `useThemeStore` pattern (add `localeStore`).

---

## 10. Thai/SEA localization plan

- **i18n layer:** introduce `i18next` with `react-i18next`. Two locales at launch: `en`, `th`. Namespaces per feature.
- **All copy moves to translation files.** No string literals in TSX.
- **Date, number, currency via `Intl`.** No hardcoded `toLocaleDateString('en-US', …)` — there's one today at `DashboardPage.tsx:140`.
- **Timezone-aware timestamps.** Default to workspace TZ (Asia/Bangkok for SEA). Store UTC, render in user TZ.
- **Thai fallback fonts** added to the Tailwind font stacks (see §5.3).
- **RTL-safe:** we don't need RTL for Thai, but the redesign uses logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) to keep the door open for Arabic later.

---

## 11. Rollout plan (phased)

### Phase 0 — Foundation (1 week)
- Delete `src/stores/` (empty).
- Generate shadcn primitives into `components/ui/`.
- Consolidate token usage: lint rule that blocks `*-primary-*` and `*-accent-*` raw classes in TSX.
- Add Thai font fallback + `i18next` skeleton.
- Add `WorkspaceProvider` stub (one-workspace mode, but the shape is in place).

### Phase 1 — Home (2 weeks) — *this is the first deliverable you asked for*
- New sidebar shell + `WorkspaceSwitcher`.
- `/home` page composed of `<TodayStrip />`, `<AttentionList />`, `<RunTimeline />`, `<PipelineGrid />`.
- Extract `<StatusPill />`, `<PipelineCard />`, `<Sparkline />` from the current Dashboard.
- First-time onboarding modal (Tasks 1.1 + 1.2 from USER_JOURNEY_TASKS).
- All empty states on `/home`.

### Phase 2 — Connections + Pipelines list (1.5 weeks)
- Grouped connections page.
- `/pipelines` split from `/home`; list + table view.

### Phase 3 — Pipeline editor visual refresh (1 week)
- New node visual, edge tokenization, `NodeConfigPanel` tabs.
- No logic changes.

### Phase 4 — Reports + Alerts + Data (2 weeks)
- New surfaces from scratch on the new component system. `ScheduleDeliverySheet` is rehomed to `/reports`.

### Phase 5 — Settings + Landing (1 week)
- Settings sections. New landing page.

### Phase 6 — Polish
- Motion audit (`prefers-reduced-motion`), accessibility audit (focus rings, ARIA on status pills and canvas nodes), mobile breakpoint pass (phone = read-only; tablet = full).

**Total:** ~8.5 weeks of focused frontend work, one engineer. Each phase ships independently behind a `NEW_UI=true` flag so you can A/B with the current UI.

---

## 12. Open questions for you

These change the plan materially. Flagging for your call before I draft mockups.

1. **Workspaces / agency mode** — is this in-scope now, or phase 2? If now, we need a lightweight org model on the backend (may already exist in auth).
2. **Rename "Workflows" → "Pipelines"?** I strongly recommend yes for SEA audiences, but it touches URLs, analytics, docs. Sign-off needed.
3. **Dark mode priority** — you didn't check "Dark mode first-class" in the constraints. Should I treat dark mode as nice-to-have or keep parity?
4. **Landing page language default** — Thai or English on first visit for `*.co.th`, English otherwise? Or detect `Accept-Language`?
5. **`/reports` destinations** — launching with Slack + email, or also LINE (big in Thailand) and email-only for phase 1?
6. **Pricing on landing** — show the $79/$249 tiers from CLAUDE.md, or hide behind "Contact sales" until product is further along?

---

## 13. Appendix — grounding references

All observations in this brief are traceable to real files in the repo:

- Tailwind tokens & font stack: `web/tailwind.config.js` (lines 10–156)
- Duplicate token systems: `web/tailwind.config.js` `primary` (40–51) vs. `brand` (64–75)
- Dashboard giant: `web/src/pages/DashboardPage.tsx` (1,206 lines; sparkline at 100–127; RunHistoryChart at 133–202; StatusDot at 208–216)
- Builder giant: `web/src/pages/WorkflowBuilderPage.tsx` (1,126 lines)
- Landing giant: `web/src/pages/LandingPage.tsx` (817 lines; feature-forward hero icons at 3–21)
- Connections page: `web/src/pages/ConnectionsPage.tsx` (563 lines)
- Settings stub: `web/src/pages/SettingsPage.tsx` (708 bytes)
- ScheduleDeliverySheet: `web/src/components/workflow/ScheduleDeliverySheet.tsx` (884 lines; hardcoded `#06C755`, `#E01E5A`)
- Edge fallback color: `web/src/components/workflow/reactflow/CustomEdge.tsx` (`#3F3F46`)
- NodeConfigPanel: `web/src/components/workflow/node-config/NodeConfigPanel.tsx` (700 lines)
- Empty `src/stores/` directory alongside populated `src/store/`
- Existing onboarding gaps: `web/USER_JOURNEY_TASKS.md` Tasks 1.1, 1.2, 2.1
- TODOs: `web/src/services/workflowApiService.ts` (2× backend-not-implemented)
- Project intent & priorities: `/CLAUDE.md`
