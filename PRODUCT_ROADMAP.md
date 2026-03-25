# OrbitX — The Operating System for Marketing Data

## The Problem

Every marketing team has the same pain:

```text
                    THE MARKETING DATA MESS

    Facebook  Google   TikTok  LinkedIn  GA4   Shopify  HubSpot
       │        │        │        │       │       │        │
       ▼        ▼        ▼        ▼       ▼       ▼        ▼
    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
    │diff │ │diff │ │diff │ │diff │ │diff │ │diff │ │diff │
    │names│ │names│ │names│ │names│ │names│ │names│ │names│
    │diff │ │diff │ │diff │ │diff │ │diff │ │diff │ │diff │
    │dates│ │dates│ │dates│ │dates│ │dates│ │dates│ │dates│
    │diff │ │diff │ │diff │ │diff │ │diff │ │diff │ │diff │
    │metrics│metrics│metrics│metrics│metrics│metrics│metrics
    └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
       │        │        │        │       │       │        │
       └────────┴────────┴────┬───┴───────┴───────┴────────┘
                              │
                              ▼
                     Manual spreadsheets
                     Copy-paste hell
                     Broken dashboards
                     "Where did $50k go?"
                     Reports that take 2 days
```

**Marketers spend 30% of their time wrangling data instead of making decisions.**

Today they use 3-5 separate tools:
- Supermetrics to pull data
- Google Sheets to blend it
- Looker Studio to visualize it
- Slack to share reports manually
- Gut feeling to detect problems

---

## The Vision

OrbitX replaces all of that with one platform:

```text
                         OrbitX

    ┌──────────────────────────────────────────────┐
    │                                              │
    │   COLLECT        UNIFY        ANALYZE        │
    │   Every ad    →  One schema  →  AI finds     │
    │   platform       across all     insights     │
    │                  platforms      for you       │
    │                                              │
    │   ALERT          REPORT        ACTIVATE      │
    │   Anomalies   →  Auto-send  →  Push          │
    │   detected       to Slack      audiences     │
    │   instantly      & email       back to ads   │
    │                                              │
    └──────────────────────────────────────────────┘
```

**One sentence:** Collect marketing data from every platform, unify it into one schema, get AI-powered insights, automated reports, and sync audiences back — all without code.

---

## Who Is This For

```text
┌─ Primary Users ──────────────────────────────────────────┐
│                                                          │
│  Performance Marketers     "I run ads on 4 platforms.    │
│                             Show me what's working       │
│                             across ALL of them."         │
│                                                          │
│  Marketing Analysts        "I spend 2 days building      │
│                             weekly reports. I want       │
│                             them automated."             │
│                                                          │
│  Marketing Ops / Growth    "I need spend alerts,         │
│                             anomaly detection, and       │
│                             audience sync — in one tool."│
│                                                          │
│  Agencies                  "I manage 20 clients.         │
│                             Each has FB + Google + TT.   │
│                             I need unified reporting."   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Not for: general-purpose automation (that's n8n), generic ETL (that's Fivetran), developers who want to write code (that's Windmill).

---

## Current State

```text
WHAT ORBITX HAS                        WHAT'S MISSING
──────────────                         ──────────────
Sources:                               Sources:
  ✓ Facebook Ads                         ✗ LinkedIn Ads
  ✓ Google Ads                           ✗ Google Analytics 4
  ✓ TikTok Ads                          ✗ Shopify / ecommerce
  ✓ BigQuery (query)                     ✗ HubSpot / CRM
  ✓ S3                                   ✗ Pinterest, Snapchat, Twitter/X
                                         ✗ CSV/file upload

Destinations:                          Destinations:
  ✓ BigQuery                             ✗ Snowflake
  ✓ MySQL                               ✗ PostgreSQL
  ✓ Google Sheets                        ✗ Looker Studio (direct)
                                         ✗ Slack (reports)
                                         ✗ Email (reports)

Transforms:                            Missing entirely:
  ✓ SQL                                  ✗ Unified marketing schema
  ✓ Rename                              ✗ Pre-built marketing metrics
  ✓ Join                                 ✗ Cross-channel blending
  ✓ Column Editor                        ✗ Anomaly detection
                                         ✗ AI insights
