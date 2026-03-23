# UX/UI Audit — OrbitX Web Application

**Date:** 2026-03-20
**Scope:** `/web/src/` — React frontend only
**Status:** Phase 0 complete. No code changed.

---

## 1. Project Structure

```
web/
├── src/
│   ├── App.tsx                      # Root component, route definitions
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Global styles (~425 lines)
│   │
│   ├── pages/                       # Page containers (6 pages)
│   │   ├── LandingPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── WorkflowsPage.tsx
│   │   ├── WorkflowBuilderPage.tsx
│   │   ├── ConnectionsPage.tsx
│   │   └── auth/LoginPage.tsx
│   │
│   ├── components/
│   │   ├── Layout.tsx               # Main app shell (sidebar + content)
│   │   ├── auth/                    # ProtectedRoute
│   │   ├── connections/             # 8 components (ConnectionRow, ConnectorCard, selectors...)
│   │   ├── dashboard/               # Dashboard sub-components
│   │   ├── editors/                 # BaseEditorWrapper, createConnectorEditor
│   │   ├── forms/                   # FacebookAdsForm, TikTokAdsForm, WorkflowMetaForm, fields/
│   │   ├── icons/                   # BrandIcons (Facebook, Google, TikTok, BigQuery, MySQL, Sheets)
│   │   ├── layout/                  # Layout sub-components
│   │   ├── onboarding/              # WelcomeModal
│   │   ├── providers/               # Context providers
│   │   ├── shared/                  # 18+ reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── ConnectionPrompt.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── KeyboardShortcutsHelp.tsx
│   │   │   ├── Modal.tsx + Dialog
│   │   │   ├── Notification.tsx
│   │   │   ├── OfflineIndicator.tsx
│   │   │   ├── PageLoader.tsx
│   │   │   ├── ProgressIndicator.tsx
│   │   │   ├── RouteChangeLoader.tsx
│   │   │   ├── RouteProgressBar.tsx
│   │   │   ├── SessionWarningModal.tsx
│   │   │   ├── Sheet.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── form/               # 11 form components
│   │   │       ├── Input.tsx
│   │   │       ├── Select.tsx
│   │   │       ├── SelectMenu.tsx
│   │   │       ├── MultiSelect.tsx
│   │   │       ├── Checkbox.tsx
│   │   │       ├── Switch.tsx
│   │   │       ├── Field.tsx
│   │   │       ├── Grid.tsx
│   │   │       ├── Section.tsx
│   │   │       ├── FormCard.tsx
│   │   │       ├── TimePicker.tsx
│   │   │       └── ScheduleSelector.tsx
│   │   ├── ui/                      # DateRangePicker
│   │   ├── workflow/                # Workflow builder UI
│   │   │   ├── Sidebar.tsx          # Node library panel
│   │   │   ├── Toolbar.tsx          # Builder toolbar
│   │   │   ├── ExecutionHistoryModal.tsx
│   │   │   ├── ExecutionLogPanel.tsx
│   │   │   ├── TemplateSelector.tsx
│   │   │   ├── UnifiedNodeForm.tsx
│   │   │   ├── WorkflowValidation.tsx
│   │   │   ├── builder/
│   │   │   ├── node-config/         # NodeConfigPanel
│   │   │   └── reactflow/           # ReactFlowCanvas, WorkflowNode, CustomEdge
│   │   └── workflows/              # Workflow list components
│   │
│   ├── nodes/Editors/               # Node editor forms
│   │   ├── source/                  # FacebookAdsEditor, TikTokAdsEditor, GoogleAdsEditor
│   │   ├── transform/              # RenameEditor, JoinEditor, SqlTransformEditor, ColumnEditorEditor
│   │   └── destination/            # GoogleSheetsEditor, BigQueryEditor, MySQLEditor
│   │
│   ├── services/                    # 13 API service files
│   ├── store/                       # 5 Zustand stores
│   ├── hooks/                       # 14 custom hooks
│   ├── types/                       # 4 type definition files
│   ├── schemas/                     # Zod validation schemas
│   ├── utils/                       # 7 utility files
│   ├── workflow/                    # Node specs + registry
│   ├── data/                        # Static data (nodeTypes, templates)
│   ├── lib/                         # fetchClient, utils (cn), API helpers
│   ├── config/                      # env.ts
│   └── assets/icons/               # SVG brand icons
```

