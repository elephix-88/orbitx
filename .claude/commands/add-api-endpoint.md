# Add API Endpoint

You are a senior backend engineer adding a new API endpoint to OrbitX. You will scaffold the full vertical: route → service → request/response models → test file, following the exact patterns already in the codebase.

## Input

The user will provide:
- Resource name (e.g., "alert", "report", "schedule")
- Operations needed (e.g., CRUD, or specific like "list + create")
- Any special behavior (e.g., "needs SSE streaming", "no auth required")

## Before Writing Any Code

Read these files first using `read_file` to confirm current patterns haven't changed:

```
server/server/main.py                              ← how routers are registered
server/server/api/workflow.py                       ← reference route pattern
server/server/services/workflow.py                  ← reference service pattern
server/server/models/                               ← existing request/response models
server/server/middleware/__init__.py                 ← available middleware exports
server/server/services/auth/dependencies.py         ← get_current_user dependency
server/server/services/auth/context.py              ← get_current_user() for services
server/server/services/exceptions.py                ← custom exception classes
server/configs/settings.yaml                        ← collection names
server/tests/conftest.py                            ← test fixtures and mocking patterns
```

## File Generation

### 1. Route File: `server/server/api/{resource}.py`

Follow this exact pattern:

```python
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from loguru import logger

from common.model.user import UserInDB
from server.configs.config import settings
from server.middleware import limiter
from server.models.{resource} import {Model}Request, {Model}Response
from server.services.auth.dependencies import get_current_user
from server.services.{resource} import (
    create_{resource},
    get_{resource},
    get_all_{resources},
    update_{resource},
    delete_{resource},
)

router = APIRouter(prefix="/api/{resources}", tags=["{Resources}"])


@router.get("", response_model=list[{Model}Response])
async def list_{resources}_endpoint(
    _current_user: UserInDB = Depends(get_current_user),
) -> list[{Model}Response]:
    return await get_all_{resources}()


@router.get("/{{{resource}_id}}", response_model={Model}Response)
async def get_{resource}_endpoint(
    {resource}_id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> {Model}Response:
    result = await get_{resource}({resource}_id)
    if result is None:
        raise HTTPException(status_code=404, detail="{Resource} not found")
    return result


@router.post("", response_model={Model}Response)
@limiter.limit(settings.rate_limit_expensive)
async def create_{resource}_endpoint(
    request: Request,
    body: {Model}Request,
    _current_user: UserInDB = Depends(get_current_user),
) -> JSONResponse:
    created = await create_{resource}(body)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=created.model_dump(),
    )


@router.put("/{{{resource}_id}}", response_model={Model}Response)
@limiter.limit(settings.rate_limit_expensive)
async def update_{resource}_endpoint(
    request: Request,
    {resource}_id: str,
    body: {Model}Request,
    _current_user: UserInDB = Depends(get_current_user),
) -> {Model}Response:
    updated = await update_{resource}({resource}_id, body)
    if updated is None:
        raise HTTPException(status_code=404, detail="{Resource} not found")
    return updated


@router.delete("/{{{resource}_id}}")
@limiter.limit(settings.rate_limit_expensive)
async def delete_{resource}_endpoint(
    request: Request,
    {resource}_id: str,
    _current_user: UserInDB = Depends(get_current_user),
) -> JSONResponse:
    deleted = await delete_{resource}({resource}_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="{Resource} not found")
    return JSONResponse(status_code=status.HTTP_200_OK, content={"deleted": True})
```

**Key rules:**
- `_current_user` with underscore prefix ONLY for the Depends parameter (FastAPI convention, not our code)
- `Request` parameter is required when using `@limiter.limit()`
- Use `JSONResponse` for 201 Created, return model directly for 200
- Every endpoint gets `Depends(get_current_user)` unless explicitly told otherwise

### 2. Service File: `server/server/services/{resource}.py`

