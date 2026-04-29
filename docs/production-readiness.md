# OrbitX — Production Readiness, Stability & Refactoring Audit

_Audit date: 2026-04-23_
_Cross-referenced with Gemini review: [`comprehensive_code_review.md`](./comprehensive_code_review.md) — Gemini independently converged on 12 of the items below; one finding (A17 SSE cap) was added from Gemini._

## Summary

The product core is well-built. The operational layer is thin. In one line: the code works, but it will not survive a paying customer unsupervised — no CI, no server error tracking, silent OAuth expiry, zero API response validation, ~4K lines of copy-paste across node editors, no E2E tests.

Four lenses in this doc:
- **Part A — Operational Stability Gaps** (infrastructure, ops, runtime safeguards)
- **Part B — Code Refactoring Candidates** (duplication, rule violations, large files)
- **Part C — Code Quality Enforcement** (configured-but-never-run tooling)
- **Part D — Health Check Depth** (liveness, readiness, canary, uptime)

All feed the single execution order at the bottom.

---

## Part A — Operational Stability Gaps

### Tier 1 — Ship-stoppers

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| A1 | **No CI/CD** | `.github/workflows/` does not exist; `Makefile` has `test-all`/`lint` but nothing runs on PR | Broken code can merge unnoticed |
| A2 | **No server Sentry** | `server/pyproject.toml` lacks `sentry-sdk`; only `web/package.json` has Sentry | Server crashes invisible in prod |
| A3 | **OAuth silent expiry** | `server/server/api/facebook/oauth.py` never calls refresh; Google/TikTok refresh only on manual trigger | Customer workflows silently die |
| A4 | **No E2E tests** | ~15,700 LOC unit tests total, zero end-to-end | Refactors can break core flow undetected |
| A5 | **Possible committed secret** | `cron5-dev-04f8283e8503.json` at repo root (2.3 KB, looks like a GCP service-account key) | Verify gitignored / move out of repo |

### Tier 2 — Runtime safeguards

- **A6. No per-node execution timeout** — one stuck API call = stuck workflow forever.
- **A7. No idempotency keys** — Prefect retries may double-write to BigQuery / MySQL.
- **A8. No stuck-run watchdog** — runs frozen in `running` have no cleanup.
- **A9. Reactive-only rate limiting** — no `X-RateLimit-Remaining` / `Retry-After` parsing in Facebook/Google/TikTok clients.
- **A10. Shallow `/readyz`** — pings MongoDB only, not Prefect Cloud or required env vars.
- **A11. Unstructured logs** — loguru → stdout, no JSON, no request IDs.
- **A12. No MongoDB backup/index strategy** documented or enforced.
- **A17. SSE 10-minute duration cap** — `server/server/api/workflow.py:94` sets `SSE_MAX_DURATION = 600`, used as `max_await_time_ms` at line 145. Any workflow running longer than 10 minutes drops the client stream mid-run — looks like a failure even though the backend run continues. _(Found by Gemini review.)_

### Tier 3 — Long-term

- **A13.** No Prometheus `/metrics`.
- **A14.** No Dependabot / Renovate.
- **A15.** Empty `docs/` — no runbooks for common incidents.
- **A16.** No load / perf baseline.

---

## Part B — Code Refactoring Candidates

### B1. Python — engine + server

**High-value refactors:**

- **Factory config coercion duplication** — identical `isinstance(config, dict)` → Pydantic coerce pattern in `engine/engine/factories/source.py:41`, `factories/transform.py:64,82`, `factories/loader.py:31`. Extract `coerce_pydantic_config()` utility.
- **Extractor pagination / date-chunk duplication** — near-identical loops in `engine/engine/node/extractors/{tiktok,google,facebook}_ads/` (40–80 lines each). Extract `AsyncPaginatedDataFetcher` base.
- **HTTP exception-wrap duplication** — `server/server/api/workflow.py` lines 59, 79, 289, 302, 315 repeat the same `try/except → HTTPException` six times. Extract `@handle_workflow_errors` decorator or centralize via FastAPI exception handlers.
- **Facebook poll loop reimplements retry** — `engine/engine/node/extractors/facebook_ads/api/async_manager.py:40–80` uses hardcoded sleep instead of `with_retry()` from `engine/engine/utils/retry.py`. Unify.