Scheduling:                              ✗ Automated reports
  ✓ Cron                                 ✗ Budget monitoring
                                         ✗ Audience sync (reverse ETL)
                                         ✗ Creative analysis
                                         ✗ Multi-client (agency mode)
```

---

## Roadmap — 5 Phases

```text
Phase 1              Phase 2              Phase 3              Phase 4              Phase 5
COLLECT              UNIFY & BLEND        INTELLIGENCE         ACTIVATE             SCALE
──────────           ─────────────        ────────────         ────────             ─────
Every platform       One schema           AI-powered           Push data back       Agency & enterprise
into one place       across all           insights &           to ad platforms      multi-client
                     channels             monitoring
```

---

## Phase 1 — Collect Everything

Goal: support every marketing data source a team uses. This is table stakes — Supermetrics has 100+ connectors. We need the top 15 that cover 90% of marketing teams.

### Ad Platforms

| Platform | API | Metrics | Status | Priority |
| --- | --- | --- | --- | --- |
| Facebook / Meta Ads | Marketing API v21 | Spend, impressions, clicks, conversions, ROAS, CPM, CPC, CTR, frequency, reach | Done | - |
| Google Ads | Google Ads API v17 | Spend, impressions, clicks, conversions, conv. value, CPC, quality score | Done | - |
| TikTok Ads | Business API v1.3 | Spend, impressions, clicks, conversions, video views, engagement | Done | - |
| LinkedIn Ads | Marketing API | Spend, impressions, clicks, leads, engagement, CTR, CPC | Not started | P0 |
| Pinterest Ads | Marketing API v5 | Spend, impressions, clicks, conversions, outbound clicks, saves | Not started | P1 |
| Snapchat Ads | Marketing API | Spend, impressions, swipe-ups, conversions, frequency | Not started | P1 |
| Twitter/X Ads | Ads API v12 | Spend, impressions, engagements, clicks, conversions, video views | Not started | P2 |
| Apple Search Ads | Campaign Mgmt API | Spend, impressions, taps, conversions, CPA, TTR | Not started | P2 |
| Microsoft Ads | Bing Ads API | Spend, impressions, clicks, conversions, quality score | Not started | P2 |

### Analytics

| Platform | What It Gives You | Priority |
| --- | --- | --- |
| Google Analytics 4 | Sessions, users, pageviews, events, conversions, traffic sources | P0 |
| Mixpanel | Events, funnels, cohorts, user properties | P2 |
| Amplitude | Events, funnels, retention, user segments | P2 |

### Ecommerce (needed for ROAS / revenue attribution)

| Platform | What It Gives You | Priority |
| --- | --- | --- |
| Shopify | Orders, revenue, products, customers, refunds | P0 |
| WooCommerce | Orders, revenue, products, customers | P2 |
| Stripe | Payments, subscriptions, MRR, churn | P1 |

### CRM (needed for lead-level attribution)

| Platform | What It Gives You | Priority |
| --- | --- | --- |
| HubSpot | Contacts, deals, pipeline stages, marketing emails, forms | P1 |
| Salesforce | Leads, opportunities, campaigns, revenue | P2 |

### Other

| Source | What It Gives You | Priority |
| --- | --- | --- |
| CSV / Excel upload | Any data the user has in files | P0 |
| Google Sheets (as source) | Live data from shared sheets | P0 |
| PostgreSQL / MySQL (query) | Custom data from internal databases | P1 |

### Implementation approach

The existing extractor pattern (factory + async extract + ExtractorResult) scales perfectly. Each new source is:

1. OAuth flow in `/server/server/api/{platform}/`
2. Extractor class in `/engine/engine/node/extractors/`
3. Pydantic config model in `/common/common/model/`
4. Node spec + editor in `/web/src/`

Estimated effort per new source: 3-5 days (OAuth + API pagination + field mapping + editor UI).

---

## Phase 2 — Unify & Blend

This is where OrbitX becomes more than "another Supermetrics." Raw data from different platforms is useless until it speaks the same language.

### 2.1 Unified Marketing Data Model

The core idea: every ad platform calls things differently. OrbitX normalizes them into one schema automatically.

```text
Facebook calls it:          Google calls it:          TikTok calls it:
  "spend"                     "cost_micros"             "spend"
  "impressions"               "impressions"             "impressions"
  "inline_link_clicks"        "clicks"                  "clicks"
  "actions[purchase]"         "conversions"             "conversions"
  "action_values[purchase]"   "conversions_value"       "total_purchase_value"
  "campaign_name"             "campaign.name"           "campaign_name"
  "date_start"                "segments.date"           "stat_time_day"

                              │
                    OrbitX Auto-Unify
                              │
                              ▼

              OrbitX Unified Schema:
              ┌────────────────────────────────┐
              │  date              DATE        │
              │  platform          STRING      │
              │  account_id        STRING      │
              │  account_name      STRING      │
              │  campaign_id       STRING      │
              │  campaign_name     STRING      │
              │  adgroup_id        STRING      │
              │  adgroup_name      STRING      │
              │  ad_id             STRING      │
              │  ad_name           STRING      │
              │  spend             FLOAT       │
              │  impressions       INTEGER     │
              │  clicks            INTEGER     │
              │  conversions       FLOAT       │
              │  conversion_value  FLOAT       │
              │  cpm               FLOAT       │
              │  cpc               FLOAT       │
              │  ctr               FLOAT       │
              │  roas              FLOAT       │
              │  cpa               FLOAT       │
              └────────────────────────────────┘
