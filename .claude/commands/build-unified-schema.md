# Build Unified Marketing Schema

You are a marketing data engineer designing and implementing the unified marketing data model for OrbitX. This is THE core differentiator of the product.

## Context

Different ad platforms use different field names for the same concepts:
- Facebook: "spend", Google: "cost_micros", TikTok: "spend"
- Facebook: "inline_link_clicks", Google: "clicks", TikTok: "clicks"
- Facebook: "date_start", Google: "segments.date", TikTok: "stat_time_day"

The unified schema normalizes all of these into consistent column names with auto-calculated metrics.

## Unified Schema Definition

```
date                DATE        — Report date
platform            STRING      — "facebook", "google", "tiktok", "linkedin", etc.
account_id          STRING      — Ad account identifier
account_name        STRING      — Ad account display name
campaign_id         STRING      — Campaign identifier
campaign_name       STRING      — Campaign display name
adgroup_id          STRING      — Ad group/ad set identifier
adgroup_name        STRING      — Ad group/ad set display name
ad_id               STRING      — Individual ad identifier
ad_name             STRING      — Individual ad display name
spend               FLOAT       — Amount spent in account currency
impressions         INTEGER     — Number of times ads were shown
clicks              INTEGER     — Number of clicks
conversions         FLOAT       — Number of conversion events
conversion_value    FLOAT       — Revenue/value from conversions
reach               INTEGER     — Unique users who saw the ad (if available)
video_views         INTEGER     — Video views (if available, null otherwise)

-- Auto-calculated (derived, not from API):
cpm                 FLOAT       — (spend / impressions) * 1000
cpc                 FLOAT       — spend / clicks
ctr                 FLOAT       — (clicks / impressions) * 100
cpa                 FLOAT       — spend / conversions
roas                FLOAT       — conversion_value / spend
```

## Implementation

### 1. Field Mapping per Platform

Create mapping files for each platform:
- `engine/engine/schema/mappings/facebook.py`
- `engine/engine/schema/mappings/google.py`
- `engine/engine/schema/mappings/tiktok.py`
- etc.

Each mapping translates platform-specific field names to unified schema.

### 2. Unify Transform Node

Create a new transform: `engine/engine/node/transformers/unify_transformer.py`
- Input: raw data from any ad platform extractor
- Process: apply field mapping, cast types, add platform column, calculate derived metrics
- Output: DataFrame matching the unified schema exactly

### 3. Frontend Node

- Node spec: `web/src/workflow/node-specs/transform.unify.ts`
- Editor: minimal config (just select which platform's data is being unified)
- Auto-detect platform from upstream node type when possible

### 4. Validation

After unification, validate:
- All required columns present
- No negative spend/impressions/clicks
- Date column is valid date type
- Derived metrics calculated correctly (handle division by zero)
- Platform column is a known value

## Quality Checks

- Test with real sample data from each platform
- Verify all field names match expected output
- Verify calculated metrics match manual calculation
- Handle missing/null values gracefully (null in, null out for derived metrics)
