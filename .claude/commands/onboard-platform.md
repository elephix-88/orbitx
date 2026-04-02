# Onboard Platform

You are the lead engineer onboarding a new ad platform (or data source) end-to-end for OrbitX. This is the high-level orchestration skill — it coordinates across backend, engine, and frontend using the specialized skills for each piece.

## Input

The user will provide:
- Platform name (e.g., "LinkedIn Ads", "GA4", "Shopify")
- API documentation URL (optional but recommended)
- Priority fields/metrics to support

## Process Overview

```
┌─────────────────────────────────────────────────────┐
│                 Onboard Platform                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Phase 1: Research                                  │
│  ├── Read API docs (auth, endpoints, rate limits)   │
│  ├── Map available fields to unified schema         │
│  └── Document pagination strategy                   │
│                                                     │
│  Phase 2: Backend (use /build-connector)            │
│  ├── Engine extractor                               │
│  ├── Common config model                            │
│  ├── Server OAuth endpoints                         │
│  ├── Server platform services                       │
│  └── Factory registration                           │
│                                                     │
│  Phase 3: Frontend (use /add-frontend-node)         │
│  ├── Node spec with adapters                        │
│  ├── Editor component                               │
│  ├── Registry + nodeTypes entry                     │
│  └── Brand icon (if needed)                         │
│                                                     │
│  Phase 4: Unified Schema Mapping                    │
│  ├── Add platform to PLATFORM_MAPPINGS in unify.py  │
│  ├── Map fields to unified columns                  │
│  └── Test with sample data                          │
│                                                     │
│  Phase 5: Testing                                   │
│  ├── Engine extractor tests                         │
│  ├── Server OAuth tests                             │
│  ├── Server service tests                           │
│  └── Integration test (extract → transform → load)  │
│                                                     │
│  Phase 6: Configuration                             │
│  ├── Add env vars to .env.example                   │
│  ├── Add settings to settings.yaml                  │
│  ├── Update CORS if new OAuth callback domain       │
│  └── Document setup in README                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Phase 1 — Research

Before writing any code, answer ALL of these questions:

### Authentication
- What auth method? (OAuth2 Authorization Code, OAuth2 Client Credentials, API Key, Service Account)
- What scopes are needed?
- Token refresh mechanism?
- Token expiry time?

### API Structure
- Base URL?
- API version?
- Rate limits (per second/minute/day)?
- Pagination method (cursor, offset, token)?
- Response format (JSON, CSV)?

### Data Model
- What entities are available? (campaigns, ad sets, ads, insights)
- What fields/metrics per entity?
- What breakdowns/dimensions?
- Date format?
- Currency/numeric format (micros, cents, raw)?

### Field Mapping to Unified Schema

Map to these unified columns (if applicable):

| Unified Column | Description | Example Platform Field |
|----------------|-------------|----------------------|
| date | Report date | `date_start`, `segments.date` |
| platform | Source platform | (auto-set) |
| account_id | Ad account ID | `account_id` |
| account_name | Ad account name | `account_name` |
| campaign_id | Campaign ID | `campaign_id` |
| campaign_name | Campaign name | `campaign_name` |
| adset_id | Ad group/set ID | `adgroup_id` |
| adset_name | Ad group/set name | `adgroup_name` |
| ad_id | Individual ad ID | `ad_id` |
| ad_name | Individual ad name | `ad_name` |
| impressions | View count | `impressions` |
| clicks | Click count | `clicks`, `inline_link_clicks` |
| spend | Money spent | `spend`, `cost_micros` (÷1M) |
| conversions | Conversion count | `conversions`, `actions[purchase]` |
| revenue | Revenue from conversions | `conversion_value`, `purchase_roas` |

Document any fields that need transformation (e.g., `cost_micros` needs division by 1,000,000).

## Phase 2 — Backend Implementation

Use the `/build-connector` skill for this phase. It will generate:

1. `engine/engine/node/extractors/{platform}/extractor.py`
2. `common/common/model/{platform}/config.py`
3. `server/server/api/{platform}/oauth.py`
4. `server/server/services/{platform}/`
5. Factory registration in `engine/engine/factories/source.py`

**Before running the skill**, document:
- The exact API endpoints to call
- The auth flow (authorize URL, token URL, callback handling)
- Field mapping from API response to DataFrame columns
- Pagination logic (how to get next page, when to stop)

## Phase 3 — Frontend Implementation

Use the `/add-frontend-node` skill for this phase. It will generate:

1. `web/src/workflow/node-specs/{platform}.ts`
2. `web/src/nodes/Editors/source/{Platform}Editor.tsx`
3. Registry update in `web/src/workflow/registry.ts`
4. Legacy nodeTypes update

**The editor should support:**
- Connection selector (dropdown of saved OAuth connections)
- Account selector (fetched from API after connection is selected)
- Field picker (available fields grouped by category: metrics, dimensions, breakdowns)
- Date range configuration (presets + custom range)

## Phase 4 — Unified Schema Mapping

Read and update these files:

```
engine/engine/node/transformers/unify.py              ← PLATFORM_MAPPINGS dict
engine/engine/node/transformers/unify.py              ← CALCULATED_METRICS
```

Add the new platform's field mapping:

```python
PLATFORM_MAPPINGS = {
    # ... existing platforms ...
    "{platform_name}": {
        "date": "{platform_date_field}",
        "impressions": "{platform_impressions_field}",
        "clicks": "{platform_clicks_field}",
        "spend": "{platform_spend_field}",
        # ... map all available fields
    },
}
```

If the platform uses non-standard units (e.g., micros), add transformation logic.

## Phase 5 — Testing

### Engine Tests

```bash
# Run extractor tests
cd engine && uv run pytest tests/test_extractors/test_{platform}*.py -v