---

## 2. Pages & Routes

| Route | Page Component | Layout | Description |
|---|---|---|---|
| `/` | `LandingPage.tsx` | None | Public marketing/landing page |
| `/login` | `auth/LoginPage.tsx` | None | Google OAuth login |
| `/dashboard` | `DashboardPage.tsx` | `Layout` (sidebar) | Execution history, stats, recent activity |
| `/workflows` | `WorkflowsPage.tsx` | `Layout` (sidebar) | Workflow list, search, CRUD, execute |
| `/workflows/builder` | `WorkflowBuilderPage.tsx` | None (custom toolbar) | Visual workflow editor (React Flow canvas) |
| `/connections` | `ConnectionsPage.tsx` | `Layout` (sidebar) | Data source/destination connection management |

**Routing:** React Router DOM v6.22.3, `BrowserRouter`, lazy-loaded pages with `Suspense`.
**Auth:** `ProtectedRoute` wrapper checks Zustand auth store, redirects to `/login`.

---

## 3. Current Styling Approach

**Framework:** Tailwind CSS v3.4.1 with PostCSS + Autoprefixer
**Component variants:** class-variance-authority (CVA) v0.7.1
**Class merging:** clsx v2.1.1 + tailwind-merge v3.3.1 via `cn()` utility
**Animations:** Framer Motion v12.23.24
**Icons:** Lucide React v0.525.0 + custom SVG brand icons

### Token System (CSS Variables)

Defined in `index.css` `:root` and `.dark` — uses RGB triplet format for Tailwind alpha support.

Mapped to Tailwind in `tailwind.config.js` under:
- `colors.brand.*` (50-900)
- `colors.surface.*` (primary, secondary, tertiary, dark)
- `colors.text.*` (primary, secondary, tertiary, inverse)
- `colors.border.*` (primary, secondary)
- `colors.success/warning/error/info`

Also defines hardcoded `colors.bauhaus.*` (red, blue, yellow, cream, teal, steel) — duplicate of variable-based tokens.

---

## 4. Shared/Reusable UI Components

| Component | File | Uses CVA | Uses Tokens | Notes |
|---|---|---|---|---|
| Button | `shared/Button.tsx` | Yes | Partial | outline/link/warning/success use `[#hex]` |
| Card | `shared/Card.tsx` | Yes | No | All variants use `[#hex]` hardcodes |
| Modal | `shared/Modal.tsx` | Yes | No | Header bg `[#1D3557]`, borders `[#A8DADC]` |
| Dialog | `shared/Modal.tsx` | No | No | Uses raw slate-* Tailwind colors |
| Sheet | `shared/Sheet.tsx` | Yes | No | Borders `[#A8DADC]`, header `[#1D3557]` |
| Notification | `shared/Notification.tsx` | Yes | Partial | Bauhaus hex for left borders, slate-* for text |
| Toast | `shared/Toast.tsx` | No | No | Completely different system — green/red/yellow/blue |
| Input | `shared/form/Input.tsx` | No | No | All hex hardcoded: `[#1D3557]`, `[#A8DADC]`, `[#E63946]` |
| Select | `shared/form/Select.tsx` | No | No | Same hex hardcodes as Input |
| MultiSelect | `shared/form/MultiSelect.tsx` | No | No | Hex hardcodes |
| Checkbox | `shared/form/Checkbox.tsx` | No | No | Hex hardcodes |
| Switch | `shared/form/Switch.tsx` | No | No | Hex hardcodes |
| EmptyState | `shared/EmptyState.tsx` | No | No | `[#F1FAEE]`, `[#1D3557]`, `[#A8DADC]` |
| Skeleton | `shared/Skeleton.tsx` | No | No | `[#A8DADC]/40` hardcoded |
| PageLoader | `shared/PageLoader.tsx` | No | No | Hex hardcodes |
| ConfirmDialog | `shared/ConfirmDialog.tsx` | No | - | Wraps Modal |
| ErrorBoundary | `shared/ErrorBoundary.tsx` | No | - | Functional wrapper |