**CLAUDE.md rule violations:**

- **Inline import** — `engine/engine/node/extractors/facebook_ads/api/async_manager.py:37` (`import time` inside function). Move to top.
- **Dynaconf bypass** — `engine/engine/orchestration/hooks.py:16–17` uses `os.environ.get("ORBITX_SERVER_URL", ...)` and `os.environ.get("INTERNAL_SERVICE_KEY", ...)` instead of `settings.*`.

**Large files (candidates for split):**

| File | Lines | Reason to split |
|------|-------|-----------------|
| `server/server/api/workflow.py` | 376 | 9 endpoints + duplicated error handling |
| `engine/engine/orchestration/tasks.py` | 381 | Extractors + transformers + loaders + routers + deliverers in one module |
| `engine/engine/utils/node_output.py` | 306 | Output formatting + exception introspection conflated |
| `engine/engine/orchestration/runner.py` | 286 | Flow loading + graph construction + error handling |
| `engine/engine/node/transformers/anomaly_detector.py` | 291 | ML + history loading + schema update |

**Exception-handling inconsistency:**

- `engine/engine/orchestration/tasks.py:56–76` → log-and-re-raise (good).
- `engine/engine/node/extractors/facebook_ads/api/async_manager.py:44–51` → silently swallows poll errors (**bad for prod debugging**).
- `server/server/api/workflow.py` → mixed catch-specific + bare `logger.error` patterns.
- Normalize to one strategy: always log with context + raise typed domain exception.

**Pydantic type looseness:**

- `server/server/services/execution/preview.py:21,27` uses `parameters: dict[str, Any]` for node config. Should be a discriminated union of `NodeParameters`.

### B2. TypeScript — web

**Node editor duplication (biggest win):**

~4,075 lines of near-duplicate form code across 6 editors:
- `web/src/nodes/Editors/source/GoogleAdsEditor.tsx` (582)
- `web/src/nodes/Editors/source/FacebookAdsEditor.tsx` + `FacebookAdsForm.tsx` (~650)
- `web/src/nodes/Editors/source/TikTokAdsEditor.tsx` + `TikTokAdsForm.tsx` (~556)
- `web/src/nodes/Editors/destination/GoogleSheetsEditor.tsx` (753)
- `web/src/nodes/Editors/transform/ColumnEditorEditor.tsx` (634)
- `web/src/nodes/Editors/transform/JoinEditor.tsx` (896)

Three duplicated patterns:

1. **Account / connection selection** — `AccountSelector.tsx` already exists at `web/src/components/forms/fields/` but **not reused** in ad-platform editors.
2. **Field picker with prefetch** — extract `useFieldPrefetch<T>()` hook (generic over platform).
3. **Date presets constant** — duplicated across 4 editors; extract to `web/src/lib/datePresets.ts`.

**Critical safety gaps:**

- **Zero Zod validation of API responses** — `web/src/services/baseApiService.ts:159–160` just casts JSON as `T`. No `schema.parse(response)` anywhere in `web/src/services/`. Backend shape changes break silently. **High priority.**
- **23× `any` / `as any`** — worst offender is `FacebookAdsEditor.tsx:86–101` chained `as any` in `canonical()` function.
- **No `react-hook-form`** — all 38+ forms use raw `useState`; no debounce, no async validation primitives, no per-field error boundaries.
- **Error boundaries sparse** — `grep ErrorBoundary` returns 25 hits but concentrated in `Layout.tsx`; an error inside `JoinEditor` (896 lines) takes down the canvas.

**Design-token violations (74 hardcoded hex in TSX):**

