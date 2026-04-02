# OrbitX

Marketing data intelligence platform. Connects ad platforms, unifies data into one schema, transforms, and loads to warehouses — with a visual workflow builder.

## Architecture

```
web/        React 18 + TypeScript + Vite + Tailwind + Zustand + React Flow
server/     Python 3.13 + FastAPI + MongoDB + JWT auth
engine/     Async extractors / transformers / loaders + Prefect orchestration
common/     Shared Pydantic models across server and engine
docker/     Dockerfiles and supervisord configs
```

## Prerequisites

- Docker and Docker Compose
- MongoDB (Atlas or local — connection string in `.env`)

For local development without Docker:
- Python 3.13+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

## Getting Started

### 1. Configure environment

```bash
cp configs/.env.example .env
cp web/.env.example web/.env
```

Fill in your credentials. Required vars:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `MONGO_USERNAME` | MongoDB username |
| `MONGO_PASSWORD` | MongoDB password |
| `MONGO_DATABASE` | MongoDB database name |
| `JWT_SECRET` | Secret for JWT token signing |
| `OAUTH_STATE_SECRET` | Secret for OAuth state |
| `PREFECT_API_URL` | Prefect server URL (default: `http://prefect-server:4200/api`) |
| `PREFECT_WORK_POOL` | Prefect work pool name (default: `orbitx-worker-pool`) |
| `VITE_API_BASE_URL` | Backend URL for frontend (default: `http://localhost:8080`) |

### 2. Run with Docker Compose

```bash
docker compose up --build
```

This starts 4 services:

| Service | Port | Description |
|---------|------|-------------|
| `web` | 5173 | Vite dev server with HMR |
| `server` | 8080 | FastAPI + Prefect worker (supervisord) |
| `prefect-server` | 4200 | Prefect dashboard and API |
| `prefect-postgres` | — | PostgreSQL for Prefect metadata (ephemeral) |

**Rebuild from scratch** (resets Prefect state):

```bash
docker compose down && docker compose up --build
```