---

## 5. Current Color Palette (Actually in Use)

### Bauhaus Palette (primary identity)
| Name | Hex | Usage |
|---|---|---|
| Bauhaus Red | `#E63946` | Primary accent, CTAs, active states, errors, brand |
| Bauhaus Blue | `#1D3557` | Sidebar bg, text primary, modal headers, deep contrast |
| Bauhaus Yellow | `#F4A261` | Warnings, secondary accent, "AUTOMATION" label |
| Bauhaus Cream | `#F1FAEE` | Page backgrounds, light surfaces |
| Bauhaus Teal | `#A8DADC` | Borders, text tertiary, scrollbar, skeletons |
| Bauhaus Steel | `#457B9D` | Text secondary, hover states, info color |

### Semantic Colors
| Name | Value | Usage |
|---|---|---|
| Success | `#22C55E` / emerald-500/600 | Success states |
| Error | `#E63946` | Same as brand red |
| Warning | `#F4A261` | Same as brand yellow |
| Info | `#457B9D` | Same as brand steel |

### Colors That Shouldn't Be Here (raw Tailwind defaults)
- `slate-*` (50-950) — 405 occurrences across 37 files for dark mode
- `red-*` (400-500) — used in Toast, some error states
- `green-*` (50-800) — used in Toast success
- `yellow-*` (50-800) — used in Toast warning
- `blue-*` (50-800) — used in Toast info, DashboardPage status
- `amber-*` — used in Dialog warning variant
- `emerald-*` — used in Button success variant, Notification success
- `purple-500` — used in DashboardPage for transform node type
- `gray-500` — scattered usage

---

## 6. Font Configuration

| Property | Value |
|---|---|
| Primary font | DM Sans (Google Fonts) |
| Fallback | Inter, ui-sans-serif, system-ui |
| Monospace | JetBrains Mono (400, 500, 600) |
| Body size | 15px |
| Body weight | 400 |
| Body line-height | 1.6 |
| H1-H2 | weight 700, uppercase, tracking 0.02em |
| H3-H6 | weight 700 |
| Buttons | weight 600, uppercase, tracking 0.05em |
| Labels | weight 600, 12px, uppercase, tracking 0.08em |

### Font Sizes Actually Used
- `10px` — "AUTOMATION" subtitle
- `12px` / `text-xs` — labels, small text
- `13px` — btn-base font-size
- `14px` / `text-sm` — most body text, descriptions
- `15px` / `text-[15px]` — body default, md button
- `16px` / `text-base` — card headers, lg button
- `18px` / `text-lg` — modal titles, empty state titles
- `20px` / `text-xl` — logo letter
- Mixed larger sizes on Landing/Login pages

---

## 7. Spacing Values

**Tailwind scale + 3 custom values:** 18 (4.5rem), 22 (5.5rem), 26 (6.5rem).

### Spacing Actually Used (from inline styles)
- `px-3`, `px-4`, `px-5`, `px-6`, `px-8`, `px-10` — all over the place
- `py-2`, `py-2.5`, `py-3`, `py-4`, `py-5`, `py-6`, `py-8` — inconsistent per component
- `gap-2`, `gap-3`, `gap-4` — varies by page
- `space-y-1`, `space-y-2`, `space-y-3`, `space-y-4` — varies
- `p-4 md:p-8` — main content area padding
- `h-20` (80px) — sidebar logo area height
- `w-20` (80px) — collapsed sidebar width
- `w-72` (288px) — expanded sidebar width

---

## 8. Border Radius

**Config declares:** 2px for sm/default/md/lg/xl/2xl, 9999px for full.

### Actual Usage (Inconsistencies)
- Most components: `rounded-sm` (2px) — correct
- **Toast.tsx:** `rounded-lg` — violates the 2px system
- **Toast close button:** `rounded-md` — violates
- **DashboardPage:** several `rounded-lg`, `rounded-xl` occurrences
- **Landing/Login pages:** `rounded-lg` scattered throughout

