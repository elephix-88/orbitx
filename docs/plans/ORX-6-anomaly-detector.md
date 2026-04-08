# Plan: Anomaly Detector Transform Node (ORX-6)

## Context

OrbitX needs an Anomaly Detector node that compares any numeric column against its rolling average and flags significant deviations. It is **completely generic** — works with any upstream node (Unify, SQL Transform, MySQL, Postgres, or any future extractor). No marketing-specific assumptions.

The node stores historical snapshots as a side effect (MongoDB), compares current data against a rolling average, and outputs the original DataFrame with per-metric anomaly columns added dynamically.

## Workflow Example

```
[Any Source] -> [Any Transform] -> [Anomaly Detector] -> [IF: {col}_is_anomaly == true] -> [Alert/Destination]
```

## Design Principles

- **Zero hardcoded column names** — all columns scanned from upstream dynamically
- **Zero hardcoded defaults for column selection** — user must explicitly pick which columns to monitor
- **Per-metric output columns** — each selected metric gets its own `{metric}_is_anomaly`, `{metric}_deviation_percent`, `{metric}_baseline` columns
- **Source-agnostic** — works with Facebook Ads, MySQL, Postgres, CSV, or any future data source

## Files to Create (4)

### 1. `common/common/model/anomaly.py` — Pydantic config

```python
from pydantic import BaseModel, Field


class AnomalyDetectorConfig(BaseModel):
    """All fields are generic — no marketing-specific values."""
    metrics: list[str] = Field(default_factory=list)   # scanned from upstream numeric columns
    group_by: str = ""                                  # scanned from upstream string columns
    window_days: int = Field(default=7, ge=3, le=30)
    threshold_percent: float = Field(default=30.0, gt=0, le=500)
    max_alerts_per_day: int = Field(default=10, ge=1, le=100)
    # Runtime context (injected by engine, not user-facing)
    workflow_id: str = ""
    node_instance_id: int = 0
```

- `metrics: list[str]` — empty by default, user selects from upstream columns
- `group_by: str` — empty by default, user selects from upstream columns
- `threshold_percent` — upper bound 500% (not 100%) because some metrics can spike 200-300%
- No enum, no marketing terms, no assumed column names

### 2. `engine/engine/node/transformers/anomaly_detector.py` — Core transformer

**Follows global coding rules:** no `_` prefix on methods, no abbreviations, loguru for logging, Pydantic for snapshot model.

```
AnomalyDetectorTransformer(Transformer):
    __init__(config: AnomalyDetectorConfig)

    async transform(df: DataFrame) -> DataFrame
        1. Validate: config.metrics exist in df.columns, skip missing with loguru warning
        2. Aggregate current data: group by config.group_by, mean() for each metric
        3. Save today's snapshot to MongoDB (fire-and-forget side effect)
        4. Load history (last window_days snapshots)
        5. Compute rolling average per group per metric
        6. Compare current vs baseline, compute deviation
        7. For EACH selected metric, add columns to original df:
             {metric}_is_anomaly         (bool)
             {metric}_deviation_percent  (float)   # NO abbreviations
             {metric}_baseline           (float)
        8. Add one summary column: has_anomaly (bool) — true if ANY metric is anomalous for that row
        9. Return augmented df

    save_snapshot(aggregated, snapshot_date) -> None          # NO underscore prefix
        - Collection name from dynaconf: settings.collections.anomaly_snapshots
        - Upsert by (workflow_id, node_instance_id, snapshot_date, group_key)
        - Uses AnomalySnapshot Pydantic model (not plain dict)
        - Fire-and-forget: loguru warning on failure, never raise

    load_history(cutoff_date) -> list[AnomalySnapshot]       # NO underscore prefix
        - Query snapshots where snapshot_date >= cutoff_date
        - Returns list of Pydantic models

    compute_anomalies(current, history) -> dict               # NO underscore prefix
        - Per group + metric:
            baseline = mean of historical values
            deviation = (current - baseline) / baseline * 100
            is_anomaly = abs(deviation) > threshold_percent AND has enough history
        - Warm-up: if < window_days snapshots for this group, is_anomaly = False
        - Alert suppression: per group, cap total anomalous metrics at max_alerts_per_day

    update_field_schemas(schemas) -> schemas
        - For each metric in config.metrics, append 3 schemas:
            {metric}_is_anomaly (boolean)
            {metric}_deviation_percent (float)
            {metric}_baseline (float)
        - Append: has_anomaly (boolean)
```

**Pydantic model for snapshots** (in `common/common/model/anomaly.py`):

```python
class AnomalySnapshot(BaseModel):
    workflow_id: str
    node_instance_id: int
    snapshot_date: str
    group_key: str
    metrics: dict[str, float]
    created_at: datetime
```

### Output Example

If user selects metrics = ["spend", "clicks"] and group_by = "campaign_name":

