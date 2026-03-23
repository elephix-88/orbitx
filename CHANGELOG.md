# UX/UI Revamp Changelog

## Summary

Complete visual overhaul from Bauhaus-inspired design (red/navy/teal, sharp corners, heavy uppercase) to a clean, calm, professional aesthetic (indigo accent, cool grays, rounded corners, natural casing).

**Before → After metrics:**

| Metric | Before | After |
|---|---|---|
| Arbitrary Tailwind hex (`bg-[#...]`) | 60 | 0 |
| Raw `slate-*` color classes | 405 | 0 |
| Hardcoded hex in Tailwind classes | 533 | 0 (64 remain in SVG/data only) |
| Inline `style={{}}` attributes | 414 | 25 (all justified: SVG, dynamic values) |

---

## Phase 1: Design System Foundation

### Files changed
- `web/src/index.css` — Complete rewrite
- `web/tailwind.config.js` — Complete rewrite

### Changes
- **Font:** DM Sans → Inter (400/500/600)
- **Color palette:** Bauhaus red/navy/teal/cream → Indigo accent + cool gray neutrals
  - Primary: `#E63946` (red) → `#4F46E5` (indigo-600)
  - Surfaces: `#F1FAEE` (cream) → `#FFFFFF` / `#F9FAFB` / `#F3F4F6`
  - Text: `#1D3557` (navy) → `#111827` (neutral-900)
  - Borders: `#A8DADC` (teal) → `#E5E7EB` (neutral-200)
- **Neutral scale:** 10-stop cool gray (`neutral-50` through `neutral-900`)
- **Primary scale:** 8-stop indigo (`primary-50` through `primary-700`)
- **Status colors:** 3 stops each (light/default/dark) for success/warning/error/info
- **Border radius:** 2px everywhere → `sm` (4px), `md` (6px), `lg` (8px)
- **Shadows:** 3 distinguishable levels (sm/md/lg) instead of identical sm/md/lg
- **Typography:** Removed global `uppercase` and `letter-spacing` from headings, buttons, labels
- **Button system:** Updated `.btn-primary/secondary/ghost/destructive` to new palette
- **Scrollbar:** Theme-aware using CSS variable colors
- **Date picker:** All hardcoded hex → primary indigo + semantic token colors

### New files
- `STYLE_GUIDE.md` — Token reference, usage guidelines, do's/don'ts

---

## Phase 2: Layout Shell & Navigation

### Files changed
- `web/src/components/Layout.tsx` — Complete rewrite

### Changes
- **Sidebar:** Dark navy (`#1D3557`) background → white/light with subtle border
- **Width:** 288px expanded / 80px collapsed → 240px / 56px (slimmer)
- **Navigation items:** Red left bar + uppercase labels → Indigo tint background + natural casing
- **Active state:** White text on dark bg → `primary-600` text on `primary-50` background with left accent bar
- **User section:** Dark themed → Matches sidebar, rounded avatar
- **Footer actions:** Red logout, uppercase → Natural casing, hover-to-red logout
- **Content area:** Added `max-w-6xl` centering, consistent padding
- **Theme default:** Dark mode default → Light mode default
- **Zero inline styles** (was 18)

---

## Phase 3: Shared Components

### Button (`shared/Button.tsx`)
- `outline` variant: Hardcoded hex → `border-border text-text-primary`
- `link` variant: `text-[#1D3557]` → `text-primary-600`
- `warning` variant: `bg-[#F4A261]` → `bg-warning`
- `success` variant: `bg-emerald-600` → `bg-success`
- Removed `uppercase tracking-wider` from all variants
- Sizes: `font-semibold/bold` → `font-medium`

### Card (`shared/Card.tsx`)
- Base: `bg-white dark:bg-slate-900 rounded-sm` → `bg-surface-primary rounded-lg`
- All variant borders: `[#A8DADC]` / `[#1D3557]` / `[#E63946]` → semantic tokens
- `selected`: Red border → `border-primary-500 ring-1 ring-primary-200`
- CardHeader: Removed `uppercase tracking-wider`

### Modal (`shared/Modal.tsx`)
- Header: `bg-[#1D3557] text-white` → `border-b border-border` (neutral header)
- Close button: White → `text-text-tertiary hover:text-text-primary`
- Dialog variant: All `slate-*` and `red/amber/emerald-*` → semantic tokens

### Sheet (`shared/Sheet.tsx`)
- Same header treatment as Modal (neutral instead of colored)
- All `[#A8DADC]` / `slate-*` → semantic tokens

### Toast (`shared/Toast.tsx`)
- `rounded-lg` → `rounded-md`
- `bg-green/red/yellow/blue-50` → `bg-success/error/warning/info-light`
- Icon colors → `text-success/error/warning/info`

### Notification (`shared/Notification.tsx`)
- Left border: `emerald-600` / `[#E63946]` / `[#F4A261]` / `[#457B9D]` → `success/error/warning/info`
- All `slate-*` → semantic tokens, `rounded-sm` → `rounded-md`