---

## 9. Shadow Configuration

**Config declares:**
- sm: `0 1px 2px rgba(0,0,0,0.04)`
- default/md/lg: `0 2px 4px rgba(0,0,0,0.05)` — all identical (effectively only 2 shadow levels)

### Actual Usage
- `shadow-sm`, `shadow-md` in components — correct but indistinguishable
- `shadow-lg` in Toast — same as md, no visual distinction
- Inline shadows not found (good)

---

## 10. Navigation Structure

### Main App Shell (Layout.tsx)
- **Sidebar (left):** Fixed position, 288px expanded / 80px collapsed
  - Logo area (h-20) with brand mark
  - 3 nav items: Dashboard, Workflows, Connections
  - User profile section
  - Footer: Theme toggle, Logout, Collapse toggle
  - Active state: white bg at 8% opacity + 4px red left bar
  - 18 inline style attributes (worst offender in layout)

### Workflow Builder (custom layout, no sidebar)
- **Toolbar (top):** Back button, sidebar toggles, execute/save/settings buttons, theme toggle
- **Left sidebar:** Node library with search, collapsible
- **Right panel:** Node config (Sheet component)
- **Canvas:** React Flow (XYFlow) with custom nodes and edges

### No topbar on standard pages — page title is inside the content area.
### No breadcrumbs anywhere.
### No tabs — category filtering is done via dropdown/pills on individual pages.

---

## 11. Inconsistencies Found

### Critical: Hardcoded Colors Everywhere
| Category | Count | Files |
|---|---|---|
| Hardcoded hex (`#XXXXXX`) in TSX/TS | **533** | 38 files |
| Inline `style={{}}` attributes | **414** | 20 files |
| Tailwind arbitrary colors (`bg-[#...]`) | **60** | 14 shared components |
| Raw Tailwind slate-* colors | **405** | 37 files |

The token system exists but is barely used. Components reference hex values directly instead of the `surface-*`, `text-*`, `border-*`, `brand-*` token classes.

### Duplicate Notification Systems
1. **Notification.tsx** — CVA-based, Bauhaus palette, left-border accent, used via `useNotification` hook + Zustand store
2. **Toast.tsx** — Independent system, raw Tailwind colors (green/red/yellow/blue), `rounded-lg` (violates design), used via `useToast` hook with local state

These serve the same purpose but look completely different and use different color systems.

### Mixed Dark Mode Approaches
- CSS variables (`--surface-primary`, etc.) properly invert in `.dark` — but almost no components use the token classes
- Most components use `dark:bg-slate-*` / `dark:text-slate-*` / `dark:border-slate-*` — raw Tailwind colors unrelated to the Bauhaus palette
- Result: dark mode looks like a completely different app from a different design system

### Button Variant Inconsistencies
- `primary`, `secondary`, `ghost`, `destructive` — use CSS classes from `index.css` (`.btn-primary`, etc.)
- `outline` — inline Tailwind with `[#1D3557]`, `[#F1FAEE]` hex values
- `link` — inline Tailwind with `[#1D3557]`
- `warning` — inline Tailwind with `[#F4A261]`, `[#E08C4A]`, `[#1D3557]`
- `success` — uses `emerald-600/700` (not from Bauhaus palette)

### Card Hardcodes
All card variants use `[#A8DADC]`, `[#1D3557]`, `[#E63946]` directly instead of `border-border-primary`, `border-surface-dark`, `border-brand-500`.

### Modal Header Pattern
- Modal header: `bg-[#1D3557]` with white text — hardcoded hex
- Sheet header: same pattern, same hardcode
- Dialog: no header, uses `slate-950` / `slate-50` — completely different look

### Typography Inconsistencies
- Card header: `text-base font-bold uppercase tracking-wider text-[#1D3557]`
- Empty state title: `text-lg font-bold uppercase tracking-wider text-[#1D3557]`
- Modal title: `text-lg font-bold uppercase tracking-wider`
- Dialog title: `text-lg font-semibold text-slate-950` — different weight, no uppercase
- Notification title: `text-base font-semibold text-slate-900` — different weight, no uppercase