```
Input DataFrame:
| campaign_name | spend | clicks | impressions |
|---------------|-------|--------|-------------|
| camp_a        | 500   | 120    | 10000       |
| camp_b        | 800   | 50     | 8000        |

Output DataFrame (same rows, extra columns):
| campaign_name | spend | clicks | impressions | spend_is_anomaly | spend_deviation_percent | spend_baseline | clicks_is_anomaly | clicks_deviation_percent | clicks_baseline | has_anomaly |
|---------------|-------|--------|-------------|------------------|---------------------|----------------|-------------------|----------------------|-----------------|-------------|
| camp_a        | 500   | 120    | 10000       | false            | 5.2                 | 475.0          | true              | 45.0                 | 82.7            | true        |
| camp_b        | 800   | 50     | 8000        | true             | -32.0               | 1176.0         | false             | -8.1                 | 54.4            | true        |
```

Downstream IF node can check `has_anomaly == true` (any metric) or `spend_is_anomaly == true` (specific metric).

### MongoDB Collection: `anomaly_snapshots`

```json
{
    "workflow_id": "wf_123",
    "node_instance_id": 5,
    "snapshot_date": "2026-04-08",
    "group_key": "camp_a",
    "metrics": {
        "spend": 500.0,
        "clicks": 120
    },
    "created_at": "2026-04-08T08:00:00Z"
}
```
- Index: `(workflow_id, node_instance_id, snapshot_date, group_key)` unique
- `metrics` dict keys are whatever columns the user selected — completely dynamic
- Collection name configured via **dynaconf** in `settings.yaml` (e.g., `collections.anomaly_snapshots`)
- If snapshot write fails, loguru warning and continue

### 3. `web/src/workflow/node-specs/transform.anomaly-detector.ts` — Frontend spec

```
typeId: 'transform.anomaly-detector'
displayName: 'Anomaly Detector'
category: 'TRANSFORM'
icon: 'ShieldAlert' (lucide)
color: '#EF4444' (red)
ports: [in, out] (single input, single output)
defaults: {
    metrics: [],             # empty — must select from upstream
    group_by: '',            # empty — must select from upstream
    window_days: 7,
    threshold_percent: 30,
    max_alerts_per_day: 10,
}
paramsSchema: Zod schema (metrics: string[], group_by: string, window_days: number, threshold_percent: number, max_alerts_per_day: number)
adapters: toBackend maps to node_id='anomaly_detector', node_type='transform'
```

### 4. `web/src/nodes/Editors/transform/AnomalyDetectorEditor.tsx` — Editor UI

Uses existing `getUpstreamColumnNames()` from `web/src/utils/upstreamColumns.ts`:

```typescript
const upstreamColumns = useMemo(() => {
  if (!nodeId) return [];
  return getUpstreamColumnNames(nodeId, nodes, connections);
}, [nodeId, nodes, connections]);
```

All dropdowns/checkboxes are populated from `upstreamColumns` — zero hardcoded options.

**Sections:**
1. **Metrics to Monitor** — multi-select checkboxes from ALL upstream columns (user decides which are numeric/relevant)
2. **Group By** — single-select dropdown from ALL upstream columns
3. **Detection Settings**
   - Window (days): number input, 3-30
   - Threshold (%): number input, 1-500
4. **Alert Suppression** — max alerts per day: number input
5. **Info banner** — "No anomalies will be detected until {window_days} days of data have been collected"
6. **Empty state** — "Connect an upstream node to see available columns" (when no upstream connected)

**Validation:**
- At least 1 metric selected
- group_by must be selected
- All selected columns must exist in upstream

Pattern: same as `IfEditor.tsx` — BaseEditorWrapper, useWorkflowStore, useRef for dirty tracking.

## Connection Rules

The Anomaly Detector uses `BaseNode` defaults — no custom overrides needed:

```python
class AnomalyDetectorNode(BaseNode):
    minimum_inputs: ClassVar[int] = 1      # requires exactly 1 upstream
    maximum_inputs: ClassVar[int] = 1      # no multi-input
    # allowed_target_categories inherited: {"transform", "destinations"}
    # can_have_conditional_outputs: False (not a router)
```

### What CAN connect upstream (into Anomaly Detector):

| Node Type | Can Connect? | Why |
|-----------|:---:|-----|
| Facebook Ads / Google Ads / TikTok Ads | YES | Sources output to transforms |
| MySQL / S3 / BigQuery Source | YES | Sources output to transforms |
| Unify / SQL / Rename / Column Editor | YES | Transforms output to transforms |
| IF / Switch | YES | Conditional outputs feed into transforms |
| Any future extractor (Postgres, Shopify, etc.) | YES | All sources output to transforms |

### What CAN connect downstream (from Anomaly Detector):

