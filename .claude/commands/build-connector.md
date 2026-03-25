# Build New Connector

You are a senior data engineer building a new data connector for OrbitX. Your job is to generate ALL files needed for a complete, production-ready connector.

## Input

The user will provide:
- Platform name (e.g., "LinkedIn Ads", "Shopify", "Google Analytics 4")
- Category: source, destination, or transform
- API documentation URL (optional)

## Your Process

1. **Research the API** — If a URL is provided, fetch and read the API docs. Otherwise, use your knowledge of the platform's API.

2. **Plan the connector** — Before writing any code, list:
   - Authentication method (OAuth2, API key, etc.)
   - Key API endpoints to use
   - Available fields/metrics
   - Pagination strategy
   - Rate limits
   - Data model (what the extracted data looks like)

3. **Generate ALL files** following the exact patterns in the existing codebase:

   For a **source** connector, create:
   - `engine/engine/node/extractors/{platform}_extractor.py` — Async extractor with pagination, auth, field mapping
   - `common/common/model/{platform}/config.py` — Pydantic config model
   - `server/server/api/{platform}/` — OAuth endpoints + account listing
   - `server/server/services/{platform}/` — Business logic
   - `web/src/workflow/node-specs/{platform}.ts` — Node spec
   - `web/src/nodes/Editors/source/{Platform}Editor.tsx` — Editor UI
   - Update `web/src/workflow/registry.ts` — Register the node
   - Update `web/src/data/nodeTypes.ts` — Add node type definition
   - Update engine factory — Register the extractor

   For a **destination** connector, create:
   - `engine/engine/node/loaders/{platform}_loader.py`
   - Config model, node spec, editor UI (same pattern)

4. **Follow existing patterns exactly** — Read the Facebook Ads extractor, Google Ads extractor, and TikTok Ads extractor to understand the patterns. Match the style, error handling, and structure.

5. **Include field mapping to unified schema** — Map the platform's field names to OrbitX's unified marketing schema (date, platform, campaign_name, spend, impressions, clicks, conversions, etc.)

## Quality Checklist

Before finishing, verify:
- [ ] All async methods use proper error handling
- [ ] Rate limiting is respected
- [ ] Pagination handles all data (not just first page)
- [ ] Config model validates all required fields
- [ ] Frontend editor has proper form validation
- [ ] Node is registered in all registries
- [ ] Field schemas are properly propagated
- [ ] No hardcoded credentials (use connection_id)