```

**How it works:**

1. Each source extractor declares field mappings to the unified schema
2. A new "Unify" transform node auto-maps source fields to unified columns
3. Calculated metrics (CPM, CPC, CTR, ROAS, CPA) are auto-computed
4. Platform name is added as a column for filtering
5. Result: one table with all platforms, same column names, comparable metrics

**Why this matters:** A marketer can now write ONE query or build ONE dashboard that shows Facebook, Google, and TikTok side by side — without manually mapping 50 different field names.

### 2.2 Cross-Channel Blending

Pre-built blend templates for common use cases:

```text
┌─────────────────────────────────────────────────────────┐
│                  Cross-Channel Blend                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Blend type: [Ad Spend + Revenue ▼]                     │
│                                                         │
│  Ad data:     [Unified Marketing Data]                  │
│  Revenue data: [Shopify Orders]                         │
│                                                         │
│  Join on:                                               │
│    Ad data:     date + utm_campaign                     │
│    Revenue:     order_date + attribution_campaign       │
│                                                         │
│  Output:                                                │
│    date, platform, campaign,                            │
│    spend, impressions, clicks,                          │
│    orders, revenue,                                     │
│    roas (revenue / spend),                              │
│    cac (spend / orders)                                 │
│                                                         │
│  [Preview Blended Data]                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Common blend types:

| Blend | Sources | Output |
| --- | --- | --- |
| Ad Spend + Revenue | Unified ads + Shopify/Stripe | ROAS, CAC by channel/campaign |
| Ad Spend + Website Traffic | Unified ads + GA4 | Cost per session, bounce rate by source |
| Ad Spend + CRM Pipeline | Unified ads + HubSpot/Salesforce | Cost per lead, cost per opportunity |
| Multi-Touch Attribution | Unified ads + GA4 + CRM | Attribution-weighted conversions |

### 2.3 Marketing Metrics Engine

Pre-built calculated metrics that update automatically:

```text
┌─ Marketing Metrics ──────────────────────────────────────┐
│                                                          │
│  Efficiency Metrics (auto-calculated):                   │
│    CPM  = (spend / impressions) × 1000                   │
│    CPC  = spend / clicks                                 │
│    CTR  = (clicks / impressions) × 100                   │
│    CPA  = spend / conversions                            │
│    ROAS = conversion_value / spend                       │
│    CAC  = spend / customers_acquired                     │
│                                                          │
│  Growth Metrics (needs revenue data):                    │
│    LTV          = total_revenue / total_customers        │
│    LTV:CAC      = ltv / cac                              │
│    Payback Days = cac / (ltv / avg_customer_lifetime)    │
│                                                          │
│  Pacing Metrics (needs budget data):                     │
│    Daily Budget Pace  = today_spend / daily_budget       │
│    Monthly Burn Rate  = mtd_spend / monthly_budget       │
│    Days Until Budget  = remaining_budget / avg_daily     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.4 Data Preview at Every Node

```text
┌─ Facebook Ads ──────┐       ┌─ Unify ──────────────┐       ┌─ BigQuery ──────────┐
│                     │       │                      │       │                     │
│  25 rows sampled    │──────▶│  25 rows unified     │──────▶│  Schema matched ✓   │
│  ┌───────────────┐  │       │  ┌────────────────┐  │       │                     │
│  │ date_start    │  │       │  │ date           │  │       │  Table: unified_ads │
│  │ spend         │  │       │  │ platform: fb   │  │       │  Mode: append       │
│  │ inline_link.. │  │       │  │ spend          │  │       │                     │
│  │ actions[..]   │  │       │  │ clicks         │  │       │  [Dry Run]          │
│  └───────────────┘  │       │  │ ctr: 2.3%      │  │       │  [Create Table]     │
│                     │       │  └────────────────┘  │       │                     │
└─────────────────────┘       └──────────────────────┘       └─────────────────────┘
```

New API endpoint: `POST /api/workflows/preview-node`
- Runs a single node with limit=25
- Returns data + schema + row count estimate
- Frontend shows collapsible preview panel per node

---

## Phase 3 — Intelligence (AI that understands marketing)

This is the moat. Generic AI tools don't understand marketing metrics. OrbitX AI does.

### 3.1 Anomaly Detection & Alerts

```text
┌─ OrbitX Monitoring ──────────────────────────────────────┐
│                                                          │
│  ⚠ ANOMALY: Facebook Ads — Spend spike                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Campaign: "Summer Sale - Retargeting"              │  │
│  │  Today's spend:   $2,847  (vs $340 daily avg)       │  │
│  │  Change:          +737%                             │  │
│  │  Likely cause:    Budget was changed to "Lifetime"  │  │
│  │                   yesterday at 3:42 PM              │  │
│  │                                                     │  │
│  │  [Pause Campaign]  [Mute Alert]  [Investigate]      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ⚠ ANOMALY: Google Ads — Conversion drop                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │  All campaigns: 0 conversions in last 6 hours       │  │
│  │  Expected:      ~45 conversions                     │  │
│  │  Likely cause:  Conversion tracking pixel removed   │  │
│  │                 from landing page                   │  │
│  │                                                     │  │
│  │  [Check Pixel]  [Mute Alert]  [View History]        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Monitoring rules:                                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  ✓ Spend deviation > 50% from 7-day avg            │  │
│  │  ✓ Conversion count drops to 0 for 4+ hours        │  │
│  │  ✓ CTR drops below 0.5%                            │  │
│  │  ✓ CPA exceeds $50 threshold                       │  │
│  │  ✓ Daily budget pacing > 120%                       │  │
│  │  ✓ New campaigns detected (notify on launch)        │  │
│  │  + [Add custom rule]                                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Alert channels:  [✓] Slack  [✓] Email  [ ] Webhook     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**How it works:**

1. OrbitX stores historical metrics per pipeline (7/14/30 day windows)
2. After each run, compare output against historical baselines
3. Statistical anomaly detection (z-score, percentage deviation)
4. AI classifies probable cause based on pattern matching
5. Alerts sent to Slack/email with context and suggested actions

**Pre-built monitoring rules for marketing:**

| Rule | What It Catches |
| --- | --- |
| Spend spike/drop | Budget changes, billing issues, campaign auto-scaling |
| Zero conversions | Broken tracking pixel, landing page down |
| CTR collapse | Ad fatigue, audience exhaustion, policy violation |
| CPA threshold | Unprofitable campaigns running unchecked |
| Budget pacing | Overspending early in the day/month |
| Impression drop | Account suspension, bidding issues |
| New campaign | Team member launched something without approval |

### 3.2 AI Marketing Analyst

Ask questions about your marketing data in natural language:

```text
┌─ AI Analyst ──────────────────────────────────────────────┐
│                                                           │
│  You: "Which campaigns had the best ROAS last week        │
│        across all platforms?"                              │
│                                                           │
│  AI:  Based on your unified data (Mar 17-23):             │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  #  Campaign              Platform  Spend    ROAS   │  │
│  │  1  Brand - Retargeting   Facebook  $1,240   8.2x   │  │
│  │  2  Search - Brand Terms  Google    $890     6.7x   │  │
│  │  3  Lookalike - Purchase  Facebook  $2,100   4.1x   │  │
│  │  4  Video - Product Demo  TikTok    $650     3.8x   │  │
│  │  5  Search - Competitors  Google    $1,800   2.3x   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Insight: Your retargeting campaigns consistently         │
│  outperform prospecting by 2-3x on ROAS. Consider        │
│  increasing retargeting budget allocation from 15%        │
│  to 25% of total spend.                                   │
│                                                           │
│  You: "What would happen if I shift $2k/day from          │
│        Google competitor search to Facebook lookalike?"    │
│                                                           │
│  AI:  Based on historical performance:                    │
│  - Google Competitors: $1,800/day → $2.3 ROAS = $4,140   │
│  - FB Lookalike at +$2k: $4,100/day → ~3.5 ROAS = $14,350│
│  - Net impact: +$10,210/day revenue (+247%)               │
│  - Caveat: FB Lookalike may see diminishing returns       │
│    above $3,500/day based on your audience size           │
│                                                           │
│  [Export Analysis]  [Create Report]  [Schedule Weekly]     │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Why this is better than ChatGPT + spreadsheet:**

- AI has direct access to your real-time unified marketing data
- AI knows your historical trends, baselines, and seasonal patterns
- AI understands marketing-specific metrics (ROAS, CAC, LTV)
- AI can generate SQL against your warehouse, execute it, and interpret results
- No copy-pasting data into ChatGPT

### 3.3 Budget Monitor

```text
┌─ Budget Tracker ─────────────────────────────────────────┐
│                                                          │
│  March 2026                           Total: $45,000     │
│                                                          │
│  Platform      Budget    Spent     Pace    Forecast      │
│  ──────────── ──────── ──────── ──────── ────────────    │
│  Facebook      $20,000  $14,200   71%    $19,420 ✓      │
│  Google Ads    $15,000  $12,800   85%    $17,500 ⚠      │
│  TikTok        $7,000   $4,100   59%    $5,610  ✓      │
│  LinkedIn       $3,000   $2,900   97%    $3,970  🔴     │
│  ──────────── ──────── ──────── ──────── ────────────    │
│  Total         $45,000  $34,000   76%    $46,500 ⚠      │
│                                                          │
│  ⚠ Google Ads: On pace to overspend by $2,500 (17%)     │
│  🔴 LinkedIn: Will exceed budget in 2 days               │
│                                                          │
│  [Set Budget Alerts]  [Adjust Budgets]  [Export]         │
│                                                          │
│  ┌─ Daily Spend Chart ──────────────────────────────┐   │
│  │  $2k ┤          ╭──╮                              │   │
│  │      │    ╭─────╯  ╰──╮    ╭──╮                   │   │
│  │  $1k ┤───╯            ╰────╯  ╰──────            │   │
│  │      │                                 budget line│   │
│  │   $0 ┤─────────────────────────────────────────── │   │
│  │       Mar 1          Mar 12          Mar 23       │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Users set monthly/daily budgets per platform/campaign. OrbitX tracks actual spend against budget, forecasts end-of-month spend, and alerts when pacing is off.

### 3.4 Automated Reports

```text
┌─ Report Builder ─────────────────────────────────────────┐
│                                                          │
│  Report: Weekly Marketing Summary                        │
│  Schedule: Every Monday at 9:00 AM                       │
│  Deliver to: #marketing (Slack) + team@acme.com          │
│                                                          │
│  Sections:                                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │  1. Cross-Channel Overview (table)                  │  │
│  │     Metrics: spend, impressions, clicks, conv, ROAS │  │
│  │     Group by: platform                              │  │
│  │     Compare: vs previous week                       │  │
│  │                                                     │  │
│  │  2. Top 5 Campaigns (table)                         │  │
│  │     Sorted by: ROAS (descending)                    │  │
│  │                                                     │  │
│  │  3. Budget Pacing (summary)                         │  │
│  │     Show: MTD spend vs budget per platform          │  │
│  │                                                     │  │
│  │  4. AI Insights (auto-generated)                    │  │
│  │     "What should I know this week?"                 │  │
│  │                                                     │  │
│  │  5. Anomalies Detected (list)                       │  │
│  │     Show: all alerts from the past week             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Format: [✓] Slack message  [✓] Email  [ ] Google Sheet  │
│  [Preview Report]  [Send Now]  [Save Schedule]           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Example Slack message (auto-generated):**

```text
📊 Weekly Marketing Report — Mar 17-23

