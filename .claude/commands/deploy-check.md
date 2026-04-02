# Deploy Check

You are a DevOps engineer running a pre-deployment validation for OrbitX. Run every check using real commands — do not infer or guess results. This is the last gate before code reaches production.

## Tools You Use

- `bash_tool` — run all checks below (mandatory — do not skip any)
- `read_file` — read specific files when a check flags an issue

**Rule:** Every check in this document must be run with `bash_tool`. Do not report a check as passing without running it.

## Checks

### 1. Environment Variables

Compare `.env.example` with the actual `.env` to find missing variables:

```bash
# Extract variable names from .env.example (strip comments, empty lines, export prefix)
grep -E '^[A-Za-z_]' configs/.env.example | sed 's/export //' | cut -d= -f1 | sort > /tmp/env_example_keys.txt

# Extract variable names from actual .env
grep -E '^[A-Za-z_]' .env 2>/dev/null | sed 's/export //' | cut -d= -f1 | sort > /tmp/env_actual_keys.txt

# Find missing keys
echo "=== Missing from .env ==="
comm -23 /tmp/env_example_keys.txt /tmp/env_actual_keys.txt

# Find extra keys (potentially stale)
echo "=== Extra in .env (not in example) ==="
comm -13 /tmp/env_example_keys.txt /tmp/env_actual_keys.txt
```

**Critical env vars that MUST exist:**

```bash
# Check required secrets are set and non-empty
for var in JWT_SECRET OAUTH_STATE_SECRET MONGO_USERNAME MONGO_PASSWORD MONGO_URI MONGO_DATABASE; do
  val=$(grep "^export\? *${var}=" .env 2>/dev/null | tail -1 | cut -d= -f2-)
  if [ -z "$val" ]; then
    echo "MISSING: $var"
  else
    echo "OK: $var (set)"
  fi
done
```

### 2. Python Dependencies

```bash
# Verify all workspace packages resolve
uv sync --frozen --dry-run 2>&1

# Check for outdated critical packages
uv pip list --format=columns 2>/dev/null | grep -E "prefect|fastapi|motor|pydantic"
```

Expected: no resolution errors. If `--frozen` fails, lockfile is out of date.

### 3. Frontend Build

```bash
# TypeScript strict check
cd web && npx tsc --noEmit 2>&1

# Production build
cd web && npx vite build 2>&1

# Check bundle size (should warn if chunk > 300KB)
ls -la web/dist/assets/*.js 2>/dev/null | awk '{print $5, $9}'
```

Expected: zero TypeScript errors, build succeeds, no oversized chunks.

### 4. Python Lint

```bash
# Ruff lint across all packages
uv run ruff check server/ engine/ common/ 2>&1

# Check for syntax errors in key entry points
uv run python -c "import server.main" 2>&1
uv run python -c "import engine.orchestration.runner" 2>&1
```

Expected: zero lint errors, imports succeed.

### 5. Docker Build

```bash
# Build server image (production)
docker build -f docker/Dockerfile.server -t orbitx-server-check . 2>&1 | tail -20

# Build web image (production)
docker build -f docker/Dockerfile.web -t orbitx-web-check ./web 2>&1 | tail -20
```

Expected: both images build successfully. If either fails, report the exact error.

### 6. MongoDB Connectivity

```bash
# Test MongoDB connection
uv run python -c "
from common.database.mongodb import database
import asyncio

async def check():
    try:
        result = await database.command('ping')
        print(f'MongoDB: OK — {result}')
        collections = await database.list_collection_names()
        print(f'Collections: {len(collections)} found')
        print(f'Names: {sorted(collections)}')
    except Exception as e:
        print(f'MongoDB: FAILED — {e}')

asyncio.run(check())
" 2>&1
```

### 7. Prefect Health

```bash
# Check Prefect server (if self-hosted)
curl -sf http://localhost:4200/api/health 2>/dev/null && echo "Prefect server: OK" || echo "Prefect server: NOT REACHABLE (may be using Prefect Cloud)"

# Check work pool exists
cd server && uv run python -c "
from prefect.client.orchestration import get_client
import asyncio

async def check():
    async with get_client() as client:
        try:
            pool = await client.read_work_pool('orbitx-worker-pool')
            print(f'Work pool: {pool.name} ({pool.type}) — {pool.status}')
        except Exception as e:
            print(f'Work pool: NOT FOUND — {e}')

        deployments = await client.read_deployments()
        print(f'Deployments: {len(deployments)}')
        for d in deployments[:5]:
            print(f'  {d.name} — active={d.is_schedule_active}')

asyncio.run(check())
" 2>&1
```

### 8. CORS Configuration

```bash
# Read current CORS origins and compare with expected deployment domain
uv run python -c "
from server.configs.config import settings
print('CORS origins:')
for origin in settings.cors_origins:
    print(f'  {origin}')
print(f'CSRF enabled: {settings.csrf_enabled}')
print(f'Rate limiting enabled: {settings.rate_limit_enabled}')
" 2>&1
```

Flag if CORS origins still contain only `localhost` entries for a production deploy.

### 9. Test Suite

```bash
# Run server tests
cd server && uv run pytest --tb=short -q 2>&1

# Run engine tests
cd engine && uv run pytest --tb=short -q 2>&1

# Run frontend tests
cd web && npm run test:run 2>&1
```

Expected: all tests pass. Report any failures with test name and error.

### 10. Git Status

```bash
# Check for uncommitted changes
git status --short 2>&1

# Check current branch
git branch --show-current 2>&1

# Check if ahead/behind remote
git status -sb 2>&1 | head -1
```

Flag if there are uncommitted changes or if the branch is behind remote.

## Output Format

```
## Deploy Check Report

Date: [ISO date]
Branch: [branch name]
Commit: [short hash]

| Check                  | Status | Details                    |
|------------------------|--------|----------------------------|
| Environment Variables  | ✅/❌  | [missing vars if any]      |
| Python Dependencies    | ✅/❌  | [resolution issues if any] |
| Frontend Build         | ✅/❌  | [errors if any]            |
| Python Lint            | ✅/❌  | [error count]              |
| Docker Build (server)  | ✅/❌  | [error if failed]          |
| Docker Build (web)     | ✅/❌  | [error if failed]          |
| MongoDB Connectivity   | ✅/❌  | [collection count]         |
| Prefect Health         | ✅/❌  | [pool status]              |
| CORS Configuration     | ✅/⚠️  | [origins list]             |
| Test Suite (server)    | ✅/❌  | [pass/fail count]          |
| Test Suite (engine)    | ✅/❌  | [pass/fail count]          |
| Test Suite (web)       | ✅/❌  | [pass/fail count]          |
| Git Status             | ✅/⚠️  | [clean/dirty]              |

Verdict: READY TO DEPLOY / BLOCKED — [reason]

### Issues to Fix Before Deploy
[numbered list of blockers, if any]

### Warnings (non-blocking)
[numbered list of warnings, if any]
```
