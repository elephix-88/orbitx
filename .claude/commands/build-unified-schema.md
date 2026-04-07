# Build Unified Marketing Schema

You are a marketing data engineer designing and implementing the unified marketing data model for OrbitX. This is THE core differentiator of the product.

## Tools You Use

- `read_file` — read existing extractors and transformer patterns before writing
- `list_directory` — verify actual file structure
- `write_file` / `edit_file` — create and modify files in engine/ and web/
- `bash_tool` — run tests and lint checks

## Context

Different ad platforms use different field names for the same concepts:

| Concept | Facebook | Google | TikTok |
|---------|----------|--------|--------|
| Spend | `spend` | `cost_micros` (÷1M) | `spend` |
| Clicks | `inline_link_clicks` | `clicks` | `clicks` |
| Date | `date_start` | `segments.date` | `stat_time_day` |
| Conversions | `actions[purchase]` (nested) | `conversions` | `conversions` |

The unified schema normalizes all of these into consistent column names with auto-calculated metrics.

## Step 1 — Read existing code first (mandatory)

Before writing anything, read using `read_file`:

```
engine/engine/node/extractors/facebook_ads_extractor.py   ← how raw data arrives
engine/engine/node/extractors/google_ads_extractor.py     ← micros handling pattern
engine/engine/node/transformers/                          ← existing transformer pattern
common/common/model/                                      ← existing model patterns
```

Use `list_directory` on `engine/engine/node/transformers/` to see what already exists. Do not duplicate existing logic.

## Step 2 — Unified Schema Definition

Target output schema — every row from every platform maps to this:

```python
class UnifiedMarketingRow(BaseModel):
    # Dimensions
    date: date
    platform: str                    # "facebook" | "google" | "tiktok" | "linkedin" etc.
    account_id: str
    account_name: str
    campaign_id: str
    campaign_name: str
    adgroup_id: str | None = None
    adgroup_name: str | None = None
    ad_id: str | None = None
    ad_name: str | None = None

    # Raw metrics (from API — never calculated)
    spend: float
    impressions: int
    clicks: int
    conversions: float | None = None
    conversion_value: float | None = None
    reach: int | None = None
    video_views: int | None = None

    # Derived metrics (calculated — never from API)
    cpm: float | None = None         # (spend / impressions) * 1000
    cpc: float | None = None         # spend / clicks
    ctr: float | None = None         # (clicks / impressions) * 100
    cpa: float | None = None         # spend / conversions
    roas: float | None = None        # conversion_value / spend
```

All derived metrics must be null-safe — zero denominator returns None, not ZeroDivisionError.

## Step 3 — Implementation

### 3a. Field mapping files

Create one mapping file per platform:

```
engine/engine/schema/mappings/facebook.py
engine/engine/schema/mappings/google.py
engine/engine/schema/mappings/tiktok.py
```

Each file declares:
- Simple field renames: `{"date_start": "date", "inline_link_clicks": "clicks"}`
- Conversion lambdas: `{"cost_micros": ("spend", lambda x: x / 1_000_000)}`
- Extraction functions for nested fields: `{"actions": ("conversions", extract_purchase_count)}`

Mappings are data, not logic. Keep them declarative.

### 3b. Unify transformer

Create `engine/engine/node/transformers/unify_transformer.py`

Responsibilities:
- Accept raw DataFrame from any extractor
- Look up the correct mapping file by platform
- Apply field renames, conversions, and extractions
- Add `platform` column
- Calculate all derived metrics (null-safe)
- Validate output matches UnifiedMarketingRow schema
- Return DataFrame with exactly the unified schema columns — no extras, no missing

Read existing transformer files first to match the class structure and method signatures exactly.

### 3c. Frontend node

- Node spec: `web/src/workflow/node-specs/transform.unify.ts`
- Editor: minimal — platform selector only (auto-detect from upstream node type when possible)
- Register in `web/src/workflow/registry.ts`

Read `web/src/workflow/node-specs/` using `list_directory` to match the spec file format exactly.

## Step 4 — Validation

After unification, validate every row:

```python
VALIDATION_RULES = [
    ("date", "is valid date", lambda x: x is not None),
    ("platform", "is known platform", lambda x: x in KNOWN_PLATFORMS),
    ("spend", "is non-negative", lambda x: x >= 0),
    ("impressions", "is non-negative", lambda x: x >= 0),
    ("clicks", "is non-negative", lambda x: x >= 0),
]
```

Validation failures must be logged with loguru — never silently dropped.

## Step 5 — Verify

Run using `bash_tool`:

```bash
# Import checks
cd engine && uv run python -c "from engine.node.transformers.unify_transformer import UnifyTransformer"
cd engine && uv run python -c "from engine.schema.mappings.facebook import FACEBOOK_MAPPING"

# Lint
uv run ruff check engine/engine/schema/
uv run ruff check engine/engine/node/transformers/unify_transformer.py

# Tests
uv run pytest engine/engine/tests/ -k "unify" -v
```

## Quality Checklist

- [ ] Read existing transformer patterns before writing
- [ ] Mapping files are declarative — data not logic
- [ ] All derived metrics null-safe (no ZeroDivisionError possible)
- [ ] Validation logs failures — never silent drops
- [ ] Output schema has exactly the right columns — no extras
- [ ] Platform column populated on every row
- [ ] Import check passed
- [ ] Lint passed
- [ ] Tests passed (or written if none exist yet)