# Run with a real API call (integration — requires credentials)
cd engine && uv run pytest tests/test_extractors/test_{platform}*.py -v -m integration
```

### Server Tests

```bash
# Run OAuth and service tests
cd server && uv run pytest tests/test_{platform}*.py -v
```

### Full Pipeline Test

```bash
# Test extract → unify → load flow
cd engine && uv run python -c "
import asyncio
import pandas as pd
from engine.node.extractors.{platform}.extractor import {Platform}Extractor
from engine.node.transformers.unify import UnifyTransformer
from common.model.transform import UnifyTransformConfig

async def test():
    # Extract sample data
    # extractor = {Platform}Extractor(config)
    # result = await extractor.extract()

    # Test unify with mock data
    sample = pd.DataFrame({
        '{date_field}': ['2024-01-01'],
        '{impressions_field}': [1000],
        '{clicks_field}': [50],
        '{spend_field}': [100.0],
    })
    config = UnifyTransformConfig(platform='{platform_name}', include_calculated_metrics=True)
    transformer = UnifyTransformer(config)
    result = await transformer.transform(sample)
    print(result.columns.tolist())
    print(result.head())

asyncio.run(test())
"
```

## Phase 6 — Configuration

### Environment Variables

Add to `configs/.env.example`:

```bash
# {Platform Name}
{PLATFORM}_APP_ID=
{PLATFORM}_APP_SECRET=
# {PLATFORM}_REDIRECT_URI=http://localhost:8080/api/{platform}/callback
```

### Settings

Add to `server/configs/settings.yaml`:

```yaml
# {Platform Name}
{platform}_app_id: "@format {env[{PLATFORM}_APP_ID]}"
{platform}_app_secret: "@format {env[{PLATFORM}_APP_SECRET]}"
{platform}_redirect_uri: "http://localhost:8080/api/{platform}/callback"
{platform}_fields_collection: {platform}_fields
```

### Frontend Environment

Add to `web/.env` if needed:

```bash
VITE_{PLATFORM}_CLIENT_ID=
```

## Completion Checklist

### Backend
- [ ] Extractor handles auth, pagination, rate limiting, and field mapping
- [ ] Config model is Pydantic BaseModel with all required fields
- [ ] OAuth flow: authorize → callback → token storage → refresh
- [ ] Account listing endpoint works
- [ ] Field listing endpoint works (with caching in MongoDB)
- [ ] Factory registration complete

### Frontend
- [ ] Node spec with correct typeId, ports, defaults, Zod schema
- [ ] Adapters handle all field conversions bidirectionally
- [ ] Editor supports connection, account, field, and date selection
- [ ] Registry and nodeTypes updated

### Unified Schema
- [ ] Platform added to PLATFORM_MAPPINGS
- [ ] All available fields mapped to unified columns
- [ ] Unit conversions handled (micros, cents, etc.)
- [ ] Calculated metrics (CPM, CPC, CTR, CPA, ROAS) work with this platform's data

### Testing
- [ ] Extractor unit tests (mocked API responses)
- [ ] OAuth flow tests
- [ ] Unify transformer tests with this platform's field names
- [ ] All tests pass: `uv run pytest -v` and `cd web && npm run test:run`

### Configuration
- [ ] Env vars added to `.env.example`
- [ ] Settings added to `settings.yaml`
- [ ] Lint passes: `uv run ruff check .` and `cd web && npm run lint`

## Code Style Rules

- No underscore prefix on methods or variables
- No abbreviations
- Specific exceptions only
- loguru for logging
- Pydantic BaseModel for all configs
- Use httpx for async HTTP calls (not requests)
- Use tenacity for retry logic on API calls