Channel     Spend      Conv    ROAS    vs Last Week
─────────── ────────── ─────── ─────── ─────────────
Facebook    $12,400    342     3.2x    ↑ +12%
Google      $8,900     198     2.8x    ↓ -5%
TikTok      $4,100     89     2.1x    ↑ +34%
─────────── ────────── ─────── ─────── ─────────────
Total       $25,400    629     2.9x    ↑ +8%

🔥 Top performer: "Summer Sale - Retargeting" (8.2x ROAS)
⚠️ Watch: Google CPA up 15% week-over-week
💡 AI: TikTok video ads showing strong momentum.
   Consider testing UGC creative format.
```

---

## Phase 4 — Activate (Reverse ETL for Marketing)

Close the loop: push insights and audiences back to ad platforms.

### 4.1 Audience Sync

```text
┌─────────────────────────────────────────────────────────┐
│                    Audience Sync                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Source: BigQuery                                        │
│  Query: SELECT email, phone FROM customers              │
│         WHERE ltv > 500 AND last_purchase < 90 days     │
│                                                         │
│  Matched: 12,847 users                                  │
│                                                         │
│  Sync to:                                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  [✓] Facebook Custom Audience                     │  │
│  │      Audience: "High LTV - Active"                │  │
│  │      Match rate: ~67% (estimated)                 │  │
│  │      + Create Lookalike: [✓] 1%  [ ] 5%          │  │
│  │                                                   │  │
│  │  [✓] Google Customer Match                        │  │
│  │      Audience: "High Value Buyers"                │  │
│  │      Match rate: ~72% (estimated)                 │  │
│  │                                                   │  │
│  │  [✓] TikTok Custom Audience                       │  │
│  │      Audience: "VIP Customers"                    │  │
│  │                                                   │  │
│  │  [ ] LinkedIn Matched Audience                    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Schedule: Daily at 6:00 AM (keep audiences fresh)      │
│                                                         │
│  [Sync Now]  [Preview Audience]  [Save]                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Use cases:**

| Audience | Source Query | Sync To | Purpose |
| --- | --- | --- | --- |
| High-LTV customers | LTV > $500 | FB/Google Lookalike | Find similar buyers |
| Cart abandoners | Added to cart, no purchase in 3 days | FB/TikTok retargeting | Recover lost sales |
| Churned subscribers | Cancelled in last 30 days | Google/FB exclusion | Stop wasting spend |
| Lead scored > 80 | HubSpot score > 80 | LinkedIn InMail | Target hot leads |

### 4.2 Automated Campaign Actions (future)

```text
┌─────────────────────────────────────────────────────────┐
│                   Auto-Actions                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Rule: When CPA > $50 for 3 consecutive days            │
│  Action: Pause campaign on Facebook                     │
│  Notify: #marketing on Slack                            │
│                                                         │
│  Rule: When ROAS > 4x for 7 days                        │
│  Action: Increase daily budget by 20%                   │
│  Notify: marketing-lead@acme.com                        │
│  Limit: Max budget increase $500/day                    │
│                                                         │
│  Rule: When new creative has <1% CTR after 1000 impr    │
│  Action: Flag for review (do not pause)                 │
│  Notify: creative-team channel on Slack                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 5 — Scale (Agency & Enterprise)

### 5.1 Multi-Client / Agency Mode

```text
┌─ Agency Dashboard ───────────────────────────────────────┐
│                                                          │
│  Clients: 24 active                                      │
│                                                          │
│  Client           Platforms    Pipelines  Status          │
│  ──────────────── ──────────── ────────── ──────          │
│  Acme Corp        FB, GA, GS   6          ✓ Healthy      │
│  Widget Inc       FB, TT, GA   4          ⚠ 1 alert      │
│  FoodCo           FB, GA, SH   8          ✓ Healthy      │
│  TechStartup      GA, TT, LI   3          🔴 2 failed    │
│                                                          │
│  Today's alerts: 3                                       │
│  Pipelines running: 45                                   │
│  Total spend managed: $1.2M/month                        │
│                                                          │
│  [Add Client]  [Bulk Report]  [White-Label Settings]     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Each client gets:
- Isolated workspace (data never mixes)
- Own connections and credentials
- Own pipelines and schedules
- Client-branded reports (white-label)
- Client-level budget tracking

### 5.2 Template Gallery (Marketing-Specific)