- `web/src/components/icons/BrandIcons.tsx` — 25 instances (Google / Facebook / TikTok brand colors; acceptable as hex but extract to `BRAND_COLORS` constants).
- `web/src/pages/LandingPage.tsx` — 16 instances (brand colors duplicated).
- `web/src/components/shared/Avatar.tsx:5–12` — 8-color pastelPalette hardcoded (should be tokens).
- `web/src/components/workflow/ScheduleDeliverySheet.tsx:6,64` — `#06C755`, `#E01E5A` (map to `success` / `danger` tokens).
- `web/src/pages/ConnectionsPage.tsx` — 7 instances.

**Large components to split:**

| File | Lines | Split into |
|------|-------|------------|
| `web/src/pages/WorkflowBuilderPage.tsx` | 1158 | NodeEditorPanel + WorkflowProperties + ExecutionPanel + BuilderPage shell |
| `web/src/nodes/Editors/transform/JoinEditor.tsx` | 896 | JoinKeyMapper + JoinTypeSelector + JoinEditor shell |
| `web/src/components/workflow/ScheduleDeliverySheet.tsx` | 884 | ScheduleForm + DeliveryChannelPicker + Sheet shell |
| `web/src/components/workflow/reactflow/ReactFlowCanvas.tsx` | 867 | Extract hooks: `useCanvasState`, `useConnectionRules`; leave rendering |
| `web/src/pages/LandingPage.tsx` | 817 | Per-section components |
| `web/src/nodes/Editors/destination/GoogleSheetsEditor.tsx` | 753 | SpreadsheetPicker + WorksheetSelector + ActionModeSelect |

**SSE hook quality** — `web/src/hooks/useExecutionStream.ts` (64 lines) is well-written: terminal-status dedup, unmount cleanup, explicit close. Minor add: exponential backoff on explicit close.

**Dead code:** `web/src/pages/home/mockAiInsights.ts` still imported by `DashboardPage.tsx` + `AIInsightCard.tsx` — mock data in production path. Replace or guard behind a feature flag.

---

---

## Part C — Code Quality Enforcement

The tools are already installed and configured. The problem is **nothing runs them**.

**What exists but isn't enforced:**

| Tool | Where configured | Status |
|------|------------------|--------|
| `ruff` | `pyproject.toml` — rulesets E, F, I, W, UP, B, SIM | Works locally, no CI gate |
| `mypy` | root + `server/pyproject.toml` + `engine/pyproject.toml` — Pydantic plugin, `strict_optional`, `warn_return_any` | **Never actually run anywhere** |
| `pytest-cov` | `server` + `engine` dev deps | Installed, no threshold enforced |
| `tsc --noEmit` | `web/package.json` — `type-check` script | Works locally, no CI gate |
| `eslint` | `web/package.json` — `lint` script | Works locally, no CI gate |

**What's entirely missing:**

- **C1** Pre-commit hooks — no `.pre-commit-config.yaml`, no `.husky/`. Bad code reaches CI before it's caught.
- **C2** Full-suite CI — Phase 1's A1 must run `ruff check` + `ruff format --check` + `mypy` + `pytest --cov` + `tsc --noEmit` + `eslint` + `prettier --check`, not just `make test-all`.
- **C3** Coverage threshold — baseline current coverage, then `--cov-fail-under=<baseline>` to prevent regression.
- **C4** Dead-code detection — `vulture` (Python), `knip` (TypeScript). Cuts real code after refactors.
- **C5** Bundle-size budget — no visibility into web bundle regressions; add `size-limit` or `vite-bundle-visualizer` with a CI gate.
- **C6** Security audit in CI — `pip-audit` for Python deps, `npm audit` for web (complements Dependabot).
- **C7** Tighter ruff rules — add `C901` (mccabe complexity), `PLR` (pylint refactor warnings), `RUF` (ruff-native lints) to catch god functions early.

---

## Part D — Health Check Depth

