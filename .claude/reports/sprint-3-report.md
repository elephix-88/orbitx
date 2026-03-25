# Sprint 3 Report: LINE Ads Connector + LINE Pulse Daily Report

**Sprint Theme:** Autonomous Marketing Copilot for SEA
**Date:** 2026-03-25
**Status:** SHIPPED (after bug fixes)

## What Was Built

### LINE Ads Extractor (Data Engineer)
- `common/common/model/line_ads/config.py` — LineAdsConfig (BaseAdsConfig)
- `engine/engine/node/extractors/line_ads/extractor.py` — LineAdsExtractor with cursor-based pagination
- `engine/engine/node/extractors/line_ads/client.py` — LineAdsClient (httpx, bearer token auth)
- Registered in SourceFactory and services.yaml
- LineAdsNode added to workflow Node union type

### LINE Ads Unified Schema (Data Engineer)
- `LINE_ADS_MAPPING` added to `unify.py` — maps `cost` to `spend`, `advertiser_name` to `account_name`, and all standard fields
- `"line_ads"` registered in `PLATFORM_MAPPINGS`
- Calculated metrics (ROAS, CPA, CPC, CTR, CPM) computed for LINE Ads data

### LINE Ads OAuth (Backend Engineer)
- `server/server/api/line/ads.py` — POST /api/line/ads/login, GET /api/line/ads/accounts
- `server/server/services/line/oauth.py` — OAuth service (authorization code grant)
- `server/server/services/line/ads.py` — Account listing service
- Registered in main.py, settings.yaml updated

### LINE Pulse AI Upgrade (Backend Engineer)
- `engine/engine/node/deliverers/line_deliverer.py` — upgraded with Pulse AI support
- `build_pulse_text()` formats PulseResult as Thai plain text for LINE
- Graceful fallback: if LLM fails, delivers raw report (never blocks delivery)
- Respects LINE 5000-char message limit (capped at 4000 chars)

### LINE Ads Frontend (Frontend Engineer)
- `web/src/workflow/node-specs/source.line-ads.ts` — Node spec
- `web/src/nodes/Editors/source/LineAdsEditor.tsx` — Config editor (connection, account, fields, date range)
- Registered in registry.ts, nodeTypes.ts, workflow.ts
- Unify platform dropdown updated to include "line_ads"
- UnifyEditor updated with LINE Ads field mappings

## QA Results

- Tests passed: 98/98 (deliverer suite)
- Import verification: All OK
- Blockers found: 2 (both fixed)
  - Bug 1: `ad_account_id` type mismatch (string vs list) — fixed in node spec
  - Bug 2: Wrong ServiceName in OAuth (LINE vs LINE_ADS) — fixed in ads.py
- Minor fixes: bare Exception replaced with ExtractorException

## Product Sense Assessment (from QA)

- LINE Ads as a source: Strong fit for Thai agencies. No competitor has this.
- Pulse via LINE: Coherent story — "pull LINE Ads data, get Pulse in LINE"
- Thai language Pulse summary: Well-received positioning
- Demo-worthy: Yes — "manage your LINE Ads through LINE itself"

## What's Next (Sprint 4 Roadmap)

Per PO and research team consensus:
1. LINE Bot interactive commands ("why?" reply)
2. Shopee Ads connector
3. Budget Scenario Engine (cross-channel simulation)
4. LINE Flex Message templates for richer formatting

## Metrics

- Files created: ~15
- Files modified: ~10
- Engineers: 3 (parallel)
- QA cycles: 1 (2 blockers found and fixed)
- Total Sprint 1-3 cumulative: ~80 files created, ~50 modified, 218+ tests
