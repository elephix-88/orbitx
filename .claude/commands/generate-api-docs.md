# Generate API Docs

You are a backend engineer generating API documentation for OrbitX. Your job is to produce accurate, complete documentation from the actual codebase — not from memory or assumptions.

## Tools You Use

- `read_file` — read all route files and models to extract endpoint details
- `bash_tool` — run the FastAPI server to extract the OpenAPI spec, or run curl commands
- `list_directory` — discover all API route modules

## Step 1 — Discover all endpoints

```bash
# List all API route files
find server/server/api/ -name "*.py" -not -name "__init__.py" | sort

# Extract all route declarations
grep -rn --include="*.py" '@router\.\(get\|post\|put\|delete\|patch\)' server/server/api/ | sort
```

## Step 2 — Extract OpenAPI spec from FastAPI

FastAPI auto-generates OpenAPI docs. Extract the spec directly:

```bash
# Start the server briefly to get the OpenAPI schema
cd server && timeout 10 uv run python -c "
import json
from server.main import app
from fastapi.openapi.utils import get_openapi

schema = get_openapi(
    title=app.title,
    version=app.version,
    routes=app.routes,
)
print(json.dumps(schema, indent=2))
" 2>/dev/null > /tmp/orbitx-openapi.json

# Check if it worked
wc -l /tmp/orbitx-openapi.json
```

If the server can't start (missing env vars), fall back to manual extraction.

## Step 3 — Read each route file

For every route file found in Step 1, read it completely using `read_file`:

```
server/server/api/workflow.py
server/server/api/execution_history.py
server/server/api/connection/connections.py
server/server/api/facebook/oauth.py
server/server/api/google/oauth.py
server/server/api/tiktok/oauth.py
server/server/api/slack/oauth.py
server/server/api/delivery.py
server/server/api/auth/
```

For each endpoint, extract:
- HTTP method + path
- Request body model (if POST/PUT)
- Response model
- Path parameters
- Query parameters
- Authentication requirement
- Rate limiting
- Description from docstring

## Step 4 — Read request/response models

```bash
find server/server/models/ -name "*.py" -not -name "__init__.py" | sort
```

Read each model file to get field names, types, and defaults.

Also read common models used in responses:

```
common/common/model/workflow.py
common/common/model/execution.py
common/common/model/connection.py
common/common/model/user.py
```

## Step 5 — Generate documentation

### Output Format Option 1: Markdown API Reference

```markdown
# OrbitX API Reference

Base URL: `http://localhost:8080`

## Authentication

All endpoints require a Bearer token in the Authorization header or an `orbitx_access` HttpOnly cookie, unless marked as **Public**.

```
Authorization: Bearer <jwt_token>
```

---

## Workflows

### List Workflows
`GET /api/workflows`

Returns all workflows owned by the authenticated user.

**Auth:** Required
**Rate limit:** Default (100/min)

**Response:** `200 OK`
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "created_at": "ISO datetime",
    "updated_at": "ISO datetime"
  }
]
```

---

### Create Workflow
`POST /api/workflows`

**Auth:** Required
**Rate limit:** Expensive (10/min)

**Request body:**
```json
{
  "name": "string",
  "nodes": [...],
  "edges": [...]
}
```

**Response:** `201 Created`
```json
{ ... }
```

---

[continue for all endpoints]
```

### Output Format Option 2: Postman Collection

If the user asks for a Postman collection, generate a JSON file:

```json
{
  "info": {
    "name": "OrbitX API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [{"key": "token", "value": "{{access_token}}"}]
  },
  "variable": [
    {"key": "base_url", "value": "http://localhost:8080"},
    {"key": "access_token", "value": ""}
  ],
  "item": [
    {
      "name": "Workflows",
      "item": [
        {
          "name": "List Workflows",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/workflows"
          }
        }
      ]
    }
  ]
}
```

## Step 6 — Verify completeness

```bash
# Count endpoints in code vs documentation
echo "Endpoints in code:"
grep -c '@router\.\(get\|post\|put\|delete\|patch\)' server/server/api/**/*.py 2>/dev/null

echo "Endpoints documented:"
# Count in generated doc (adjust grep pattern based on output format)
```

Every endpoint in code must appear in docs. Report any missing.

## Checklist

- [ ] All route files discovered and read
- [ ] All request/response models documented with field types
- [ ] Auth requirements noted for each endpoint (Required / Public)
- [ ] Rate limiting noted for each endpoint
- [ ] Path parameters and query parameters documented
- [ ] Error responses documented (400, 401, 403, 404, 422)
- [ ] SSE endpoints noted with streaming behavior
- [ ] Endpoint count matches between code and docs