### Status Color Inconsistencies
- **DashboardPage statusConfig:** emerald-500, red-500, blue-500, amber-500
- **WorkflowsPage statusConfig:** custom hex colors per status, different from Dashboard
- **WorkflowNode:** green-500, yellow-500, red-500 for validation
- **Toast:** green-50/200/800, red-50/200/800, yellow-50/200/800, blue-50/200/800
- **Notification:** emerald-600, `#E63946`, `#F4A261`, `#457B9D`

There is no single, consistent way status colors are applied.

### Form Component Inconsistencies
- Input uses `border-[#A8DADC]`, focus `border-[#1D3557]`
- Select uses same pattern but independently coded
- MultiSelect same pattern independently
- None use token classes despite tokens being defined for these exact colors

---

## 12. Heaviest/Most Complex Pages

| Page | Inline Styles | Hex Colors | Complexity Notes |
|---|---|---|---|
| **DashboardPage** | 98 | 100 | Most complex — stats cards, execution tree, filters, date picker, expandable rows, multiple status states |
| **LandingPage** | 89 | 97 | Marketing page — many sections, animations, gradient text, hero, features grid |
| **WorkflowsPage** | 71 | 71 | Grid/list views, action menus, status badges, search, filters, template selector modal |
| **ConnectionsPage** | 50 | 49 | Connection type grid, OAuth flows, expand/collapse groups, setup modals |
| **LoginPage** | 24 | 31 | OAuth button, animated background, branding |
| **WorkflowBuilderPage** | 18 | 18 | Mostly composition — complexity is in child components (canvas, toolbar, panels) |

### Heaviest Component Trees
1. **Workflow Builder** (combined): ReactFlowCanvas + WorkflowNode + Toolbar + Sidebar + NodeConfigPanel + ExecutionLogPanel — most interactive states, drag-and-drop, real-time updates
2. **DashboardPage**: execution history tree with nested expandable rows, stat cards with conditional rendering, time range filtering
3. **WorkflowsPage**: dual view modes (grid/table), workflow action menus, status management, template selector

---

## 13. Summary of Work Needed

### Phase 1 — Design System Foundation
- Replace the Bauhaus palette with a clean, calm design (per brief: Linear/Notion/Vercel aesthetic)
- New color tokens: neutral gray scale, single calm accent (blue/indigo), semantic colors
- Typography: simplify — remove uppercase everywhere, reduce tracking, normalize weights
- Spacing: enforce 4px base scale consistently
- Border radius: expand from 2px to 4-8px range
- Shadows: create distinguishable sm/md/lg levels

### Phase 2 — Layout Shell
- Redesign sidebar: lighter, cleaner, remove Bauhaus blue background
- Add proper topbar with page title pattern
- Fix the 18 inline styles in Layout.tsx
- Add mobile responsive sidebar (currently no mobile handling)

### Phase 3 — Shared Components
- Rewrite all 29+ shared components to use token classes instead of hex values
- Consolidate Toast and Notification into one system
- Align Dialog with Modal styling
- Standardize all interactive states
- Replace all `[#hex]` and `slate-*` with token classes

### Phase 4 — Page-by-Page
- Dashboard: 98 inline styles to replace, status colors to standardize
- WorkflowsPage: 71 inline styles, mixed status patterns
- ConnectionsPage: 50 inline styles
- LandingPage: 89 inline styles, 97 hex colors — full visual overhaul
- LoginPage: 24 inline styles
- WorkflowBuilder: clean up child components (toolbar, sidebar, nodes)

### Phase 5 — Polish
- Kill all remaining hardcoded hex (target: 0 across all TSX)
- Kill all inline `style={{}}` attributes (target: 0 except brand icons SVG)
- Verify all dark mode uses CSS variable tokens
- Responsive testing at 1440/1024/768/375px
- Verify all empty/loading/error states

---

*Phase 0 complete. No code was changed. This document is the reference for all subsequent phases.*
