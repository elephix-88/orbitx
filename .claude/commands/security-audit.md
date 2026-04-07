# Security Audit

You are a security engineer auditing the OrbitX codebase for vulnerabilities. Run every check using real commands — do not infer or guess results.

## Tools You Use

- `bash_tool` — run all security checks (mandatory — do not skip any)
- `read_file` — read flagged files for deeper analysis

**Rule:** Every check must be run. False positives are fine — false negatives are not. When in doubt, flag it.

## Checks

### 1. Hardcoded Secrets

```bash
# Search for potential hardcoded secrets in Python files
grep -rn --include="*.py" -E "(password|secret|token|api_key|private_key)\s*=\s*['\"][^'\"]{8,}" server/ engine/ common/ 2>/dev/null | grep -v "test" | grep -v "__pycache__" | grep -v ".example"

# Search in TypeScript/JavaScript files
grep -rn --include="*.ts" --include="*.tsx" -E "(password|secret|token|apiKey|privateKey)\s*[:=]\s*['\"][^'\"]{8,}" web/src/ 2>/dev/null | grep -v "test" | grep -v "node_modules" | grep -v ".example"

# Search for base64-encoded strings that look like secrets (40+ chars)
grep -rn --include="*.py" --include="*.ts" --include="*.tsx" -E "['\"][A-Za-z0-9+/=]{40,}['\"]" server/ engine/ web/src/ 2>/dev/null | grep -v "test" | grep -v "__pycache__" | grep -v "node_modules"

# Check .env is gitignored
grep "^\.env$" .gitignore 2>/dev/null && echo ".env is gitignored: OK" || echo "WARNING: .env NOT in .gitignore"

# Check no .env file is tracked
git ls-files | grep -E "^\.env$|secrets" && echo "WARNING: .env or secrets file is tracked in git" || echo "No secrets tracked in git: OK"
```

### 2. Authentication Coverage

```bash
# Find all route handlers
grep -rn --include="*.py" '@router\.\(get\|post\|put\|delete\|patch\)' server/server/api/ 2>/dev/null

# Find routes WITHOUT Depends(get_current_user)
grep -rn --include="*.py" '@router\.\(get\|post\|put\|delete\|patch\)' server/server/api/ -A 5 2>/dev/null | grep -B 5 "async def" | grep -v "get_current_user" | grep "async def"
```

For each unprotected route, determine if it's intentionally public (e.g., health check, OAuth callback) or missing auth.

**Known intentionally public routes:**
- Health check endpoints
- OAuth callback endpoints (`/oauth2callback`, `/api/{platform}/callback`)
- Login/register endpoints
- CSRF token endpoint

### 3. CORS Configuration

```bash
cd server && uv run python -c "
from server.configs.config import settings

print('=== CORS Configuration ===')
for origin in settings.cors_origins:
    print(f'  Origin: {origin}')

# Check for wildcard
if '*' in settings.cors_origins:
    print('CRITICAL: Wildcard (*) in CORS origins — allows any domain')

# Check for localhost in production
import os
env = os.environ.get('ENV', settings.get('env', 'DEV'))
if env == 'PROD':
    localhost_origins = [o for o in settings.cors_origins if 'localhost' in o or '127.0.0.1' in o]
    if localhost_origins:
        print(f'WARNING: localhost origins in production: {localhost_origins}')
" 2>&1
```

### 4. CSRF Protection

```bash
cd server && uv run python -c "
from server.configs.config import settings
print(f'CSRF enabled: {settings.csrf_enabled}')
" 2>&1

# Check CSRF middleware is in the middleware stack
grep -n "CSRFMiddleware" server/server/main.py 2>/dev/null
```

### 5. Rate Limiting

```bash
cd server && uv run python -c "
from server.configs.config import settings
print(f'Rate limiting enabled: {settings.rate_limit_enabled}')
print(f'Default limit: {settings.rate_limit_default}')
print(f'Auth limit: {settings.rate_limit_auth}')
print(f'Expensive limit: {settings.rate_limit_expensive}')
" 2>&1

# Find mutation endpoints without rate limiting
grep -rn --include="*.py" '@router\.\(post\|put\|delete\|patch\)' server/server/api/ -A 1 2>/dev/null | grep -B 1 "async def" | grep -v "limiter.limit" | grep "@router"
```