**Current state:**
- `/healthz` → always returns `{"status": "ok"}` (acceptable as a pure liveness probe — process is alive)
- `/readyz` → pings MongoDB, returns 503 if it fails — too shallow

A deploy with a broken Prefect API token, missing env vars, or a stuck worker would pass `/readyz` today.

**Proposed layers:**

```
                         HEALTH CHECK LAYERS
                    ┌──────────────────────────────┐
Liveness (cheap) ──►│  /healthz     process alive  │  keep as-is
                    ├──────────────────────────────┤
Readiness (deep) ──►│  /readyz    MongoDB ✓        │  current
                    │             + Prefect API    │  D1 (was A10)
                    │             + env vars       │  D2
                    │             + worker polling │  D3
                    ├──────────────────────────────┤
Info             ──►│  /version   git sha + time   │  D4 (5-min win)
                    ├──────────────────────────────┤
Per-dep detail   ──►│  /healthz/deps               │  D7
                    └──────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────────────────┐
External         ──►│ Uptime monitor (UptimeRobot/ │  D5 (30-min setup)
                    │ Better Stack) hits /healthz  │
                    │ Synthetic canary: scheduled  │  D6 (Prefect flow)
                    │ mini-workflow every hour     │
                    └──────────────────────────────┘
```

**Gaps:**

- **D1** `/readyz` doesn't check Prefect Cloud reachability — a broken Prefect token means workflows can't run but health is "ready"
- **D2** `/readyz` doesn't verify required env vars / dynaconf keys are present
- **D3** No Prefect worker health — is it polling? Stale-lease detection (worker appears alive but not picking up tasks)
- **D4** No `/version` endpoint returning git SHA + build timestamp — can't tell which commit is live in prod
- **D5** No external uptime monitor — if the whole server is down, `/healthz` can't tell anyone
- **D6** No synthetic canary — the best signal that end-to-end still works is actually running a tiny workflow every hour
- **D7** No per-dependency detail endpoint — when `/readyz` returns 503, which dep failed?

---

## Priority Map

```
                              BLAST RADIUS
                                  ▲
  CRITICAL                        │ A1 No CI/CD            A2 No server Sentry
  (silent prod failure)           │ A3 OAuth auto-refresh  A5 Possible secret @ root
                                  │ B2-zod No API validation
                                  │
  HIGH                            │ A4 No E2E tests        A6 Exec timeouts
  (breaks under stress)           │ A7 Idempotency         A8 Stuck-run watchdog
                                  │ A17 SSE 10-min cap
                                  │ B1-extractors Dedup    B2-editors Dedup (~4K lines)
                                  │
  MEDIUM                          │ A9 Rate-limit parse    A10 /readyz depth
  (degrades over time)            │ A11 Structured logs    B2-forms React Hook Form
                                  │ B1-workflow.py Error-handler decorator
                                  │ B2-large Split big components
                                  │
  LOW                             │ A13 Prometheus         A14 Dependabot
                                  │ A15 Runbooks           B2-hex Token cleanup
                                  │ B1-inline-import       B1-dynaconf leak
                                  │
                                  └─────────────────────────────────────▶
                                    LOW EFFORT          HIGH EFFORT

A# = Operational / infrastructure gap   B# = Code refactoring candidate
```

---

## Execution Order

