# Dagster Migration — OrbitX Engine

## Context

OrbitX is a marketing data integration SaaS platform. Users build visual data pipelines (extract from ad platforms → transform → load to destinations) via a React Flow workflow builder.

Previously, workflow execution was handled by a custom async DAG executor (`engine/workflow.py`) orchestrated by Google Cloud Scheduler → Cloud Run Jobs. This migration replaces that with Dagster for built-in retry, scheduling, step-level observability, and run history.

The frontend is unchanged — users never interact with Dagster directly.

---

## Architecture

```
BEFORE (4 things):
  1. web          React frontend
  2. server       FastAPI API
  3. engine       Cloud Run Job (on-demand per execution)
  4. Cloud Scheduler  managed GCP service

AFTER (3 containers + postgres):
  1. web          React frontend (unchanged)
  2. server       FastAPI API (calls Dagster instead of Cloud Scheduler)
  3. dagster      engine code + dagster-daemon + dagster-webserver (via supervisord)
  4. dagster-postgres  PostgreSQL for Dagster run/event/schedule storage
```

```
Frontend → FastAPI Server → Dagster GraphQL API → dagster container runs jobs
                          → Dagster hooks write to MongoDB → Change Streams → SSE (unchanged)
```

---

## How It Works

### User creates a workflow

```
Frontend POST /create_workflow
    │
    ▼
Server saves WorkflowData to MongoDB
    │
    ▼
Server calls dagster_client.reload_code_location()
    │
    ▼
Dagster reloads → reads all workflows from MongoDB
    │
    ▼
Creates a Dagster Job per workflow (visible in Dagster UI)
Creates a Schedule per workflow (from cron expression)
```

### User clicks "Execute Now"

```
Frontend POST /workflows/execute { job_id }
    │
    ▼
Server calls dagster_client.launch_run(workflow_id, workflow_name, "all", user_id)
    │
    ▼
Dagster GraphQL Client → submit_job_execution(job_name)
    │
    ▼
Dagster daemon picks up the run → executes per-node ops:

    @op facebook_ads_extract → NodeResult(DataFrame + metadata)
         │
         ▼
    @op sql_transform → NodeResult(DataFrame + metadata)
         │
         ▼
    @op bigquery_load → writes to BigQuery

Each op wraps the existing factory/node code from engine/.
```

### Scheduled execution

```
Dagster daemon evaluates cron schedules every minute
    │
    ▼
Matching schedule found → launches job with workflow_id config
    │
    ▼
Same per-node execution as above
```

---

## Dagster UI

Available at `http://localhost:3070` (dev).

Each workflow appears as its own job:

```
Jobs:
  ├── facebook_actions_insights
  │     Ops: facebook_ads_1 → sql_2 → bigquery_3
  ├── google_ads_insights
  │     Ops: google_ads_1 → rename_2 → bigquery_3
  ├── test_join_node
  │     Ops: facebook_ads_1, google_ads_2 → join_3 → bigquery_4
  └── ...

Schedules:
  ├── facebook_actions_insights_schedule    (00 00 * * *)
  ├── google_ads_insights_schedule          (00 00 * * *)
  └── ...
```

---

## File Structure

### New: `dagster/` workspace member

```
dagster/
├── pyproject.toml                        Dependencies: dagster, dagster-graphql, common, engine
├── workspace.yaml                        Code location config
├── dagster.yaml                          Instance config (PostgreSQL storage)
└── dagster_orbitx/
    ├── __init__.py
    ├── definitions.py                    Entry point — loads workflows from MongoDB, builds jobs + schedules
    ├── graph_builder.py                  Translates WorkflowData → Dagster graph (topological sort, op wiring)
    ├── schedules.py                      Builds ScheduleDefinition per workflow
    ├── jobs/
    │   ├── __init__.py
    │   └── workflow_executor.py          sanitize_dagster_name(), build_workflow_job(), execute_workflow_op
    ├── hooks/
    │   ├── __init__.py
    │   └── execution_history.py          on_workflow_success / on_workflow_failure hooks
    └── ops/
        ├── __init__.py
        ├── node_result.py                NodeResult — DataFrame + metadata passed between ops
        ├── extractor_ops.py              make_extractor_op() — wraps SourceFactory
        ├── transformer_ops.py            make_transformer_op() — wraps TransformFactory (handles JOIN)
        └── loader_ops.py                 make_loader_op() — wraps LoaderFactory
```

### New: Docker files

```
docker/
├── dagster.Dockerfile                    Consolidated container (supervisord runs daemon + webserver)
└── dagster-supervisord.conf              Process manager config
```

### Modified: Server

```
server/server/services/
├── dagster_client.py                     NEW — DagsterGraphQLClient wrapper (launch_run, get_run_status, reload_code_location)
└── workflow.py                           MODIFIED — all scheduler_service calls replaced with dagster_client calls
```

### Modified: Config

```
server/configs/settings.yaml              Added: dagster_host, dagster_port
pyproject.toml (root)                     Added: "dagster" to workspace members
docker-compose.yml                        Added: dagster + dagster-postgres services, removed engine service
server/pyproject.toml                     Added: dagster-graphql dependency
```

### Modified: Common (bug fixes during migration)

```
common/common/model/token.py              Added missing: FacebookToken, GoogleToken, TikTokToken
common/common/model/common.py             Added missing: ConnectionConfig, ConnectionParamsConfig
```

---

## What Stays Unchanged

| Component | Status |
|-----------|--------|
| `engine/engine/node/extractors/*` | All extractor implementations — reused inside Dagster ops |
| `engine/engine/node/transformers/*` | All transformer implementations — reused inside Dagster ops |
| `engine/engine/node/loaders/*` | All loader implementations — reused inside Dagster ops |
| `engine/engine/factories/*` | Factory pattern — used by Dagster ops to create nodes |
| `engine/engine/interfaces/*` | ABCs unchanged |
| `engine/engine/services/*` | Connection service, Google auth |
| `engine/engine/utils/*` | retry, validation, datetime, dtypes |
| `common/*` | All Pydantic models (except additions noted above) |
| `web/*` | Entire frontend — zero changes |
| Server API routes | Unchanged — same endpoints, same payloads |
| Server auth, OAuth, connections, fields | Unchanged |

---

## Legacy Code to Remove (Phase 3)

| File | Reason |
|------|--------|
| `server/server/services/google/scheduler.py` | Replaced by Dagster schedules |
| `engine/engine/workflow.py` | DAG executor replaced by Dagster graph builder |
| `engine/engine/utils/logger.py` `ExecutionTracker` | Replaced by Dagster hooks (keep `log_progress`) |
| `server/pyproject.toml` `google-cloud-scheduler` | No longer needed |
| `server/pyproject.toml` `google-cloud-run` | No longer needed |

---

## Running

```bash
# Development (all 3 services)
docker compose --profile dev up --build

# Server:     http://localhost:8080
# Web:        http://localhost:5173
# Dagster UI: http://localhost:3070
```

---

## Multi-Tenancy

- Every Dagster run is tagged with `workflow_id` and `user_id`
- Run filtering by tag when querying status
- All access mediated through FastAPI server — Dagster UI is internal/debug only

## Async Compatibility

Engine nodes use `async def`. Dagster ops are sync. Each op wraps the async call with `asyncio.run()`.

## Dynamic Job Registration

When a user creates/updates/deletes a workflow, the server calls `dagster_client.reload_code_location()`. Dagster re-reads all workflows from MongoDB and rebuilds jobs + schedules. Duplicate workflow names are handled by appending `_2`, `_3`, etc.
