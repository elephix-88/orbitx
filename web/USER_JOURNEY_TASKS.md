# OrbitX Web - User Journey Improvement Tasks

**Created:** December 9, 2025
**Goal:** Improve new user onboarding and reduce confusion in the platform

---

## Overview

Based on user journey analysis, these tasks address the key pain points:
1. No guidance for first-time users
2. Unclear connection vs workflow setup order
3. Missing templates and examples
4. Lack of inline documentation

---

## Phase 1: Critical Onboarding (P0)

### Task 1.1: First-Time User Detection + Welcome Modal
**Priority:** P0 | **Effort:** 4 hours | **Impact:** HIGH

**Problem:**
- Users land on blank dashboard with no guidance
- No distinction between new and returning users

**Solution:**
- Track `isFirstTimeUser` flag in localStorage
- Show welcome modal on first dashboard visit
- Guide user through: Connections → Workflows → Execute

**Files to Create/Modify:**
- [ ] `src/hooks/useFirstTimeUser.ts` - Detection hook
- [ ] `src/components/onboarding/WelcomeModal.tsx` - Welcome UI
- [ ] `src/pages/DashboardPage.tsx` - Integrate modal

**Acceptance Criteria:**
- [ ] First-time users see welcome modal
- [ ] Returning users skip modal
- [ ] "Don't show again" option works
- [ ] Modal guides to Connections page

---

### Task 1.2: Connection Setup Prompt in Workflow Builder
**Priority:** P0 | **Effort:** 2 hours | **Impact:** HIGH

**Problem:**
- Users create workflows before setting up connections
- Node configuration fails silently when no connections exist

**Solution:**
- Check for available connections when adding source/destination nodes
- Show inline prompt: "You need to set up [Connection Type] first"
- Quick link to Connections page

**Files to Modify:**
- [ ] `src/components/workflow/UnifiedNodeForm.tsx` - Add connection check
- [ ] `src/components/shared/ConnectionPrompt.tsx` - Reusable prompt component

**Acceptance Criteria:**
- [ ] Prompt appears when no matching connections exist
- [ ] User can navigate to Connections and return
- [ ] After adding connection, node form updates

---

## Phase 2: Templates & Documentation (P1)

### Task 2.1: Workflow Templates
**Priority:** P1 | **Effort:** 6 hours | **Impact:** HIGH

**Problem:**
- New users must understand architecture from scratch
- No examples of common use cases

**Solution:**
- Create 3-5 workflow templates for common patterns
- "Use Template" button on Workflows page
- Template preview with description

**Templates to Create:**
1. Facebook Ads → BigQuery (Marketing Analytics)
2. Google Ads → Google Sheets (Simple Reporting)
3. Facebook Ads + Google Ads → BigQuery (Multi-Source)

**Files to Create/Modify:**
- [ ] `src/data/workflowTemplates.ts` - Template definitions
- [ ] `src/components/workflow/TemplateSelector.tsx` - Template picker UI
- [ ] `src/pages/WorkflowsPage.tsx` - Add template option

**Acceptance Criteria:**
- [ ] Templates appear in "New Workflow" flow
- [ ] User can preview template before using
- [ ] Template creates workflow with pre-configured nodes
- [ ] User only needs to select connections

---

### Task 2.2: Connection Setup Documentation
**Priority:** P1 | **Effort:** 3 hours | **Impact:** MEDIUM

**Problem:**
- Users don't know how to get API credentials
- OAuth setup is cryptic

**Solution:**
- Add "How to connect" expandable sections
- Link to platform documentation
- Show step-by-step instructions

**Files to Modify:**
- [ ] `src/pages/ConnectionsPage.tsx` - Add help sections
- [ ] `src/components/connections/ConnectionHelp.tsx` - Help component

**Acceptance Criteria:**
- [ ] Each connector has "How to set up" link
- [ ] Instructions explain OAuth flow
- [ ] BigQuery shows JSON keyfile instructions
- [ ] Links to Google Cloud Console where needed

---

## Phase 3: Validation & Feedback (P2)

### Task 3.1: Workflow Validation Indicators
**Priority:** P2 | **Effort:** 4 hours | **Impact:** MEDIUM

**Problem:**
- Unclear which nodes are configured vs incomplete
- Can save invalid workflows

**Solution:**
- Visual indicators on nodes (green checkmark, yellow warning)
- "Workflow is incomplete" banner before save
- List of missing configurations

**Files to Modify:**
- [ ] `src/components/workflow/nodes/BaseNode.tsx` - Add status indicators
- [ ] `src/components/workflow/WorkflowValidation.tsx` - Validation logic
- [ ] `src/pages/WorkflowBuilderPage.tsx` - Integrate validation

**Acceptance Criteria:**
- [ ] Nodes show configuration status
- [ ] Warning appears if workflow is incomplete
- [ ] User can see list of what's missing
- [ ] Can't execute incomplete workflow

---

### Task 3.2: Test Connection Button
**Priority:** P2 | **Effort:** 2 hours | **Impact:** MEDIUM

**Problem:**
- Users don't know if connection works until workflow fails

**Solution:**
- Add "Test Connection" button for each connection
- Show success/failure feedback
- Display last test result

