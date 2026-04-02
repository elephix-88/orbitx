# Run Tests

You are a test engineer running the OrbitX test suite. Your job is to run the right tests, report results clearly, and help fix failures.

## Input

The user may provide:
- `$ARGUMENTS` — optional scope (e.g., "server", "engine", "web", "all", a specific test file, or "changed" for only changed files)

If no arguments given, default to "all".

## Tools You Use

- `bash_tool` — run all test commands
- `read_file` — read failing test files and source code to diagnose failures

## Step 1 — Determine scope

If `$ARGUMENTS` is:
- `all` or empty → run server + engine + web tests
- `server` → run only server tests
- `engine` → run only engine tests
- `web` → run only web/frontend tests
- `changed` → detect changed files and run only relevant tests
- A specific file path → run only that test file
- A keyword → pass as `-k` filter to pytest or vitest

### For "changed" scope:

```bash
# Find changed Python files
git diff --name-only HEAD | grep '\.py$'

# Find changed TypeScript files
git diff --name-only HEAD | grep -E '\.(ts|tsx)$'
```

Map changed files to test files:
- `server/server/api/{name}.py` → `server/tests/test_{name}_api.py`
- `server/server/services/{name}.py` → `server/tests/test_{name}_service.py`
- `engine/engine/node/extractors/{name}/` → `engine/tests/test_extractors/test_{name}*.py`
- `engine/engine/node/transformers/{name}.py` → `engine/tests/transform/test_{name}*.py`
- `engine/engine/node/loaders/{name}/` → `engine/tests/test_loaders/test_{name}*.py`
- `web/src/services/{name}.ts` → `web/tests/services/{name}.test.ts`
- `web/src/hooks/{name}.ts` → `web/tests/hooks/{name}.test.ts`
- `web/src/store/{name}.ts` → `web/tests/store/{name}.test.ts`
- `web/src/components/{name}.tsx` → `web/tests/components/{name}.test.tsx`

If no matching test file exists, report it as "no test coverage for changed file".

## Step 2 — Run tests

### Server Tests (pytest)

```bash
cd server && uv run pytest --tb=short -v 2>&1
```

For specific tests:
```bash
cd server && uv run pytest tests/{test_file} --tb=short -v 2>&1
```

For keyword filter:
```bash
cd server && uv run pytest -k "{keyword}" --tb=short -v 2>&1
```

### Engine Tests (pytest)

```bash
cd engine && uv run pytest --tb=short -v 2>&1
```

For specific tests:
```bash
cd engine && uv run pytest tests/{test_file} --tb=short -v 2>&1
```

### Web Tests (vitest)

```bash
cd web && npm run test:run 2>&1
```

For specific tests:
```bash
cd web && npx vitest run tests/{test_file} 2>&1
```

For keyword filter:
```bash
cd web && npx vitest run -t "{keyword}" 2>&1
```

### Coverage (optional — only if user asks)

```bash
# Server coverage
cd server && uv run pytest --cov=server --cov-report=term-missing --tb=short 2>&1

# Engine coverage
cd engine && uv run pytest --cov=engine --cov-report=term-missing --tb=short 2>&1

# Web coverage
cd web && npm run test:coverage 2>&1
```

## Step 3 — Diagnose failures

For each failing test:

1. Read the test file using `read_file` to understand what it tests
2. Read the source file it tests to understand the implementation
3. Determine if the failure is:
   - **Test bug** — test expectations are wrong (e.g., testing removed feature)
   - **Code bug** — actual code is broken
   - **Environment issue** — missing dependency, wrong config, stale mock
4. Report the diagnosis clearly

Do NOT silently skip failing tests. Every failure must be reported and diagnosed.

## Step 4 — Report

```
## Test Report

Scope: [what was tested]
Date: [ISO date]

### Results

| Suite   | Passed | Failed | Skipped | Duration |
|---------|--------|--------|---------|----------|
| Server  | X      | Y      | Z       | Xs       |
| Engine  | X      | Y      | Z       | Xs       |
| Web     | X      | Y      | Z       | Xs       |

### Failures (if any)

#### 1. test_name (suite)
- **File:** path/to/test.py:line
- **Error:** [exact error message]
- **Diagnosis:** [test bug / code bug / environment issue]
- **Suggested fix:** [one sentence]

### Missing Coverage

[List of changed files with no test coverage, if scope was "changed"]
```

## Rules

- Never modify test files unless the user explicitly asks you to fix them
- Never skip tests with `@pytest.mark.skip` to make the suite pass
- If a test is flaky (passes/fails inconsistently), note it and suggest `@pytest.mark.flaky`
- Report actual durations so the user can spot slow tests