### Form Components (Input, Select, MultiSelect, Checkbox, Switch, FormCard, Field)
- All `[#1D3557]` / `[#A8DADC]` / `[#E63946]` / `[#457B9D]` → semantic tokens
- Focus: `border-[#1D3557] border-2` → `border-primary-500 ring-1 ring-primary-500/20`
- Labels: `text-xs font-bold uppercase tracking-wider` → `text-sm font-medium`
- Checkbox/Switch checked: `bg-[#E63946]` → `bg-primary-600`
- All `dark:*-slate-*` → automatic via semantic tokens

### Other Shared Components
- **EmptyState:** Removed `uppercase tracking-wider`, tokens for all colors
- **Skeleton:** `bg-[#A8DADC]/40` → `bg-neutral-200 dark:bg-neutral-700`
- **PageLoader:** Spinner uses `border-primary-600`, tokens for text
- **ProgressIndicator:** `brand-*` → `primary-*`, all `slate-*` → tokens
- **SessionWarningModal:** All `slate-*` / amber → semantic tokens
- **KeyboardShortcutsHelp:** All `slate-*` → tokens, removed `uppercase`
- **RouteProgressBar:** `bg-blue-500` → `bg-primary-600`
- **RouteChangeLoader:** `brand-*` gradient → `primary-*` gradient
- **SelectMenu, TimePicker, ScheduleSelector:** All `slate-*` → tokens

---

## Phase 4: Page-by-Page Revamp

### DashboardPage
- **98 inline styles** → 1 remaining (dynamic progress bar width)
- **100 hex colors** → 0
- Status config uses `success/error/info/warning` tokens
- Node type colors: `blue/purple/emerald-500` → `info/primary-500/success`
- All filter pills, stat cards, execution tree rows use tokens
- Removed all `uppercase tracking-wider` from headings

### WorkflowsPage
- **71 inline styles** → 0
- **71 hex colors** → 0
- Status config migrated to semantic token classes
- Grid/list views, action menus, dropdowns all tokenized
- `StatusConfig.borderColor` (inline style) → `borderClass` (Tailwind class)

### ConnectionsPage
- **50 inline styles** → 0
- **49 hex colors** → 0
- Connection type cards, setup modals, group rows all tokenized

### LandingPage
- **89 inline styles** → 4 remaining (dynamic transition delays, brand icon colors)
- **97 hex colors** → 14 remaining (SVG fills, gradient stops, brand-specific icon colors)
- Hero, features grid, pricing cards, flow animation all redesigned with tokens

### LoginPage
- **24 inline styles** → 0
- **31 hex colors** → 4 remaining (Google logo SVG brand fills)

### WorkflowBuilderPage
- **18 inline styles** → 0
- All loading/error/triggering states tokenized

### Workflow Builder Components
- **WorkflowNode:** Category styles from hex → `info/warning/success` token classes
- **Sidebar:** Node library panel fully tokenized
- **Toolbar:** Dark toolbar with indigo accent, natural casing
- **CustomEdge:** Reads CSS custom properties instead of hardcoded hex
- **ReactFlowCanvas:** Background, controls, legend all tokenized

### Other Components Updated
- ExecutionHistoryModal, ExecutionLogPanel, TemplateSelector, NodeConfigPanel
- ConnectionRow, ConnectionGroupRow, ConnectionHelp
- WelcomeModal, BaseEditorWrapper, createConnectorEditor, WorkflowValidation
- ColumnEditorEditor, JoinEditor
- FieldSelector, AccountSelector

### Data Files Updated
- `nodeTypes.ts` — Colors aligned to new palette (source=blue, transform=amber, dest=green)
- All node spec files — Color values updated to match

---

## Phase 5: Polish & QA

### Token compliance
- **0** arbitrary Tailwind hex colors (`bg-[#...]`, `text-[#...]`, `border-[#...]`)
- **0** raw `slate-*` color classes
- **64** hex values remain — all justified (25 SVG brand icons, 20 node data configs, 14 SVG fills/gradients, 5 CSS variable reads)
- **25** inline styles remain — all justified (SVG attributes, dynamic computed values, React Flow handle positions)

### Consistency
- All buttons use the Button component or `.btn-*` CSS classes
- All inputs use the Input component
- All cards use the Card component
- All modals use the Modal component
- Page padding: `px-6 py-6 md:px-8 md:py-8` with `max-w-6xl` centering
- Typography: `font-semibold` (600) for headings, `font-medium` (500) for interactive elements

### Typography cleanup
- `uppercase` removed from all headings, buttons, and medium+ text
- `uppercase` retained only in `text-xs` table headers and tiny status labels (11 instances)
- `font-bold` (700) eliminated — `font-semibold` (600) is maximum weight
- `tracking-wider`/`tracking-widest` removed except on tiny label elements