```text
┌─ Templates ──────────────────────────────────────────────┐
│                                                          │
│  Quick Start                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ FB + Google   │ │ All Ads →    │ │ Shopify +    │    │
│  │ → BigQuery    │ │ Google Sheet │ │ Ads → ROAS   │    │
│  │ Daily sync    │ │ Weekly report│ │ Dashboard    │    │
│  │               │ │              │ │              │    │
│  │ [Use Template]│ │ [Use]        │ │ [Use]        │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                          │
│  Advanced                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Multi-Touch  │ │ Budget       │ │ High-LTV     │    │
│  │ Attribution  │ │ Pacing +     │ │ Audience     │    │
│  │ Model        │ │ Slack Alerts │ │ Auto-Sync    │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Competitive Position (Focused)

```text
Feature                   Supermetrics  Funnel.io  Triple   OrbitX
                                                   Whale    (target)
───────────────────────── ───────────── ────────── ──────── ────────
Ad platform connectors    100+          50+        10       15+
Unified marketing schema  ✗ (raw only)  ✓          ✓ (DTC)  ✓
Cross-channel blending    ✗             ✓          ✓        ✓
Visual pipeline builder   ✗             ○          ✗        ✓
Data preview in builder   ✗             ✗          ✗        ✓
AI marketing analyst      ✗             ✗          ○        ✓
Anomaly detection         ✗             ✗          ✓        ✓
Budget monitoring         ✗             ✗          ✓        ✓
Automated reports         ○ (sheets)    ○          ✓        ✓
Audience sync             ✗             ✗          ✗        ✓
Ecommerce integration     ✗             ○          ✓✓       ✓
Custom transforms         ✗             ○          ✗        ✓ (SQL)
Agency multi-client       ✗             ✓          ✗        ✓

✓✓ = best in class   ✓ = supported   ○ = partial   ✗ = not supported
```

**OrbitX wins by being the only tool that covers the full loop:**
Collect → Unify → Transform → Analyze → Alert → Report → Activate

Nobody else does all of these for marketing data.

---

## Implementation Priority

| # | Feature | Effort | Impact | Why This Order |
| --- | --- | --- | --- | --- |
| 1 | LinkedIn Ads source | 1w | 4th biggest ad platform, immediate value | Follows existing extractor pattern exactly |
| 2 | GA4 source | 1w | Every marketer has GA4 | Bridges ad spend ↔ website behavior |
| 3 | Shopify source | 1w | Unlocks ROAS calculation | Revenue data = most requested integration |
| 4 | CSV/file upload | 3d | Table stakes, unblocks any missing source | Simple file → DataFrame conversion |
| 5 | Unified Marketing Schema | 2w | THE differentiator, makes everything else easier | Auto-normalize + calculated metrics engine |
| 6 | Data preview in builder | 2w | Best-in-class UX, no competitor does this | New API endpoint + frontend preview panel |
| 7 | Snowflake destination | 1w | Enterprise requirement, easy add | Follows existing loader pattern |
| 8 | Slack notifications | 1w | Enables alerts and reports | Simple webhook + message formatting |
| 9 | Anomaly detection | 2w | Saves marketers from $10k+ mistakes | Historical baselines + deviation rules |
| 10 | Budget monitor | 2w | Daily value for every marketer | Budget config + pacing calculation |
| 11 | Automated reports (Slack/email) | 2w | Replaces 2 hours/week of manual work | Template engine + scheduled delivery |
| 12 | AI Marketing Analyst | 3w | Natural language queries on marketing data | LLM + SQL generation on unified schema |
| 13 | Audience sync (FB/Google) | 3w | Closes the loop, reverse ETL | New ad platform API integrations (upload) |
| 14 | HubSpot source | 1w | CRM data for lead attribution | Standard API extractor |
| 15 | Agency mode (multi-client) | 4w | Unlocks agency market | Workspace isolation + client dashboard |

---

## The Story We Tell

**To marketers:**
> "Stop wrangling spreadsheets. OrbitX collects all your ad data, unifies it into one view, alerts you when something's wrong, and sends you reports automatically. All in 10 minutes, no code."

**To agencies:**
> "Manage 50 clients' marketing data from one dashboard. Unified reporting, automated alerts, audience sync — white-labeled with your brand."

**To CMOs:**
> "Know exactly where your money goes. Real-time budget tracking, AI-powered anomaly detection, and cross-channel ROAS — without waiting for your analyst to build a spreadsheet."

---

*Generated: 2026-03-23*
