# Frontend Sprint Plan — ORX Sprint 1 (16 Tickets)

## Context

All 16 frontend tickets in Sprint 1 are To Do and unassigned. Grouped into 5 waves ordered by priority. Sprint ends Apr 14. Work one ticket at a time, update Jira after each.

---

## Development Workflow (per ticket)

```
1. Frontend Engineer  →  Implement the fix
2. QA Tester          →  Review code quality, check for regressions
3. Test Engineer      →  Write vitest tests (if applicable)
4. Update Jira        →  Transition ticket to Done
```

- **Frontend Engineer** owns implementation — edits code, runs `tsc --noEmit`
- **QA Tester** reviews after delivery — checks CLAUDE.md rules, product sense, no broken features
- **Test Engineer** writes vitest tests where needed (component behavior changes, not cosmetic fixes)
- Team lead coordinates, updates Jira, and decides when to move to next ticket

---

## Agent Assignments

### Wave 1: Critical Bugs

| Ticket | Summary | Assigned To | Tests Needed? |
|--------|---------|-------------|---------------|
| ORX-20 | normalizeConnectorType() inconsistent casing | Frontend Engineer | Yes — unit test for the lookup map |
| ORX-22 | OAuth race condition in handleOAuthMessage | Frontend Engineer | No — manual OAuth flow test |
| ORX-21 | Dashboard API failure is silent | Frontend Engineer | No — visual check |
| ORX-23 | ExecutionTreeRow blank on empty steps | Frontend Engineer | No — visual check |
| ORX-35 | customDateError never set | Frontend Engineer | No — visual check |

### Wave 2: High Priority Bugs

| Ticket | Summary | Assigned To | Tests Needed? |
|--------|---------|-------------|---------------|
| ORX-25 | GoogleAdsEditor clears accounts silently | Frontend Engineer | No |
| ORX-27 | AccountSelector auto-selects silently | Frontend Engineer | No |
| ORX-28 | SchemaFieldSelector groups go stale | Frontend Engineer | Yes — behavior change |
| ORX-26 | Lazy panels have fallback={null} | Frontend Engineer | No — visual check |

### Wave 3: Medium Priority

| Ticket | Summary | Assigned To | Tests Needed? |
|--------|---------|-------------|---------------|
| ORX-32 | Debug execution persists after navigation | Frontend Engineer | Yes — store behavior |
| ORX-33 | Facebook redundant normalization | Frontend Engineer | Yes — unit test normalization |
| ORX-30 | Template className → cn() | Frontend Engineer | No — cosmetic |
| ORX-31 | Persist grid/list view | Frontend Engineer | No — visual check |
| ORX-34 | Sidebar drag no visual feedback | Frontend Engineer | No — visual check |

### Wave 4: Design System & Types

| Ticket | Summary | Assigned To | Tests Needed? |
|--------|---------|-------------|---------------|
| ORX-24 | Hardcoded colors | Frontend Engineer | No — cosmetic |
| ORX-29 | Unsafe `as any` assertions | Frontend Engineer | Yes — type safety |

### Wave 5: Build Config

| Ticket | Summary | Assigned To | Tests Needed? |
|--------|---------|-------------|---------------|
| ORX-39 | Code splitting in vite.config.ts | Frontend Engineer | No — verify with `npm run build` |

---

## Ticket Details

### Wave 1

**ORX-20** — `ConnectionsPage.tsx:92-101`
- Replace if-chain with lookup map → consistent snake_case output
- Must match: `facebook_ads`, `google_ads`, `google_sheets`, `tiktok_ads`, `bigquery`, `mysql`

**ORX-22** — `ConnectionsPage.tsx:160-174`
- Make `handleOAuthMessage` async, await `loadConnections()` in try/catch
- Notify success only after loadConnections succeeds

**ORX-21** — `DashboardPage.tsx:283-288`
- Add `fetchError` state, set in catch, render error banner with retry

**ORX-23** — `DashboardPage.tsx:175-218`
- Add empty state: `{isExpanded && steps.length === 0 && <message>}`

**ORX-35** — `DashboardPage.tsx:235`
- Wire `setCustomDateError()` when date range exceeds max days

### Wave 2

**ORX-25** — `GoogleAdsEditor.tsx:140-148`
- Add `notify.warning()` before clearing, fix deps, remove eslint-disable

**ORX-27** — `AccountSelector.tsx:111-114`
- Add `autoSelected` state + temporary helper text

**ORX-28** — `SchemaFieldSelector.tsx:33-50`
- Remove `initialized` flag, recalculate on `[fields]` change with additive merge

**ORX-26** — `WorkflowBuilderPage.tsx:1192+`
- Replace 6 `fallback={null}` with `<Loader2>` spinner

### Wave 3

**ORX-32** — `WorkflowBuilderPage.tsx`
- Add cleanup useEffect: `return () => { exitDebugMode(); }`

**ORX-33** — `FacebookAdsForm.tsx:23-55`
- Inline `stripAllActPrefixes` into `normalizeAccountId`, delete standalone

**ORX-30** — `Field.tsx:21,37,49,66`
- Replace 4 template literals with `cn()` from `@/lib/utils`

**ORX-31** — `WorkflowsPage.tsx:71`
- Init from localStorage, sync with useEffect

**ORX-34** — `Sidebar.tsx:66-71`
- Custom drag ghost with `setDragImage()`, `effectAllowed = 'copy'`

### Wave 4

**ORX-24** — 7+ files
- `brand-*` → `primary-*`, `red-*` → `error` tokens

**ORX-29** — `workflowTransformers.ts`, `facebook.ads.ts`, `dest.googlesheets.ts`
- Define interfaces, replace `as any` with typed access

### Wave 5

**ORX-39** — `vite.config.ts:41-44`
- Add `manualChunks` for react, reactflow, framer-motion, lucide-react

---

## Verification

- After each ticket: `npx tsc --noEmit` (type check)
- After Wave 5: `npm run build` (build + chunk size check)
- QA Tester reviews after each ticket delivery
- Test Engineer writes vitest for tickets marked "Tests Needed"
