# Connection Health Validation

## Context

Today, OrbitX has no reliable way to know if a saved OAuth connection is still alive. Tokens silently expire or get revoked from the provider side, and the failure only surfaces mid-workflow-run as a cryptic API error. The frontend `ConnectionsPage` already has UI scaffolding for richer states (`Healthy / AuthError / Rate-limited / Expiring / Broken`) and `connectionService.ts` already calls `POST /api/connections/{id}/test` — but **that endpoint does not exist** on the backend, so the frontend silently falls back to a plain GET that proves nothing about token validity. Per-platform validators only exist for Google Sheets and BigQuery; Google Ads, Facebook, and TikTok have none.

**Goal:** Make connection health a first-class, persisted, user-visible signal across all five platforms (Google Ads, Facebook Ads, TikTok Ads, BigQuery, Google Sheets), validated both on demand and as a pre-flight gate before workflow runs. When a connection comes back broken, show a "Reconnect" button that reuses the existing OAuth popup flow.

## Approach

### Backend

**1. Extend connection model** — `common/common/model/connection.py`

Add three optional fields to `ConnectionItem` (no migration needed; defaults to `None` for existing docs):
- `last_validated_at: datetime | None`
- `last_validated_status: str | None`
- `last_validation_error: str | None` — short human-readable message for the UI

Add `ValidationStatus` enum: `HEALTHY`, `AUTH_ERROR`, `RATE_LIMITED`, `UNKNOWN_ERROR`.

**2. Per-platform validators** — `server/server/services/connection/validators/` (new package)

Each validator is an `async def validate(connection: ConnectionItem) -> ValidationResult` function that makes one cheap, read-only API call:

| Platform | Probe call |
|---|---|
| Google Ads | `customers:listAccessibleCustomers` (reuses `engine/engine/services/google/auth.py:build_credentials` for auto-refresh) |
| Facebook | `GET /me?fields=id` on Graph API |
| TikTok | `GET /oauth2/advertiser/get/` on Business API |
| BigQuery | Move existing logic from `server/server/services/google/bigquery.py` |
| Google Sheets | Move existing logic from `server/server/services/google/sheets.py:189` |

`ValidationResult` (new Pydantic model): `status: ValidationStatus`, `message: str | None`, `latency_ms: int`.

Map errors uniformly:
- 401 / 403 / `RefreshError` → `AUTH_ERROR` (raise `ConnectionAuthError` from `server/server/services/exceptions.py:33`, then catch and convert)
- 429 / platform-specific rate limit codes → `RATE_LIMITED`
- Everything else → `UNKNOWN_ERROR` with the platform message

**3. Unified validate endpoint** — `server/server/api/connection/connections.py`

```
POST /api/connections/{connection_id}/validate
```

- Loads the connection (ownership check via existing `get_connection_service`).
- Dispatches to the right validator based on `service_name`.
- Writes `last_validated_at`, `last_validated_status`, `last_validation_error` back to MongoDB.
- Returns `ValidationResult` JSON.

**4. Workflow pre-flight gate** — `server/server/api/workflow/workflows.py` (find the execute endpoint that calls `prefect_client.launch_run()`)

Before launching the run:
1. Walk the workflow graph, collect all `connection_id`s used by source + destination nodes.
2. Run validators concurrently with `asyncio.gather(..., return_exceptions=True)`.
3. If any return non-`HEALTHY`, abort with HTTP 400 and a structured body:
   ```json
   {
     "error": "connection_validation_failed",
     "broken_connections": [
       { "connection_id": "...", "service_name": "FacebookAds", "status": "auth_error", "message": "..." }
     ]
   }
   ```
4. If all healthy, proceed with the existing launch path.

### Frontend

**5. API client** — `web/src/services/connectionService.ts`

- Rename `testConnection()` → `validateConnection()`, hit `POST /api/connections/{id}/validate`.
- Delete the 404-fallback path (`testConnectionFallback`) — backend now guarantees the endpoint.
- Update `TestConnectionResult` → `ValidationResult` to match backend shape (`status`, `message`, `latency_ms`).
- Keep `getConnectionStatusDisplay()` but extend it to map the four new statuses to existing `Chip` variants (`HEALTHY → success`, `AUTH_ERROR → danger`, `RATE_LIMITED → warning`, `UNKNOWN_ERROR → soft`).

**6. ConnectionsPage** — `web/src/pages/ConnectionsPage.tsx`