```python
from loguru import logger

from common.database.mongodb import database
from common.model.user import UserInDB
from server.configs.config import settings
from server.services.auth.context import get_current_user


async def get_all_{resources}() -> list[dict]:
    user = get_current_user()
    docs = await database[settings.{resource}_collection].find(
        {"user_id": user.id}
    ).to_list(length=None)
    return docs


async def get_{resource}({resource}_id: str) -> dict | None:
    user = get_current_user()
    return await database[settings.{resource}_collection].find_one(
        {"_id": {resource}_id, "user_id": user.id}
    )


async def create_{resource}(data) -> dict:
    user = get_current_user()
    doc = data.model_dump()
    doc["user_id"] = user.id
    result = await database[settings.{resource}_collection].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


async def update_{resource}({resource}_id: str, data) -> dict | None:
    user = get_current_user()
    payload = data.model_dump(exclude_unset=True)
    result = await database[settings.{resource}_collection].update_one(
        {"_id": {resource}_id, "user_id": user.id},
        {"$set": payload},
    )
    if result.matched_count == 0:
        return None
    return await get_{resource}({resource}_id)


async def delete_{resource}({resource}_id: str) -> bool:
    user = get_current_user()
    result = await database[settings.{resource}_collection].delete_one(
        {"_id": {resource}_id, "user_id": user.id}
    )
    return result.deleted_count > 0
```

**Key rules:**
- Services call `get_current_user()` from context — NOT passed as parameter
- All queries include `{"user_id": user.id}` for multi-tenancy
- Use `database[settings.{collection_name}]` — never hardcode collection names
- All functions are async
- Return Pydantic models or plain dicts, never raw MongoDB cursors

### 3. Request/Response Models: `server/server/models/{resource}.py`

```python
from pydantic import BaseModel


class {Model}Request(BaseModel):
    # Add fields based on the resource
    name: str
    # ... other fields


class {Model}Response(BaseModel):
    id: str
    name: str
    user_id: str
    # ... other fields
```

### 4. Settings Update: `server/configs/settings.yaml`

Add the new collection name under the existing collections:

```yaml
{resource}_collection: {resources}
```

### 5. Router Registration: `server/server/main.py`

Add import and include_router:

```python
from server.api.{resource} import router as {resource}_router
# ...
app.include_router({resource}_router)
```

### 6. Test File: `server/tests/test_{resource}_api.py`

```python
import pytest
from fastapi import status
from fastapi.testclient import TestClient


class TestCreate{Resource}:
    @pytest.mark.unit
    def test_create_{resource}_success(self, client: TestClient):
        response = client.post(
            "/api/{resources}",
            json={{"name": "test"}},
        )
        assert response.status_code == status.HTTP_201_CREATED

    @pytest.mark.unit
    def test_create_{resource}_missing_field(self, client: TestClient):
        response = client.post("/api/{resources}", json={{}})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGet{Resource}:
    @pytest.mark.unit
    def test_list_{resources}_success(self, client: TestClient):
        response = client.get("/api/{resources}")
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json(), list)

    @pytest.mark.unit
    def test_get_{resource}_not_found(self, client: TestClient):
        response = client.get("/api/{resources}/nonexistent_id")
        assert response.status_code == status.HTTP_404_NOT_FOUND
```

**Key rules:**
- Use existing `client` fixture from conftest.py (already has auth override)
- Use `@pytest.mark.unit` marker
- Test both success and failure cases
- AAA pattern: Arrange, Act, Assert

## Checklist Before Finishing

- [ ] Route file created with correct prefix, tags, and auth
- [ ] Service file uses `get_current_user()` from context and `database[settings.collection]`
- [ ] Request/Response models are Pydantic BaseModel
- [ ] Collection name added to `settings.yaml`
- [ ] Router registered in `main.py`
- [ ] Test file created with success + failure cases
- [ ] All imports at top of file, ordered: stdlib → third-party → local
- [ ] No hardcoded collection names — all via `settings`
- [ ] Rate limiting on mutation endpoints (POST, PUT, DELETE)
- [ ] Run `uv run ruff check server/` to verify lint passes

## Code Style Rules

- No underscore prefix on methods or variables (except `_current_user` FastAPI Depends convention)
- No abbreviations
- Specific exceptions only — never bare `except:`
- loguru for logging — never print() or stdlib logging
- Pydantic BaseModel for all structured data — no dataclass, no plain dict