| Node Type | Can Connect? | Why |
|-----------|:---:|-----|
| IF / Switch | YES | Route anomalies conditionally |
| SQL / Rename / Column Editor / Unify | YES | Further transform anomaly data |
| Another Anomaly Detector | YES | Chain detectors (different metrics) |
| BigQuery / MySQL / Google Sheets | YES | Load anomaly-augmented data |
| Slack / LINE (future ORX-56) | YES | Alert on anomalies |

### What CANNOT connect:

| Rule | Why |
|------|-----|
| Source -> Anomaly Detector -> Source | Sources have `maximum_inputs = 0` |
| Destination -> Anomaly Detector | Destinations have `allowed_target_categories = set()` |
| Two nodes -> Anomaly Detector | `maximum_inputs = 1` (single input only) |

### Frontend Connection Rules

`web/src/workflow/connectionRules.ts` already enforces:
- Source -> Transform/Destination only
- Transform -> Transform/Destination only
- Destination -> nothing (terminal)
- No self-connections, no duplicate edges

No changes needed — the Anomaly Detector is a standard transform node.

## Files to Modify (6)

### 5. `common/common/model/transform.py`
Add `ANOMALY_DETECTOR = "anomaly_detector"` to `TransformType` enum

### 6. `common/common/model/workflow.py`
- Import `AnomalyDetectorConfig`
- Add `AnomalyDetectorNode(BaseNode)` with `node_id: Literal["anomaly_detector"]`, `parameters: AnomalyDetectorConfig`
- Add to `Node` union (before `IfNode`)

### 7. `engine/engine/factories/transform.py`
- Add to `_CONFIG_CLASSES`: `"anomaly_detector": AnomalyDetectorConfig`
- Add to `_DEFAULT_REGISTRY`: `"anomaly_detector": AnomalyDetectorTransformer`

### 8. `engine/engine/orchestration/tasks.py`
- Add `"anomaly_detector"` to `SCHEMA_UPDATE_TYPES`
- In `make_transformer_task` -> `execute()`: inject runtime context before factory creation.
  The factory's `create_transformer` already handles dict→Pydantic conversion via `_CONFIG_CLASSES`.
  So inject into the dict before it reaches the factory:
  ```python
  parameters = node.parameters
  if node.node_id == "anomaly_detector":
      parameters = dict(parameters) if not isinstance(parameters, dict) else parameters  # note: isinstance ok here — interfacing with framework code we don't control (Prefect serialization)
      parameters["workflow_id"] = workflow_id
      parameters["node_instance_id"] = node.node_instance_id
  ```

### 9. `web/src/workflow/registry.ts`
- Add `'transform.anomaly-detector': anomalyDetectorSpec`

### 10. `web/src/data/nodeTypes.ts`
- Add sidebar entry with empty defaults (`metrics: [], group_by: ''`)

## Implementation Order

```
Step 1:  common/common/model/anomaly.py                          (new)
Step 2:  common/common/model/transform.py                        (add enum)
Step 3:  common/common/model/workflow.py                          (add node type)
Step 4:  engine/engine/node/transformers/anomaly_detector.py      (new - core)
Step 5:  engine/engine/factories/transform.py                     (register)
Step 6:  engine/engine/orchestration/tasks.py                     (context injection)
Step 7:  web/src/workflow/node-specs/transform.anomaly-detector.ts (new)
Step 8:  web/src/nodes/Editors/transform/AnomalyDetectorEditor.tsx (new)
Step 9:  web/src/workflow/registry.ts                              (register)
Step 10: web/src/data/nodeTypes.ts                                 (sidebar)
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Fully dynamic columns** | No hardcoded column names anywhere. Works with any upstream node, any data source, any schema |
| **Per-metric output columns** | `{metric}_is_anomaly`, `{metric}_deviation_percent`, `{metric}_baseline` — downstream IF node can check specific metrics |
| **`has_anomaly` summary column** | Convenience: true if ANY metric is anomalous. Downstream IF can use this for simple routing |
| **Side effect in transformer** | Snapshot write is fire-and-forget — logged, never raised |
| **Runtime context injection** | Avoids changing Transformer interface |
| **Percentage threshold** | Simple first. Z-score / day-of-week upgrades use same snapshot data |
| **Warm-up** | No alerts until enough history. Prevents false positives on first use |

## Verification

1. **Unit test:** Mock MongoDB, feed DataFrame with known values + history, verify per-metric anomaly columns
2. **Integration:** Build workflow with any source -> Anomaly Detector -> IF -> destination, run N times, verify detection
3. **Frontend:** Connect different upstream nodes (Unify, SQL, etc.), verify editor shows correct columns each time
4. **Schema propagation:** Verify downstream nodes see dynamic `{metric}_*` columns
5. **Source-agnostic:** Test with non-marketing data (e.g., MySQL source with revenue/orders columns)
