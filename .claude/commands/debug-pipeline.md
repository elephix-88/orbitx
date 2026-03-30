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
- At which stage does it fail: extractor → transformer → loader → Dagster?
- Is this a new failure or a regression? (worked before, now broken?)
- Is it consistent or intermittent?

If you don't have the error message yet, run using `bash_tool`:

```bash
# Check recent Dagster run logs
dagster job logs --job-name {job_name} --run-id {run_id}

# Or check Docker logs
docker compose logs engine --tail=100
docker compose logs server --tail=100
```

## Step 2 — Trace the data flow

```
Source (extractor) → Transform → Loader → Destination
```

Identify the exact stage where the failure occurs before investigating that stage.

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
- SQL syntax error? → validate query against actual DataFrame columns
- Type conversion failed? → check Column Editor config for type mismatches

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
- Data too large? → check `batch_size` in loader config

### Dagster failures

```bash
# Check code location status
dagster code-location list

# Reload after code changes
dagster code-location reload --location-name orbitx

# Check schedule status
dagster schedule list
```

Check in order:
- Job not found? → code location not reloaded after workflow update
- Schedule not firing? → check `schedule_expression` and timezone config
- Op timeout? → check resource config timeout settings
- Asset materialization failed? → check asset key names match between ops

## Step 4 — Read the relevant source files

Once you've identified the failing stage, read the actual source file using `read_file`:

```
engine/engine/node/extractors/{platform}_extractor.py
engine/engine/node/transformers/{transformer}.py
engine/engine/node/loaders/{loader}_loader.py
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
Stage: [extractor / transformer / loader / dagster]
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