```
         ┌────────────────────────┐
         │  PHASE 1 — Safety Net  │   Week 1   (prerequisite for all)
         │  A1 CI/CD              │
         │  A2 Server Sentry      │
         │  A5 Secret audit       │
         │  A14 Dependabot        │
         │  B2-zod API validation │
         └───────────┬────────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
         ▼                        ▼
┌────────────────────┐   ┌────────────────────┐
│  PHASE 2 — Silent  │   │  PHASE 4 — Web     │   Weeks 2 ‖ 5-6
│  failure fixes     │   │  Refactor          │   (parallel with 2+3)
│  A3 OAuth refresh  │   │  B2-editors dedup  │
│  A4 E2E tests      │   │  B2-large splits   │
│  B1-workflow.py    │   │  B2-forms (RHF)    │
│  B1-facebook-poll  │   │  B2-error bounds   │
└─────────┬──────────┘   │  B2-hex cleanup    │
          │              └─────────┬──────────┘
          ▼                        │
┌────────────────────┐             │
│  PHASE 3 — Runtime │   Weeks 3-4 │
│  safeguards        │             │
│  A6 Timeouts       │             │
│  A7 Idempotency    │             │
│  A8 Stuck watchdog │             │
│  A9 Rate-limit     │             │
│  A11 JSON logs     │             │
│  B1-extractors     │             │
└─────────┬──────────┘             │
          │                        │
          └───────────┬────────────┘
                      ▼
         ┌────────────────────────┐
         │  PHASE 5 — Obs polish  │   Week 7
         │  A10 /readyz depth     │
         │  A13 Prometheus        │
         │  A12 Mongo docs        │
         │  A15 Runbooks          │
         └────────────────────────┘

Legend:  ─►  hard prerequisite       ‖  can run in parallel
```

### Phase 1 — Safety net (Week 1)
- **A1** GitHub Actions CI on PR, Docker build on main
- **A2** `sentry-sdk[fastapi]` in server + verify web Sentry is configured
- **A5** Audit `cron5-dev-04f8283e8503.json` — move out of repo if it's a real GCP key
- **A14** Dependabot config
- **B2-zod** Add Zod `.parse()` at `baseApiService.ts` seam (single file change, huge safety gain)
- **C1** Pre-commit hooks (`pre-commit` for Python, `husky` + `lint-staged` for web)
- **C2** CI full suite: `ruff check` + `ruff format --check` + `mypy` + `pytest --cov` + `tsc --noEmit` + `eslint` + `prettier --check`
- **C6** Security audit step in CI: `pip-audit` + `npm audit`
- **D4** `/version` endpoint (git SHA + build timestamp) — 5-min win
- **D5** External uptime monitor (UptimeRobot or Better Stack) pinging `/healthz` — 30-min setup
- Fix **inline import** (`async_manager.py:37`) and **dynaconf leak** (`hooks.py:16–17`) — 5-minute wins

### Phase 2 — Silent-failure fixes (Week 2)
- **A3** OAuth token refresh job (Prefect scheduled flow) + alert on refresh failure
- **A4** Golden-path E2E test (`tests/e2e/test_workflow_golden_path.py`) + Playwright login-to-save smoke
- **B1-workflow.py** Centralize HTTP exception handling in `server/server/api/workflow.py`
- **B1-facebook-poll** Swap bare sleep loop for `with_retry()` in `async_manager.py`

### Phase 3 — Runtime safeguards (Weeks 3–4)
- **A6** Per-node execution timeout (default 10 min, configurable) in `engine/engine/orchestration/tasks.py`
- **A7** Idempotency keys in BigQuery `merge()` + MySQL loader
- **A8** Stuck-run watchdog (Prefect scheduled cleanup)
- **A9** Rate-limit header parsing in Facebook/Google/TikTok clients
- **A11** Structured JSON logging + `X-Request-ID` middleware
- **A17** Fix SSE cap — raise `SSE_MAX_DURATION` + implement client-side auto-reconnect in `useExecutionStream.ts`, or switch to WebSocket / long-poll chunking for runs exceeding the cap
- **B1-extractors** Extract `AsyncPaginatedDataFetcher` base + `coerce_pydantic_config()` utility
- **D1** Extend `/readyz` with Prefect Cloud reachability check (was A10, promoted)
- **D2** `/readyz` verifies required env vars / dynaconf keys
- **D3** Prefect worker health check (is the worker polling? stale-lease detection)

