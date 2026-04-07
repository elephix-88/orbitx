# Step Run Rewrite — ORX-44 (Epic)

## Context

Rewriting step-run as a simplified **source node preview** feature. Uses existing `preview.py` — no new engine executor needed.

## Scope

- **Source nodes only**: Click Play → extract data → show 25-row preview
- NO transform or destination execution
- NO pin system
- Data in React state (MVP) — future: Redis

## Phase 0: Delete

- `server/server/services/step_run.py`, `pin_service.py`
- `server/server/models/pin.py`, `step_run.py`
- `server/tests/test_step_run.py`, `test_pin_service.py`
- `web/src/services/stepRunService.ts`, `pinService.ts`
- Remove step-run + pin endpoints from `workflow.py`
- Clean up step-run state in WorkflowBuilderPage, WorkflowNode, ReactFlowCanvas, workflowStore

## Phase 1: Backend (ORX-45/46)

- Reuse `server/server/services/preview.py` (already extracts source data)
- Add/verify preview endpoint: `POST /{wid}/nodes/{nid}/preview`
- Only accept source nodes (return 400 for others)
- Move `ColumnInfo` out of deleted `pin.py` into `preview.py`

## Phase 2: Frontend (ORX-47)

- `previewService.ts` — `previewNode(workflowId, nodeInstanceId)` via BaseApiService
- Play button on source nodes only (not transform, not destination)
- PreviewPanel: data table, columns, row count, error display
- React state: `previewStatusMap`, `previewResult`, `previewNodeId`

## Verification

- `cd server && uv run pytest -v`
- `cd web && npm run build`
- Manual: hover source node → click Play → see data
