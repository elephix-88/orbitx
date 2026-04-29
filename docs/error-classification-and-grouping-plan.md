# Error Classification & Grouping (v1: AUTH only)

## Context

Today, when a workflow run fails, OrbitX gives the user a raw stringified Python traceback per node. There's no taxonomy, no remediation hint, and no summary across nodes — if three Facebook nodes all fail because the FB token was revoked mid-run, the user sees three separate cryptic errors and has to reason out the common cause themselves.

The engine already has a real typed exception hierarchy at `engine/engine/exceptions.py` (`OrbitXException` → `ExtractorException`, `TransformerException`, `LoaderException`, `ValidationException`, `RetryableException`, `RateLimitException`). The gap is **inside** the extractors and loaders: third-party SDK exceptions (`google.auth.exceptions.RefreshError`, Facebook `OAuthException`, BigQuery `Forbidden`, etc.) are caught as bare `Exception` by `extraction_lifecycle` and re-wrapped generically, so the original *cause* is lost. MongoDB persists only `error_trace` (a stringified traceback) on each `ExecutionStep`. The frontend renders that blob in `ExecutionLogPanel` with no grouping.

**v1 goal — classify and group AUTH errors only.** When a connection's token expires or is revoked mid-run, every node that hits that connection raises a typed `ExtractorException(error_category="auth")`. The orchestrator persists the category, the run aggregates a summary, and `ExecutionLogPanel` shows a single banner — "1 Auth error · Facebook Ads" — with one Reconnect button instead of three duplicate tracebacks. Further categories (RATE_LIMIT, CONFIG, SCHEMA, DATA, NETWORK, EXTERNAL_API, INTERNAL) are explicitly deferred to v2 once the pattern proves out.

This dovetails with the connection-validation plan (`docs/connection-health-validation-plan.md`): pre-flight catches stale connections **before** a run; this feature catches the residual case where a token gets revoked **during** a run.

## Approach

### Engine

**1. Add `error_category` to the exception base** — `engine/engine/exceptions.py`

Add one optional field to `OrbitXException`:

```python
error_category: str | None = None
```

It already carries `node_id`, `node_instance_id`, `details: dict` — `error_category` is a sibling. All subclasses (`ExtractorException`, `LoaderException`, etc.) inherit it. Keep the value as a plain string constant so we don't pre-commit to an enum across boundaries; v1 has exactly one value: `"auth"`.

**2. Define category constants** — `engine/engine/errors/categories.py` (new, tiny)

```python
AUTH = "auth"
```

One file so v2 has an obvious home for `RATE_LIMIT`, `CONFIG`, etc. without churning callers.

**3. Translate platform-specific auth errors → typed exceptions**

For each extractor/loader, catch the platform's auth signal and re-raise as `ExtractorException(error_category=AUTH, ...)` / `LoaderException(error_category=AUTH, ...)`. The catch happens *inside* each platform's client/extractor, *before* the generic `extraction_lifecycle` wrapper, so the category survives.

| Platform | Where to catch | Auth signal |
|---|---|---|
| Google Ads | `engine/engine/node/extractors/google_ads/extractor.py` (and `engine/engine/services/google/auth.py:build_credentials`) | `google.auth.exceptions.RefreshError`; `googleapiclient.errors.HttpError` with `status in (401, 403)` |
| Facebook Ads | `engine/engine/node/extractors/facebook_ads/api/client.py` | Response JSON with `error.type == "OAuthException"` or `error.code in (190, 102)` |
| TikTok Ads | `engine/engine/node/extractors/tiktok_ads/api/client.py` | Response with `code in (40105, 40104)` (TikTok auth-related codes) |
| BigQuery (source + loader) | `engine/engine/node/extractors/bigquery_source/extractor.py`, `engine/engine/node/loaders/bigquery/loader.py` | `google.auth.exceptions.RefreshError`; `google.api_core.exceptions.Forbidden`/`Unauthorized` |
| Google Sheets | wherever the Sheets extractor lives | same Google patterns |

Centralize the Google detection in `engine/engine/services/google/auth.py:build_credentials` so the three Google products don't duplicate the catch.

**4. Persist `error_category` on each step** — `common/common/model/execution.py`

Extend `ExecutionStep`:

```python
error_category: str | None = None
error_user_message: str | None = None  # short, user-facing, e.g. "Facebook token expired or revoked"
error_remediation: str | None = None   # action hint, e.g. "reconnect"
```

Extend `ExecutionHistory` with a roll-up:

```python
error_summary: dict[str, list[str]] | None = None  # category -> list of node_instance_ids
```

All optional, defaults `None`. No migration needed for existing docs.

**5. Capture the fields when persisting** — `engine/engine/orchestration/tasks.py:execute_with_status_tracking` and `engine/engine/orchestration/persistence.py`

In the existing `except Exception as exc:` block (`tasks.py:68`), inspect the exception:

- If it's an `OrbitXException` with `error_category` set → pass `error_category`, `error_user_message`, `error_remediation` to `persist_node_error()`.
- Otherwise → pass `error_category=None` (status quo).

In `persistence.py`, write those fields into the step subdoc (next to `error_trace`).

After the flow finishes (success *or* failure), compute `error_summary` by scanning all `FAILED` steps' `error_category` values and grouping `node_instance_id` by category. Persist on the `ExecutionHistory` doc.

### Server

**6. Expose new fields** — no API changes needed

`GET /api/execution-history/workflow/{workflow_id}` and `get_execution_detail()` already return the full `ExecutionHistory` Pydantic model. The new optional fields flow through automatically once the model is updated.

### Frontend

**7. Grouped error banner in ExecutionLogPanel** — `web/src/pages/WorkflowBuilderPage.tsx` and the file containing `ExecutionLogPanel` (likely `web/src/components/workflow/ExecutionLogPanel.tsx` or similar — agent reported lines `:641-645` for the current error banner)