### Phase 4 — Web refactor (Weeks 5–6)
- **B2-editors** Extract `useFieldPrefetch<T>()`, reuse `AccountSelector.tsx`, extract `datePresets.ts` — collapse ~4K duplicate lines
- **B2-large** Split `WorkflowBuilderPage.tsx` (1158 → 4 files), `JoinEditor.tsx`, `ReactFlowCanvas.tsx`
- **B2-forms** Migrate node editors to React Hook Form
- **B2-error-boundary** Wrap each node editor + page route in its own `ErrorBoundary`
- **B2-hex** Clean hardcoded hex (Avatar palette → tokens; extract `BRAND_COLORS` constant)

### Phase 5 — Observability polish (Week 7)
- **A13** Prometheus `/metrics` via `prometheus-fastapi-instrumentator`
- **A12** Document MongoDB backup + add index definitions near models
- **A15** Seed `docs/runbooks/` (oauth-expired, workflow-stuck, mongodb-down)
- **D6** Synthetic canary — scheduled Prefect flow runs a minimal end-to-end workflow every hour, alerts on failure
- **D7** `/healthz/deps` per-dependency detail endpoint
- **C3** Coverage threshold (baseline current coverage, enforce `--cov-fail-under`)
- **C4** Dead code scan (`vulture`, `knip`)
- **C5** Bundle-size budget for web
- **C7** Tighten ruff rules (add `C901`, `PLR`, `RUF`) after an initial cleanup pass

---

## Critical Files Referenced

**Infrastructure (NEW):**
- `.github/workflows/ci.yml`, `.github/workflows/build.yml`, `.github/dependabot.yml`

**Server Sentry + logging:**
- `server/pyproject.toml`, `server/server/main.py`, `server/server/logging.py` (NEW), `server/server/middleware/request_id.py` (NEW)

**OAuth refresh:**
- `server/server/services/auth/token_refresher.py` (NEW)
- `server/server/api/{facebook,google,tiktok}/oauth.py` (MOD)

**Execution safeguards:**
- `engine/engine/orchestration/tasks.py`, `engine/engine/node/loaders/bigquery/loader.py`, `engine/engine/node/loaders/mysql/mysql.py` (MOD)
- `server/server/services/execution/watchdog.py` (NEW)

**Engine refactors:**
- `engine/engine/factories/{source,transform,loader}.py` (MOD — coerce utility)
- `engine/engine/node/extractors/facebook_ads/api/async_manager.py` (MOD — retry + inline import)
- `engine/engine/orchestration/hooks.py` (MOD — dynaconf)
- NEW: `engine/engine/utils/pagination.py`, `engine/engine/utils/config_coerce.py`

**Server refactors:**
- `server/server/api/workflow.py` (MOD — error decorator)
- NEW: `server/server/api/error_handlers.py`

**Web refactors:**
- `web/src/services/baseApiService.ts` (MOD — Zod parse)
- `web/src/pages/WorkflowBuilderPage.tsx` (SPLIT → 4 files)
- `web/src/nodes/Editors/**/*.tsx` (REFACTOR to shared hooks)
- NEW: `web/src/hooks/useFieldPrefetch.ts`, `web/src/lib/datePresets.ts`, `web/src/lib/brandColors.ts`

**Tests (NEW):**
- `tests/e2e/test_workflow_golden_path.py`, `web/tests/e2e/login.spec.ts`

**Docs (NEW):**
- `docs/production-readiness.md` — this file
- `docs/runbooks/oauth-expired.md`, `docs/runbooks/workflow-stuck.md`, `docs/runbooks/mongodb-down.md`

---

## Open Questions (for the founder)

1. Is `cron5-dev-04f8283e8503.json` a real GCP service-account key? If yes, move out of repo and rotate.
2. Is Sentry the preferred error-tracking tool (vs. Rollbar / Bugsnag / Honeybadger)?
3. What is the hosting target? Affects CI's build+deploy step.
4. Acceptable perf cost of Zod-parsing every API response, or should we start at the boundary only?
5. Willing to spend Weeks 5–6 on editor refactor, or defer Part B2 for later?
