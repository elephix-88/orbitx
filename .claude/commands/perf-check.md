# Performance Check

You are a senior engineer profiling the OrbitX application for performance bottlenecks. Run real diagnostics — do not guess at performance characteristics.

## Input

The user may provide:
- `$ARGUMENTS` — optional focus area (e.g., "mongodb", "engine", "frontend", "api", or "all")

If no arguments given, default to "all".

## Tools You Use

- `bash_tool` — run all profiling commands
- `read_file` — read source code to understand hot paths

## Checks

### 1. MongoDB Query Analysis

```bash
cd server && uv run python -c "
from common.database.mongodb import database
import asyncio

async def analyze():
    # List all collections and their sizes
    collections = await database.list_collection_names()
    for name in sorted(collections):
        stats = await database.command('collStats', name)
        count = stats.get('count', 0)
        size_mb = stats.get('size', 0) / 1024 / 1024
        index_count = stats.get('nindexes', 0)
        print(f'{name}: {count} docs, {size_mb:.2f} MB, {index_count} indexes')

    # Check for collections missing indexes on commonly queried fields
    print()
    print('=== Index Analysis ===')
    critical_indexes = {
        'workflow': ['user_id'],
        'connections': ['user_id'],
        'execution_history': ['workflow_id', 'execution_id', 'user_id'],
        'users': ['email', 'google_id'],
        'platform_tokens': ['user_id', 'service_name'],
    }
    for coll_name, fields in critical_indexes.items():
        if coll_name in collections:
            indexes = await database[coll_name].index_information()
            indexed_fields = set()
            for idx_info in indexes.values():
                for key, _ in idx_info.get('key', []):
                    indexed_fields.add(key)
            for field in fields:
                status = 'OK' if field in indexed_fields else 'MISSING INDEX'
                print(f'  {coll_name}.{field}: {status}')

asyncio.run(analyze())
" 2>&1
```

### 2. Slow MongoDB Queries

```bash
cd server && uv run python -c "
from common.database.mongodb import database
import asyncio

async def check_slow():
    # Check if profiling is enabled
    result = await database.command('profile', -1)
    print(f'Profiler level: {result.get(\"was\", \"unknown\")}')

    # If profiler is on, show slow queries
    if result.get('was', 0) > 0:
        slow = await database['system.profile'].find(
            {'millis': {'\$gt': 100}}
        ).sort('millis', -1).limit(10).to_list(length=10)
        for q in slow:
            print(f'  {q.get(\"millis\")}ms: {q.get(\"op\")} on {q.get(\"ns\")} — {q.get(\"command\", {})}')
    else:
        print('Profiler is off — enable with: db.setProfilingLevel(1, {slowms: 100})')

asyncio.run(check_slow())
" 2>&1
```

### 3. API Response Time Baseline

```bash
# Health check / server responsiveness (requires running server)
curl -w "\\nDNS: %{time_namelookup}s\\nConnect: %{time_connect}s\\nTTFB: %{time_starttransfer}s\\nTotal: %{time_total}s\\n" -o /dev/null -s http://localhost:8080/api/health 2>&1 || echo "Server not running — skip API timing"
```

### 4. Engine Performance — DataFrame Operations

```bash
# Check for potentially expensive operations in transformers
echo "=== Large DataFrame operations ==="

# Find transformers using .apply() (slow — should use vectorized ops)
grep -rn --include="*.py" '\.apply(' engine/engine/node/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"

# Find iterrows/itertuples (very slow)
grep -rn --include="*.py" -E '\.(iterrows|itertuples)\(' engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"

# Find nested loops over DataFrames
grep -rn --include="*.py" 'for .* in .*\.iterrows\|for .* in range.*len(df' engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"

# Find .copy() chains (memory waste)
grep -rn --include="*.py" '\.copy()' engine/engine/node/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"
```

### 5. Memory Usage Patterns

```bash
# Check for unbounded list accumulation
grep -rn --include="*.py" 'to_list(length=None)' server/ engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"

# Check for large DataFrame concat without memory management
grep -rn --include="*.py" 'pd\.concat' engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"

# Check for missing pagination in API list endpoints
grep -rn --include="*.py" -B 2 'to_list(length=None)' server/server/services/ 2>/dev/null
```

### 6. Frontend Bundle Size

```bash
# Build and analyze
cd web && npx vite build 2>/dev/null

# Show chunk sizes
ls -la web/dist/assets/*.js 2>/dev/null | awk '{printf "%.1f KB  %s\n", $5/1024, $9}'

# Total bundle size
du -sh web/dist/ 2>/dev/null

# Find largest dependencies
cd web && npx vite build 2>/dev/null
if [ -f web/dist/stats.html ]; then
    echo "Bundle analysis available at web/dist/stats.html"
fi
```

### 7. Async Bottlenecks

```bash
# Find synchronous (blocking) calls in async code
echo "=== Potential blocking calls in async functions ==="

# time.sleep in async context
grep -rn --include="*.py" 'time\.sleep' server/ engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"

# requests library (synchronous HTTP) in async code
grep -rn --include="*.py" 'import requests' server/ engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"
grep -rn --include="*.py" 'requests\.get\|requests\.post' server/ engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"

# Synchronous file I/O in async functions
grep -rn --include="*.py" -E "open\(.*\)" server/server/ 2>/dev/null | grep -v "test" | grep -v "__pycache__" | grep -v "config"
```

### 8. N+1 Query Patterns

```bash
# Find loops that make individual MongoDB queries (N+1 pattern)
grep -rn --include="*.py" -B 5 'find_one\|find(' server/server/services/ 2>/dev/null | grep -B 5 "for " | grep -E "(for |find_one|find\()"

# Find sequential awaits that could be parallelized
grep -rn --include="*.py" -A 1 'await.*find\|await.*get' server/server/services/ 2>/dev/null | grep -v "test" | head -30
```

### 9. Prefect Task Overhead

```bash
# Count total task definitions
grep -rn --include="*.py" '@task' engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__" | wc -l

# Check retry configuration
grep -rn --include="*.py" 'with_retry\|retries=' engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"

# Check for expensive imports inside task functions (should be at module level)
grep -rn --include="*.py" -A 10 '@task' engine/engine/orchestration/ 2>/dev/null | grep "import "
```

## Output Format

```
## Performance Report

Date: [ISO date]
Focus: [scope]

### Critical (immediate impact)

| # | Issue | Location | Impact | Fix |
|---|-------|----------|--------|-----|
| 1 | ...   | file:line | ...   | ... |

### Warning (optimize when possible)

| # | Issue | Location | Impact | Fix |
|---|-------|----------|--------|-----|
| 1 | ...   | file:line | ...   | ... |

### Metrics

| Metric | Value | Status |
|--------|-------|--------|
| MongoDB collections | N | — |
| Missing indexes | N | ⚠️ if > 0 |
| Unbounded queries | N | ⚠️ if > 0 |
| Blocking calls in async | N | ❌ if > 0 |
| Frontend bundle size | X KB | ⚠️ if > 500KB |
| Slow DataFrame ops | N | ⚠️ if > 0 |

### Recommendations (prioritized)

1. [highest impact fix first]
2. ...
```