### 6. JWT Configuration

```bash
cd server && uv run python -c "
from server.configs.config import settings
print(f'JWT algorithm: {settings.jwt_algorithm}')
print(f'Access token expiry: {settings.access_token_expire_minutes} minutes')
print(f'Refresh token expiry: {settings.refresh_token_expire_days} days')

# Check if JWT_SECRET is a weak default
import os
secret = os.environ.get('JWT_SECRET', settings.get('jwt_secret', ''))
if len(secret) < 32:
    print(f'WARNING: JWT_SECRET is too short ({len(secret)} chars) — use at least 32')
if secret in ['secret', 'changeme', 'your-secret-key', '']:
    print('CRITICAL: JWT_SECRET is a known default — change immediately')
else:
    print('JWT_SECRET length: OK')
" 2>&1
```

### 7. SQL Injection (DuckDB)

```bash
# Find DuckDB execute calls with string formatting (potential injection)
grep -rn --include="*.py" 'conn\.execute\s*(' engine/ 2>/dev/null | grep -v "test"

# Check for f-string or .format() in SQL queries
grep -rn --include="*.py" -E "(f['\"].*SELECT|\.format\(.*SELECT|f['\"].*INSERT|\.format\(.*INSERT)" engine/ server/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"
```

DuckDB queries using `conn.register("table", df)` + `conn.execute("SELECT ...")` are safe because the table is a registered DataFrame, not user input. Flag only cases where user-provided strings are interpolated into SQL.

### 8. MongoDB Injection

```bash
# Find MongoDB queries that could be vulnerable to NoSQL injection
# Look for queries where user input goes directly into $where or $regex
grep -rn --include="*.py" -E '(\$where|\$regex|\$expr)' server/ engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"

# Check for queries built from raw user input without validation
grep -rn --include="*.py" 'find_one\|find\|update_one\|delete_one' server/server/services/ 2>/dev/null | head -30
```

### 9. Sensitive Data in Logs

```bash
# Check for logging of sensitive fields
grep -rn --include="*.py" -E "logger\.\w+\(.*\b(password|token|secret|access_token|refresh_token|api_key)\b" server/ engine/ 2>/dev/null | grep -v "test" | grep -v "__pycache__"
```

### 10. Dependency Vulnerabilities

```bash
# Check for known vulnerable Python packages
uv run pip-audit 2>/dev/null || echo "pip-audit not installed — run: uv add pip-audit --dev"

# Check npm vulnerabilities
cd web && npm audit --production 2>&1 | tail -20
```

### 11. File Upload / Path Traversal

```bash
# Check for file operations with user input
grep -rn --include="*.py" -E "(open\(|Path\(|os\.path)" server/ 2>/dev/null | grep -v "test" | grep -v "__pycache__" | grep -v "config"

# Check for unvalidated file paths
grep -rn --include="*.py" "request\.\(body\|json\|form\|query_params\)" server/ 2>/dev/null | grep -v "test"
```

### 12. Security Headers

```bash
# Check SecurityHeadersMiddleware is registered
grep -n "SecurityHeadersMiddleware" server/server/main.py 2>/dev/null

# Read the middleware to verify headers
grep -A 20 "class SecurityHeadersMiddleware" server/server/middleware/security.py 2>/dev/null
```

Expected headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security, Content-Security-Policy.

## Output Format

```
## Security Audit Report

Date: [ISO date]
Commit: [short hash]

### Critical (must fix before deploy)

| # | Issue | Location | Description | Fix |
|---|-------|----------|-------------|-----|
| 1 | ...   | file:line | ...        | ... |

### Warning (should fix soon)

| # | Issue | Location | Description | Fix |
|---|-------|----------|-------------|-----|
| 1 | ...   | file:line | ...        | ... |

### Info (low risk, monitor)

| # | Issue | Location | Description | Fix |
|---|-------|----------|-------------|-----|
| 1 | ...   | file:line | ...        | ... |

### Passed Checks

- [list of checks that passed cleanly]

### Recommendations

[prioritized list of security improvements]
```