**Files to Modify:**
- [ ] `src/pages/ConnectionsPage.tsx` - Add test button
- [ ] `src/services/connectionService.ts` - Test API call

**Acceptance Criteria:**
- [ ] Test button appears for each connection
- [ ] Loading state during test
- [ ] Clear success/failure message
- [ ] Last tested timestamp shown

---

## Summary: Priority Order

| Priority | Task | Effort | Status |
|----------|------|--------|--------|
| P0 | 1.1 Welcome Modal | 4h | ✅ Done |
| P0 | 1.2 Connection Prompt | 2h | ✅ Done |
| P1 | 2.1 Workflow Templates | 6h | ✅ Done |
| P1 | 2.2 Connection Docs | 3h | ✅ Done |
| P2 | 3.1 Validation Indicators | 4h | ✅ Done |
| P2 | 3.2 Test Connection | 2h | ✅ Done |

**Total Effort:** ~21 hours

---

## Changelog

### December 9, 2025 (Session 2)
- ✅ **Task 1.1 Completed:** First-Time User Detection + Welcome Modal
  - Created `src/hooks/useFirstTimeUser.ts` - Detects first-time users via localStorage
  - Created `src/components/onboarding/WelcomeModal.tsx` - 3-step onboarding modal with:
    - Step progression indicators
    - Direct links to Connections, Workflows, Dashboard
    - "Skip onboarding" option
  - Created `OnboardingChecklist` component - Sidebar widget showing progress (X/3)
  - Integrated in `DashboardPage.tsx`:
    - Fetches connection count alongside workflows
    - Shows WelcomeModal for first-time users
    - Shows OnboardingChecklist until user completes all steps

- ✅ **Task 1.2 Completed:** Connection Setup Prompt in Workflow Builder
  - Enhanced `src/components/forms/fields/ConnectionSelector.tsx`:
    - Improved empty state with clear title, description, and "Go to Connections" button
    - Added navigation to Connections page when no connections found
  - Created `src/components/shared/ConnectionPrompt.tsx`:
    - Reusable component with variant and size options
    - Warning and info variants
    - `InlineConnectionPrompt` for compact display in forms

- ✅ **Task 2.1 Completed:** Workflow Templates
  - Created `src/data/workflowTemplates.ts` with 5 templates:
    1. Facebook Ads → BigQuery (Marketing Analytics)
    2. Google Ads → Google Sheets (Simple Reporting)
    3. Multi-Source Marketing (FB + Google → BigQuery)
    4. Facebook Ads → MySQL (Database Storage)
    5. Google Ads → BigQuery (Enterprise Analytics)
  - Created `src/components/workflow/TemplateSelector.tsx`:
    - Modal with search and category filtering
    - Template preview with difficulty, setup time, data flow visualization
    - Setup tips for each template
  - Updated `WorkflowsPage.tsx`:
    - "New Workflow" dropdown with "Blank" and "From Template" options
  - Updated `WorkflowBuilderPage.tsx`:
    - Accepts template data via location state
    - Auto-populates nodes and connections from template

### December 9, 2025 (Session 3)
- ✅ **Task 3.1 Completed:** Workflow Validation Indicators
  - Created `src/components/workflow/WorkflowValidation.tsx`:
    - `validateWorkflow()` - Validates entire workflow structure
    - `validateNodeConfiguration()` - Checks node-specific required fields
    - `validateNodeConnections()` - Ensures proper data flow connections
    - `ValidationBanner` component - Shows workflow-level validation status
    - `NodeValidationIndicator` component - Small status icon for nodes
    - `ValidationSummary` component - Compact validation overview
  - Updated `src/components/workflow/nodes/CompactBaseNode.tsx`:
    - Added validation props (validationStatus, validationIssues)
    - Visual indicators: green checkmark (valid), amber warning, red error, gray dot (unconfigured)
    - Border styling reflects validation status (dashed for unconfigured)
  - Updated `src/components/workflow/WorkflowNode.tsx`:
    - Passes validation props to CompactBaseNode
  - Updated `src/components/workflow/WorkflowCanvas.tsx`:
    - Computes validation for all nodes using useMemo
    - Passes validation status/issues to each rendered node
  - Node validation rules:
    - Facebook Ads: requires connection_id, ad_account_id
    - Google Ads: requires connection_id, customer_id
    - BigQuery: requires connection_id/project_id, dataset, table
    - MySQL: requires connection_id/host, table
    - Google Sheets: requires connection_id, spreadsheet_id

- ✅ **Task 3.2 Completed:** Test Connection Button
  - Created `src/services/connectionService.ts`:
    - `testConnection()` - Tests connection with backend API or fallback
    - `testConnectionFallback()` - Verifies connection by fetching details
    - `getConnectionStatusDisplay()` - Helper for status label/color
    - `TestConnectionResult` interface with success, message, latency fields
  - Updated `src/pages/ConnectionsPage.tsx`:
    - Added Test button for each connected connection card
    - Shows loading spinner during test
    - Color-coded button based on test result (green/red/blue)
    - Displays test result with checkmark/X icon
    - Shows latency in milliseconds after test
    - Notifies user of test success/failure
  - Updated `src/components/connections/ConnectorCard.tsx`:
    - Changed `secondaryText` prop to accept `ReactNode` for richer display

### December 9, 2025
- Created task list based on user journey analysis