When the selected execution has `status === "FAILED"` and `error_summary` is non-empty:

- Render a single banner above the per-node table.
- Banner content: count + label per category. v1 has one row: `"1 Auth error · {connection display names from affected nodes}"`.
- Banner expands (use existing `Collapsible` if present, otherwise a simple `useState` toggle — agent confirmed no Accordion atom exists yet).
- Expanded view: one row per affected node with the connection name + a `Reconnect` button.
- `Reconnect` calls the same `{platform}Service.connectWithPopup(connectionName)` used by `ConnectionsPage` — reuses `web/src/utils/oauthPopup.ts:openOAuthPopupWithCallbacks`.
- After successful reconnect, surface a toast suggesting "Re-run workflow" (don't auto-trigger — let the user decide).

Below the banner, the existing per-node table stays as-is (single source of detail). The banner is purely additive.

For non-AUTH failures (everything else in v1), fall back to today's UX: red border on node + raw `error_trace` in detail view. The banner only appears when `error_summary` has at least one known category.

### Critical files to modify

| File | Change |
|---|---|
| `engine/engine/exceptions.py` | Add `error_category` field to `OrbitXException` |
| `engine/engine/errors/categories.py` | New file: `AUTH = "auth"` constant |
| `engine/engine/services/google/auth.py` | Catch `RefreshError` → raise typed exception with `error_category=AUTH` |
| `engine/engine/node/extractors/google_ads/extractor.py` | Catch `HttpError(401/403)` → typed AUTH |
| `engine/engine/node/extractors/facebook_ads/api/client.py` | Detect `OAuthException` / code 190/102 → typed AUTH |
| `engine/engine/node/extractors/tiktok_ads/api/client.py` | Detect TikTok auth codes → typed AUTH |
| `engine/engine/node/extractors/bigquery_source/extractor.py` | Catch `Forbidden`/`Unauthorized` → typed AUTH |
| `engine/engine/node/loaders/bigquery/loader.py` | Same as source |
| `common/common/model/execution.py` | Add `error_category`, `error_user_message`, `error_remediation` to `ExecutionStep`; `error_summary` to `ExecutionHistory` |
| `engine/engine/orchestration/tasks.py` | Pass category fields to `persist_node_error()` |
| `engine/engine/orchestration/persistence.py` | Write category fields; compute `error_summary` at flow end |
| `web/src/components/workflow/ExecutionLogPanel.tsx` (or wherever it lives — confirm path) | Add grouped banner above the table |

### Reused utilities (do not reinvent)

- `engine/engine/exceptions.py` — existing typed hierarchy; just extend the base class
- `engine/engine/utils/extraction.py:extraction_lifecycle` — already preserves `OrbitXException` subtype if raised inside; only generic `Exception` gets re-wrapped, so a typed `ExtractorException(error_category=AUTH)` raised inside survives untouched
- `engine/engine/orchestration/persistence.py` — existing MongoDB write path
- `web/src/utils/oauthPopup.ts:openOAuthPopupWithCallbacks` — Reconnect button reuses this directly
- `web/src/services/{platform}Service.ts` — each `connectWithPopup()` is the exact path the banner button calls

## Out of scope (deliberately)

- **Other error categories.** RATE_LIMIT, CONFIG, SCHEMA, DATA, NETWORK, EXTERNAL_API, INTERNAL all wait for v2. Ship AUTH first, prove the pattern, then expand.
- **Auto-retry on AUTH errors.** Reconnect is a user action — not silent retry. Ship retry as its own feature once we have RateLimit category.
- **Run-history page redesign.** Banner lives in the existing `ExecutionLogPanel`.
- **MySQL / Slack / Line auth classification.** v1 covers the five OAuth platforms (Google Ads, FB, TikTok, BQ, Sheets) — same scope as the connection-validation plan.
- **Bridging engine and server exception hierarchies.** Two separate hierarchies (`engine/exceptions.py` vs `server/services/exceptions.py`) is fine for now; converging them would expand scope without user value.

## Verification

**Manual end-to-end:**
1. `make dev`; log in; build a workflow with a Facebook source node and a BigQuery destination.
2. Run once — succeeds.
3. Open Facebook → Settings → Apps → revoke OrbitX.
4. Click Run again. Run fails. `ExecutionLogPanel` shows banner: "1 Auth error · Facebook Ads (My FB Account)".
5. Click banner to expand. Click Reconnect. OAuth popup → re-authorize.
6. Click Run a third time. Banner gone, run succeeds.
7. Repeat with two FB nodes pointing at the same revoked connection — banner reads "2 Auth errors", expanded view shows both nodes.

**Automated:**
- `pytest engine/tests/node/extractors/test_facebook_auth_classification.py` — mock FB API returning `{"error": {"type": "OAuthException", "code": 190}}`. Assert raised exception is `ExtractorException` with `error_category == "auth"`.
- Repeat for Google Ads (mock `RefreshError`), TikTok (mock code 40105), BigQuery (mock `Forbidden`).
- `pytest engine/tests/orchestration/test_persistence.py` — given a flow with one failed task carrying `error_category="auth"`, assert MongoDB doc has `steps.{id}.error_category == "auth"` and `error_summary == {"auth": ["{node_id}"]}`.
- `vitest run web/src/components/workflow/ExecutionLogPanel.test.tsx` — given an execution with `error_summary: { auth: ["node-1", "node-2"] }`, the banner renders with count "2 Auth errors" and two Reconnect buttons.

**Smoke after deploy:**
- Trigger a known-failing run on staging (revoked test account); confirm banner renders and Reconnect button opens the OAuth popup.