**Run only specific services** (skip what you don't need):

```bash
# Backend + Prefect only (no frontend)
docker compose up server prefect-server prefect-postgres

# Frontend only (backend already running)
docker compose up web

# Backend only (no Prefect, no frontend — for API-only work)
docker compose up server
```

### 3. Verify everything is running

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/docs
- Prefect dashboard: http://localhost:4200

In the server logs you should see:
```
Prefect deployment registered: orbitx-workflow/manual
Worker 'ProcessWorker ...' started!
```

## How to Run a Workflow

### Full workflow (via frontend)

1. Open http://localhost:5173
2. Create or open a workflow in the builder
3. Click **Run**
4. Node statuses update in real-time via SSE
5. View run history in the Prefect dashboard at http://localhost:4200

### Full workflow (via API)

```bash
curl -X POST http://localhost:8080/api/workflows/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"id": "<workflow_id>"}'
```

Returns `{"run_id": "<execution_id>"}`. The workflow runs asynchronously in the background.

### Single node (preview / step-run)

Run one node in isolation without executing the full workflow:

```bash
# Preview — extract data from a single source node
curl -X POST http://localhost:8080/api/workflows/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"workflow_id": "<workflow_id>", "node_instance_id": 1}'
```

This calls the engine directly — does NOT go through Prefect.

## How Orchestration Works

```
User clicks Run
  -> POST /api/workflows/execute
  -> Server creates ExecutionHistory doc in MongoDB (status: RUNNING)
  -> Server submits flow run to Prefect (prefect_client.launch_run)
  -> Prefect worker picks up the run
  -> Worker calls execute_workflow_flow(workflow_id, execution_id)
  -> Inside the flow:
       Load workflow from MongoDB
       Topological sort nodes
       Execute each node as a @task:
         - Write RUNNING status to MongoDB
         - Call engine factory (SourceFactory / TransformFactory / LoaderFactory)
         - Write SUCCESS or FAILED status to MongoDB
  -> Frontend SSE polls MongoDB every 1.5s for status updates
  -> On completion: finalize execution counts, set TTL
  -> On failure: trigger error workflow if configured
```

Prefect sees each node as a separate `@task` in its dashboard. Your frontend gets real-time updates from MongoDB via SSE — independent of Prefect.

## Development Workflows

### Run a workflow from CLI

No Docker, no Prefect, no server needed. Real execution — calls APIs, transforms data, loads to destinations.

```bash
cd engine && uv run python run_workflow.py <workflow_id>
```

Example:

```bash
cd engine && uv run python run_workflow.py 6789abc123def456
```

Status updates still write to MongoDB. Useful for debugging a specific workflow without spinning up the full stack.

### Working on engine only

If you're editing extractors, transformers, or loaders and want to test without the full stack:

```bash
# Run backend + Prefect (no frontend)
docker compose up server prefect-server prefect-postgres
```

The server container hot-reloads `engine/engine/` via volume mount. Edit code, save, test via API.

To test a single node without running a full workflow:

```bash
curl -X POST http://localhost:8080/api/workflows/preview \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"workflow_id": "<id>", "node_instance_id": 1}'
```

This calls the engine directly — no Prefect involved.

### Working on frontend only

If the backend is already running:

```bash
docker compose up web
```

Or without Docker:

```bash
cd web && npm run dev
```

### Working on server API only

```bash
docker compose up server prefect-server prefect-postgres
```

API docs at `http://localhost:8080/docs`. Engine code changes also hot-reload since both are volume-mounted.

### Running without Docker

Install dependencies:

```bash
cd server && uv sync && cd ..
cd engine && uv sync && cd ..
cd web && npm install && cd ..
```

Start each service in a separate terminal:

```bash
# Terminal 1 — Prefect server
prefect server start

# Terminal 2 — Prefect worker
PREFECT_API_URL=http://localhost:4200/api \
prefect worker start --pool orbitx-worker-pool --type process

# Terminal 3 — FastAPI
cd server
PREFECT_API_URL=http://localhost:4200/api \
uvicorn server.main:app --reload --host 0.0.0.0 --port 8080

# Terminal 4 — Frontend
cd web && npm run dev
```

### Running tests

```bash
# Run specific package tests only
cd server && uv run pytest tests/         # server tests
cd engine && uv run pytest tests/         # engine tests
cd web && npm run test:run                # frontend tests
```

## Testing

```bash
# All tests
make test-all

# By package
make test-server    # pytest — server
make test-engine    # pytest — engine
make test-web       # vitest — frontend
```

## Linting

```bash
make lint           # ruff check
make format         # ruff format
```

## Project Structure

```
orbitx-monorepo/
  common/
    common/
      model/                    Pydantic models (workflow, execution, connectors)
      database/                 MongoDB client and indexes

  server/
    server/
      api/                      Route handlers (auth, workflows, OAuth, ads)
      services/                 Business logic + prefect_client
      models/                   Request/response models
      middleware/               Auth, CSRF, rate limiting

  engine/
    engine/
      node/
        extractors/             Platform API extractors (Facebook, Google, TikTok)
        transformers/           Data transforms (SQL, rename, join, unify, IF, switch)
        loaders/                Destination loaders (BigQuery, MySQL, Google Sheets)
        deliverers/             Report delivery (Slack)
      factories/                Node factory registry
      orchestration/
        runner.py               @flow entry point + topological sort + graph execution
        tasks.py                @task wrappers with shared status tracking
        persistence.py          MongoDB execution status writes
        hooks.py                Flow completion/failure handlers
        node_result.py          Inter-task data container
      services/                 Single-node executor, Google auth

  web/
    src/
      components/               UI components (shared + workflow)
      pages/                    Route pages
      nodes/Editors/            Node config editors
      workflow/                 Node specs, registry, connection rules
      services/                 API client services
      store/                    Zustand state management

  docker/                       Dockerfiles + supervisord configs
  configs/                      .env.example
  docker-compose.yml            Dev environment (4 services)
  pyproject.toml                uv workspace config
```

## Supported Connectors

**Sources:** Facebook Ads, Google Ads, TikTok Ads, BigQuery, S3

**Destinations:** BigQuery, Google Sheets, MySQL

**Transforms:** SQL, Rename, Join, Column Editor, Unify, IF, Switch

**Delivery:** Slack

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Flow |
| Backend | Python 3.13, FastAPI, MongoDB (Motor), JWT |
| Engine | Pandas, DuckDB, async extractors/loaders |
| Orchestration | Prefect (self-hosted), PostgreSQL |
| Package Manager | uv (Python), npm (frontend) |
| Linting | Ruff (Python), TypeScript strict mode |
| Config | dynaconf (settings.yaml + .env) |
| Logging | loguru |

## License

Proprietary. All rights reserved.