- Render `last_validated_status` (existing `statusVariant` / `statusLabel` helpers at `:248` and `:256` already cover the labels — just feed them the new field).
- Add a "Last checked" column showing `last_validated_at` as relative time (use existing date utility if present, else `Intl.RelativeTimeFormat`).
- Wire the existing per-row "Test" action to `validateConnection(id)`. Optimistically show a spinner; on response, refresh the row.
- Add a "Reconnect" button shown only when `status === 'auth_error'`. It calls the existing `{platform}Service.connectWithPopup(connectionName)` from `web/src/services/` — same path used for first-time connect, which the OAuth callback already routes back through `loadConnections()`.
- Add a "Validate all" button in the header that runs `validateConnection` for every connection in parallel (`Promise.allSettled`).
- Reuse `EmptyState` from `web/src/components/shared/EmptyState.tsx` (replacing the inline empty state at `:416-434`) — keeps the page consistent.

**7. Workflow Run UI — handle pre-flight failure**

Find the run-button handler (likely `web/src/pages/WorkflowBuilderPage.tsx` or a workflow store). On HTTP 400 with `error: "connection_validation_failed"`:
- Show a modal listing the broken connections (platform icon + name + reason).
- Each row has a "Reconnect" button reusing the platform service's `connectWithPopup()`.
- After all reconnects succeed, re-trigger the run.

### Critical files to modify

| File | Change |
|---|---|
| `common/common/model/connection.py` | Add 3 fields + `ValidationStatus` enum |
| `server/server/api/connection/connections.py` | Add validate endpoint |
| `server/server/services/connection/validators/__init__.py` | New dispatcher |
| `server/server/services/connection/validators/google_ads.py` | New |
| `server/server/services/connection/validators/facebook.py` | New |
| `server/server/services/connection/validators/tiktok.py` | New |
| `server/server/services/connection/validators/bigquery.py` | Move from `services/google/bigquery.py` |
| `server/server/services/connection/validators/google_sheets.py` | Move from `services/google/sheets.py:189` |
| `server/server/api/workflow/workflows.py` | Pre-flight gate in execute handler |
| `web/src/services/connectionService.ts` | Rename + drop fallback |
| `web/src/pages/ConnectionsPage.tsx` | Last-checked column, Reconnect button, Validate all |
| `web/src/pages/WorkflowBuilderPage.tsx` | Pre-flight failure modal |

### Reused utilities (do not reinvent)

- `engine/engine/services/google/auth.py:build_credentials` — auto-refreshing Google credentials
- `server/server/services/google/credentials.py:8` — server-side `Credentials` builder
- `server/server/services/exceptions.py` — `ConnectionAuthError`, `ExternalAPIError`
- `web/src/components/shared/{Chip,Dot,EmptyState,Button}` — existing atoms with the right variants
- `web/src/utils/oauthPopup.ts:openOAuthPopupWithCallbacks` — reused as-is for Reconnect
- `web/src/lib/fetchClient.ts` — auth-aware fetch wrapper

## Out of scope (deliberately)

- MySQL connection validation — non-OAuth, different failure modes; ship with the five OAuth platforms first.
- Scheduled background sweep — pre-flight + on-demand covers the user's stated need; revisit if silent expiry between runs becomes painful.
- Auto-refresh of expired tokens for Facebook (it has no refresh token at all by design) — out of scope; reconnect is the answer.
- Storing `expires_at` derived from `expires_in` — nice to have for "expiring soon" warnings, but not required by the user's two stated triggers (pre-flight + always-show-current-status).

## Verification

**Manual end-to-end:**
1. `make dev` (or repo's run command); log in; open Connections page.
2. Connect a Facebook account. Status flips to `Healthy`, "Last checked" shows "just now".
3. Open Facebook → Settings → Apps → revoke the OrbitX app.
4. Click "Test" on the Facebook row → status flips to `AuthError`, message shows the FB error.
5. Click "Reconnect" → OAuth popup → re-authorize → row flips back to `Healthy`.
6. Build a workflow using a still-revoked Google Ads connection → click "Run" → modal appears listing it with a Reconnect button. After reconnect, run proceeds.

**Automated:**
- `pytest server/tests/services/connection/test_validators.py` — one test per validator with mocked 200 / 401 / 429 / 500 httpx responses. Assert correct `ValidationStatus` mapping.
- `pytest server/tests/api/test_validate_endpoint.py` — endpoint returns 200 + persists fields; 404 for missing; ownership check.
- `pytest server/tests/api/test_workflow_preflight.py` — execute endpoint returns 400 with `broken_connections` payload when any validator fails; 200-path unaffected when all healthy.
- `vitest run web/src/services/connectionService.test.ts` — `validateConnection` parses the four status variants correctly.

**Smoke after deploy:**
- Hit `/api/connections/{id}/validate` for one known-healthy connection per platform; confirm 200 + `last_validated_at` updated in MongoDB.
