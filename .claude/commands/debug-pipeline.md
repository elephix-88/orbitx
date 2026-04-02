# Debug Pipeline Issue

You are a senior data engineer debugging a pipeline or workflow issue in OrbitX. Your goal is to find the root cause and fix it — not guess at it.

## Tools You Use

- `read_file` — read logs, config files, and source code to understand what's happening
- `list_directory` — verify file structure when paths are uncertain
- `bash_tool` — run diagnostic commands (see each step below)
- `edit_file` — apply fix once root cause is confirmed

**Rule:** Do not apply a fix until you have confirmed the root cause. A wrong fix in a live pipeline is worse than the original bug.

## Step 1 — Understand the symptom

Before doing anything, answer these questions:

- What is the exact error message? (paste it in full — do not paraphrase)
- At which stage does it fail: extractor → transformer → loader → Prefect orchestration?
- Is this a new failure or a regression? (worked before, now broken?)
- Is it consistent or intermittent?

If you don't have the error message yet, run using `bash_tool`:

```bash
# Check recent Prefect flow run logs
cd server && uv run python -c "
from prefect.client.orchestration import get_client
import asyncio

async def check_runs():
    async with get_client() as client:
        runs = await client.read_flow_runs(limit=5, sort='EXPECTED_START_TIME_DESC')
        for run in runs:
            print(f'{run.id} | {run.name} | {run.state_name} | {run.start_time}')
            if run.state_name == 'Failed':
                print(f'  Error: {run.state.message}')

asyncio.run(check_runs())
"

# Or check Docker logs for the server (which runs both uvicorn + prefect-worker)
docker compose logs server --tail=200

# Check Prefect worker status
docker compose exec server prefect worker ls
```

## Step 2 — Trace the data flow

```
Source (extractor) → Transform → Loader → Destination
```

The execution flow in OrbitX:
1. `POST /api/workflows/execute` creates an ExecutionHistory doc
2. `prefect_client.launch_run()` submits a flow run to Prefect
3. Prefect worker picks up the run, calls `execute_workflow_flow()`
4. Runner does topological sort, executes each node as a `@task`
5. Each task writes RUNNING/SUCCESS/FAILED status to MongoDB `execution_history`

Identify the exact stage where the failure occurs before investigating that stage.

### Check execution history in MongoDB

```bash
cd server && uv run python -c "
from common.database.mongodb import database
import asyncio

async def check():
    doc = await database['execution_history'].find_one(
        {'execution_id': '{execution_id}'},
    )
    if doc:
        print(f'Status: {doc.get(\"status\")}')
        for node in doc.get('node_results', []):
            print(f'  Node {node.get(\"node_instance_id\")}: {node.get(\"status\")} — {node.get(\"error\", \"ok\")}')

asyncio.run(check())
"
```

## Step 3 — Diagnose by stage

### Extractor failures

```bash
# Test OAuth token validity
cd server && uv run python -c "
from server.services.{platform}.auth import validate_connection
import asyncio
result = asyncio.run(validate_connection('{connection_id}'))
print(result)
"

# Check API response directly
cd engine && uv run python -c "
from engine.node.extractors.{platform}_extractor import {Platform}Extractor
# ... minimal test call
"
```

Check in order:
- OAuth token expired? → validate connection, refresh token
- API rate limited? → check rate limit headers in the error response
- API response schema changed? → compare actual response fields with field mapping in extractor
- Date range misconfigured? → read `time_config` in workflow definition
- Account ID wrong? → verify ad account access in platform dashboard

### Transformer failures

```bash
# Check what columns are actually in the DataFrame at this stage
cd engine && uv run pytest engine/tests/ -k "{transformer_name}" -v -s
```

Check in order:
- Column name mismatch? → print `df.columns` at start of transformer, compare with expected
- Join key missing? → verify upstream node is outputting the key column
- SQL syntax error? → validate query against actual DataFrame columns (DuckDB syntax)
- Type conversion failed? → check Column Editor config for type mismatches
- Router condition invalid? → check IF/Switch config against actual column values

### Loader failures

```bash
# Test destination connectivity
cd engine && uv run python -c "
from engine.node.loaders.{loader}_loader import {Loader}Loader
# ... connection test
"
```

Check in order:
- Schema mismatch? → compare DataFrame columns with destination table schema
- Primary key conflict? → check upsert merge keys match actual data
- Permission denied? → verify destination credentials in connection config
- Data too large? → check batch size or BigQuery streaming limits

### Prefect orchestration failures

```bash
# Check Prefect server health
curl -s http://localhost:4200/api/health | python -m json.tool

# Check work pool status
cd server && uv run prefect work-pool ls

# Check deployments
cd server && uv run prefect deployment ls

# Check flow run details (replace with actual run ID)
cd server && uv run python -c "
from prefect.client.orchestration import get_client
import asyncio

async def inspect_run(run_id: str):
    async with get_client() as client:
        run = await client.read_flow_run(run_id)
        print(f'State: {run.state_name}')
        print(f'Message: {run.state.message}')
        print(f'Parameters: {run.parameters}')
        # Check task runs
        task_runs = await client.read_task_runs(flow_run_filter={'id': {'any_': [run_id]}})
        for tr in task_runs:
            print(f'  Task: {tr.name} | {tr.state_name}')

asyncio.run(inspect_run('{run_id}'))
"
```

Check in order:
- Worker not running? → `docker compose logs server | grep prefect-worker`
- Work pool not found? → check `PREFECT_WORK_POOL` env var matches `orbitx-worker-pool`
- Deployment missing? → server registers flow on startup via `register_flow()` in `prefect_client.py`
- Schedule not firing? → check `sync_deployment()` and cron expression in workflow config
- Flow code not found? → verify entrypoint `engine.orchestration.runner:execute_workflow_flow` exists
- Process worker crash? → check supervisord logs: `docker compose exec server cat /var/log/supervisor/prefect-worker-stderr.log`

## Step 4 — Read the relevant source files

Once you've identified the failing stage, read the actual source file using `read_file`:

```
engine/engine/node/extractors/{platform}/extractor.py      ← extractor logic
engine/engine/node/transformers/{transformer}.py            ← transformer logic
engine/engine/node/loaders/{loader}/loader.py               ← loader logic
engine/engine/orchestration/runner.py                       ← workflow execution flow
engine/engine/orchestration/tasks.py                        ← task wrappers, status tracking
engine/engine/orchestration/persistence.py                  ← MongoDB status writes
server/server/services/prefect_client.py                    ← Prefect integration
```

Find the exact line where the failure originates. Do not guess — read the code.

## Step 5 — Apply the fix

Only after confirming the root cause:
1. Apply the minimal fix using `edit_file`
2. Run the relevant test: `bash_tool` → `uv run pytest engine/tests/ -k "{test_name}" -v`
3. If no test covers this case, note it in the output
4. Re-run the pipeline to verify

## Output Format

```
## Debug Report

Symptom: [exact error message]
Stage: [extractor / transformer / loader / prefect]
Root cause: [one sentence — specific, not vague]

Fix applied:
  File: [exact path]
  Change: [what was changed and why]

Verification: [test run output or pipeline re-run result]

Prevention: [what should be added to prevent this class of failure — test, validation, or monitoring]
```

## Code Style Rules (apply to any fix)

- No underscore prefix on methods or variables
- No abbreviations
- Specific exceptions only — never bare `except:`
- loguru for logging — never print() or stdlib logging
- No isinstance, no hasattr
