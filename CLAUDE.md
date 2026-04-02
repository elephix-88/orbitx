# OrbitX — Project Intelligence

## What Is OrbitX

Marketing Data Intelligence Platform. Collects data from ad platforms (Facebook, Google, TikTok), unifies into one schema, transforms, loads to warehouses, and will soon add AI insights + anomaly alerts + automated reports.

**Target customers:** Performance marketers, marketing analysts, agencies managing multiple clients.
**Target market:** Thailand/SEA first, then global.
**Business model:** SaaS — Free tier → $79/mo Team → $249/mo Agency.

## Architecture

```
web/          React 18 + TypeScript + Vite + Tailwind + Zustand + React Flow
server/       Python 3.13 + FastAPI + MongoDB + JWT auth
engine/       Python 3.13 + async extractors/transformers/loaders + Prefect orchestration
common/       Shared Pydantic models across server/engine
```

## Key Patterns

### Adding a New Data Source (Connector)

Every source follows the same pattern. Files needed:

1. **Engine extractor:** `engine/engine/node/extractors/{platform}_extractor.py`
   - Implements async `extract()` → returns `ExtractorResult(data, primary_keys, field_schemas)`
   - Handles API auth, pagination, rate limiting, field mapping

2. **Common model:** `common/common/model/{platform}/config.py`
   - Pydantic config model (connection_id, account_id, fields, time_config)
   - For ad platforms, inherit from `BaseAdsConfig`

3. **Server OAuth:** `server/server/api/{platform}/oauth.py` + `server/server/services/{platform}/`
   - OAuth flow endpoints (authorize, callback, refresh)
   - Account listing endpoints

4. **Frontend node spec:** `web/src/workflow/node-specs/{platform}.ts`
   - displayName, category, description, color, default config

5. **Frontend editor:** `web/src/nodes/Editors/source/{Platform}Editor.tsx`
   - Config form UI (account selector, field picker, date range)

6. **Registry:** Add to `web/src/workflow/registry.ts` and `web/src/data/nodeTypes.ts`

7. **Factory:** Register in engine factory (`engine/engine/factories/`)

### Adding a New Destination

Same pattern as source but with `Loader` interface:
- `engine/engine/node/loaders/{platform}_loader.py`
- Implements async `load(data)` with merge_keys + field_schemas
- Supports insert modes: append, truncate, upsert

### Adding a New Transform

- `engine/engine/node/transformers/{name}_transformer.py`
- Implements async `transform(data)` → returns modified DataFrame
- Optionally implements `update_field_schemas()` for schema propagation

### Workflow Execution Flow

```
User clicks "Run" in web UI
  → POST /api/workflow/workflows/execute
  → Server creates ExecutionHistory doc, calls prefect_client.launch_run()
  → Prefect Cloud dispatches to local worker
  → @flow loads workflow from MongoDB, executes @tasks in topological order
  → Each task: extractor.extract() → transformer.transform() → loader.load()
  → Per-node status written to MongoDB execution_history
  → Frontend SSE polls MongoDB for real-time status updates
```

### Design System

- Tailwind CSS with CSS variable tokens (see STYLE_GUIDE.md)
- Colors: indigo primary, cool gray neutrals, semantic status colors
- Components: CVA-based variants in `web/src/components/shared/`
- Use `cn()` from `web/src/lib/utils.ts` for class merging
- NO hardcoded hex colors in TSX files. Use token classes.

## Current Priorities

1. Build unified marketing schema (auto-normalize across ad platforms)
2. Add LinkedIn Ads, GA4, Shopify sources
3. Add data preview in builder
4. Add Slack/email alerts and reports
5. Launch free tier and start acquiring Thai agencies

## Code Quality Rules

- Python: use ruff for linting, uv for packages, Pydantic for all models
- TypeScript: strict mode, Zod for validation, no `any` types
- Tests: vitest (frontend), pytest (backend)
- Every new connector must include at least basic integration tests
- Use loguru for all Python logging (never stdlib logging)
- Use dynaconf for config (settings.yaml + .env overrides)
