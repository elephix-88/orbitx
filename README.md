# OrbitX

Marketing data intelligence platform. Connects ad platforms, unifies data into one schema, transforms, and loads to warehouses — with a visual workflow builder.

## Architecture

```
web/        React 18 + TypeScript + Vite + Tailwind + Zustand + React Flow
server/     Python 3.13 + FastAPI + MongoDB + JWT auth
engine/     Async extractors / transformers / loaders (factory pattern)
dagster/    Workflow orchestration — maps workflows to jobs and schedules
common/     Shared Pydantic models across server, engine, and dagster
docker/     Dockerfiles for all services
```

## Prerequisites

- Python 3.13+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- MongoDB (running locally or connection string in `.env`)
- Docker and Docker Compose (for containerized setup)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url> && cd orbitx-monorepo
make install
```

This runs `uv sync` for all Python packages and `npm install` for the frontend.

### 2. Configure environment

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
cp web/.env.example web/.env
```

Key variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET_KEY` | Secret for JWT token signing |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
| `FACEBOOK_APP_ID` | Facebook app ID for Ads API |
| `TIKTOK_APP_ID` | TikTok app ID for Ads API |
| `VITE_GOOGLE_CLIENT_ID` | Google client ID for frontend login |

### 3. Run locally (without Docker)

```bash
# Run both server and frontend in parallel
make dev

# Or run them separately
make dev-server   # FastAPI on http://localhost:8080
make dev-web      # Vite on http://localhost:5173
```

### 4. Run with Docker Compose

**Development** (hot reload, source mounted):

```bash
docker compose --profile dev up --build
```

| Service | Port | Description |
|---------|------|-------------|
| `server` | 8080 | FastAPI backend with hot reload |
| `web` | 5173 | Vite dev server with HMR |
| `dagster` | 3070 | Dagster webserver UI |
| `dagster-postgres` | 5432 | PostgreSQL for Dagster state |

**Production** (optimized builds, nginx):

```bash
docker compose --profile prod up --build
```

| Service | Port | Description |
|---------|------|-------------|
| `server-prod` | 8080 | FastAPI (gunicorn) |
| `web-prod` | 80 | Nginx serving static build |
| `dagster-prod` | 3070 | Dagster webserver |
| `dagster-postgres-prod` | 5432 | PostgreSQL for Dagster state |

**Stop and clean up:**

```bash
docker compose --profile dev down        # Stop dev containers
docker compose --profile dev down -v     # Stop and remove volumes
```

## Testing

```bash
make test-all       # Run everything
make test-server    # pytest — server package
make test-engine    # pytest — engine package
make test-web       # vitest — frontend
```

## Linting and Formatting

```bash
make lint           # ruff check
make format         # ruff format
```

## Project Structure

```
orbitx-monorepo/
├── common/                     # Shared models and database client
│   └── common/
│       ├── model/              # Pydantic models (workflow, execution, connectors)
│       └── database/           # MongoDB client and indexes
├── server/                     # FastAPI backend
│   └── server/
│       ├── api/                # Route handlers (auth, workflows, OAuth, ads)
│       ├── services/           # Business logic
│       ├── models/             # Request/response models
│       └── middleware/         # Auth, CSRF, rate limiting
├── engine/                     # Data processing engine
│   └── engine/
│       ├── node/
│       │   ├── extractors/     # Platform API extractors
│       │   ├── transformers/   # Data transforms (unify, filter, join)
│       │   └── loaders/        # Destination loaders (BigQuery, Sheets)
│       ├── factories/          # Node factory registry
│       └── services/           # Single-node executor, utilities
├── dagster/                    # Workflow orchestration
│   └── dagster_orbitx/
│       ├── ops/                # Dagster ops (extractor, transformer, loader, router)
│       ├── hooks/              # Execution history, error workflow triggers
│       ├── services/           # Pin client, execution persistence
│       └── graph_builder.py    # Builds Dagster jobs from workflow definitions
├── web/                        # React frontend
│   └── src/
│       ├── components/         # UI components (shared + workflow)
│       ├── pages/              # Route pages
│       ├── nodes/Editors/      # Node config editors
│       ├── workflow/           # Node specs, registry, connection rules
│       ├── services/           # API client services
│       ├── store/              # Zustand state management
│       └── types/              # TypeScript type definitions
├── docker/                     # Dockerfiles
├── Makefile                    # Dev commands
├── docker-compose.yml          # Dev and prod profiles
└── pyproject.toml              # uv workspace config
```

## Workflow Execution Flow

```
User clicks "Run" in the workflow builder
  → POST /api/workflow/workflows/execute
  → Server launches a Dagster run
  → Dagster executes ops in topological order
  → Each op: extract → transform → load
  → Results stored in MongoDB (execution history)
  → Frontend polls for status updates
```

## Supported Connectors

**Sources:** Facebook Ads, Google Ads, TikTok Ads

**Destinations:** BigQuery, Google Sheets

**Delivery:** Slack

## Key Features

- **Visual Workflow Builder** — drag-and-drop nodes with React Flow
- **Unified Schema** — auto-normalize metrics across ad platforms
- **Data Pinning** — freeze node outputs to iterate on transforms without re-fetching APIs
- **Step-Run** — execute a single node in isolation for fast debugging
- **IF / Switch Nodes** — conditional branching in workflows
- **Execution Debug** — inspect failed runs node-by-node with data preview
- **Error Workflows** — auto-trigger a separate workflow when a pipeline fails

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Flow |
| Backend | Python 3.13, FastAPI, MongoDB (Motor), JWT |
| Engine | Pandas, DuckDB, async extractors/loaders |
| Orchestration | Dagster, PostgreSQL |
| Package Manager | uv (Python), npm (frontend) |
| Linting | Ruff (Python), TypeScript strict mode |
| Config | dynaconf (settings.yaml + .env) |
| Logging | loguru |

## License

Proprietary. All rights reserved.
