# OrbitX — Go-to-Market Strategy

## The Battlefield

```text
                        ENTERPRISE
                            ▲
                            │
               Adverity     │     Funnel.io
               ($$$)        │     ($$$)
                            │
                            │
         ──────────────────┼──────────────────
         PULL ONLY          │         FULL PLATFORM
         (source → dest)    │         (collect + transform
                            │          + analyze + activate)
                            │
               Supermetrics  │     ← THE GAP
               ($)          │
               Windsor.ai   │     OrbitX goes here
               ($)          │
                            │
                            ▼
                        SMB / SELF-SERVE
```

Nobody owns the bottom-right quadrant: a full-platform marketing data tool that's self-serve and affordable. That's where OrbitX wins.

---

## Know Your Enemy

### Supermetrics — The Incumbent

```text
Revenue:         ~$50-60M ARR (estimated)
Customers:       ~30,000
Pricing:         Per-connector, $29-$239/month per source
Founded:         2013 (13 years, mature)
Team:            ~300 people
Funding:         $51M Series B

Strengths:                       Weaknesses:
─────────                        ──────────
✓ 100+ connectors                ✗ Pull-only (no transforms)
✓ Brand recognition              ✗ No visual builder
✓ Google Sheets integration      ✗ No unified schema (raw dump)
✓ Easy onboarding                ✗ No AI / intelligence
✓ Large partner ecosystem        ✗ Per-connector pricing (expensive at scale)
                                 ✗ No anomaly detection
                                 ✗ No reverse ETL
                                 ✗ Stale product (few new features)
                                 ✗ No data preview
```

**How users complain about Supermetrics** (from G2/Reddit/Twitter):

- "It just dumps raw data, I still need to normalize everything"
- "Gets expensive fast — $200/mo just for 3 connectors"
- "No way to transform data before it hits my sheet"
- "Data sometimes breaks and I don't know until my dashboard is wrong"
- "Wish it could alert me when spend spikes"

Every complaint = an OrbitX feature.

### Windsor.ai — The Attribution Player

```text
Revenue:         ~$2-5M ARR (estimated)
Pricing:         $19-$499/month
Founded:         2017

Strengths:                       Weaknesses:
─────────                        ──────────
✓ Multi-touch attribution        ✗ Attribution-focused, not a full platform
✓ Affordable entry price         ✗ Limited connectors (~30)
✓ Marketing-specific             ✗ Dated UI/UX
                                 ✗ Small team, slow development
                                 ✗ Not well known
                                 ✗ No reverse ETL
                                 ✗ No AI insights
```

### Funnel.io — The Enterprise Option

```text
Revenue:         ~$30-40M ARR
Pricing:         Custom, starts ~$1,000/mo
Founded:         2014

Strengths:                       Weaknesses:
─────────                        ──────────
✓ Unified data model             ✗ Expensive ($1k+ /month)
✓ Enterprise features            ✗ No self-serve (sales-led only)
✓ Strong data mapping            ✗ Slow onboarding (weeks)
                                 ✗ No AI
                                 ✗ No reverse ETL
                                 ✗ No anomaly detection
                                 ✗ Overkill for SMB
```

---

## OrbitX Positioning

### One-liner

> "All your marketing data, unified and intelligent — in minutes, not months."

### The pitch (30 seconds)

> "Supermetrics pulls your data but dumps it raw. You still spend hours normalizing field names, calculating ROAS, and building reports manually. OrbitX does everything Supermetrics does — plus auto-unifies your data into one schema, alerts you when something breaks, sends reports automatically, and lets you push audiences back to your ad platforms. All in a visual builder. Starting at $0."

### Positioning statement

```text
FOR         performance marketers, marketing analysts, and agencies
WHO         need to collect, unify, and act on marketing data from multiple platforms
ORBITX IS   the marketing data operating system
THAT        collects from every ad platform, auto-unifies into one schema,
            detects anomalies, generates reports, and syncs audiences back
UNLIKE      Supermetrics (pull-only, raw data, no intelligence)
            Windsor.ai (attribution-only, limited connectors)
            Funnel.io (enterprise pricing, no self-serve)
OUR PRODUCT offers the full marketing data loop in one self-serve platform
            with AI-powered insights at an accessible price
```

---

## Pricing Strategy — How to Beat Them on Price

### The Supermetrics trap

Supermetrics charges per connector. A marketer with FB + Google + TikTok + GA4 + Shopify pays $100-500/month just for data pulls, with zero transforms or intelligence.

### OrbitX pricing: all sources included

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  FREE                    TEAM               AGENCY      │
│  $0/month                $79/month          $249/month  │
│                                                         │
│  ✓ 3 sources             ✓ Unlimited        ✓ Unlimited │
│  ✓ 2 workflows             sources            sources   │
│  ✓ 1,000 rows/day        ✓ 10 workflows     ✓ Unlimited │
│  ✓ Unified schema         ✓ 100k rows/day     workflows │
│  ✓ Data preview          ✓ AI analyst        ✓ 1M rows  │
│  ✓ 1 destination         ✓ Anomaly alerts    ✓ AI       │
│                          ✓ Slack/email       ✓ Alerts   │
│  Perfect for               reports           ✓ Reports  │
│  trying OrbitX           ✓ 3 destinations    ✓ Audience │
│                          ✓ Audience sync       sync     │
│                                              ✓ 10       │
│                          Perfect for           clients  │
│                          in-house teams      ✓ White-   │
│                                                label    │
│                                                         │
│                                              Perfect    │
│                                              for        │
│                                              agencies   │
│                                                         │
│  [Start Free]            [Start Free Trial]  [Talk to   │
│                          14 days free         Sales]    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Why this wins:**

| Scenario | Supermetrics | OrbitX |
| --- | --- | --- |
| FB + Google + BigQuery | $119/mo (Essential) | $0 (free tier) |
| FB + Google + TikTok + GA4 + BigQuery | $239/mo (Core) | $79/mo (Team) |
| 5 sources + 3 dests + alerts + reports | $400+/mo (custom) | $79/mo (Team) |
| Agency with 10 clients | $2,000+/mo | $249/mo (Agency) |

**OrbitX is 3-5x cheaper AND does more.** This is how you steal market share.

### Pricing psychology

1. **Free tier must be genuinely useful** — 3 sources + unified schema + data preview. The user gets real value and hits the "aha moment" before paying.
2. **All sources included in every paid plan** — No nickel-and-diming per connector. This is the #1 Supermetrics complaint.
3. **Row-based scaling** — Pay for volume, not features. Fair and predictable.
4. **Annual discount** — 20% off for annual billing (Team: $63/mo, Agency: $199/mo).

---

## Growth Strategy

### Phase 1: Product-Led Growth (PLG) — Months 1-6

The product sells itself. Users sign up, connect 2-3 sources, see unified data, and upgrade.

```text
       AWARENESS                ACTIVATION              REVENUE
       ─────────                ──────────              ───────

    Content / SEO          Sign up (free)          Hit row limit
         │                      │                      │
         ▼                      ▼                      ▼
    "facebook ads          Connect FB + Google     "I need more
     to bigquery"          See unified data         rows + alerts"
         │                      │                      │
         ▼                      ▼                      ▼
    Land on OrbitX         Build first pipeline    Upgrade to Team
    blog / docs                 │                      │
         │                      ▼                      ▼
         ▼                 Share report             Invite team
    Sign up free           with team               members
                                │
                                ▼
                           Team sees value
                           More people sign up
```

**The "aha moment" is:**
1. User connects 2 ad platforms (30 seconds each)
2. User sees unified data with matching column names (automatic)
3. User sees calculated metrics (ROAS, CPC, CTR) they didn't have to build
4. User clicks "Preview" and sees their actual data in the builder

**Time to aha: under 5 minutes.** This is critical. If setup takes longer than 5 minutes, you lose them.

### Phase 2: Content & SEO — Months 1-12 (parallel)

Own every search query a marketer types about data.

**Target keywords (high intent, low competition):**

| Keyword | Monthly Search Volume | Content Type |
| --- | --- | --- |
| "facebook ads to bigquery" | 1,900 | Tutorial + template |
| "google ads to google sheets" | 2,400 | Tutorial + template |
| "tiktok ads reporting" | 1,200 | Guide + template |
| "cross channel marketing report" | 800 | Guide + template |
| "marketing data automation" | 600 | Pillar page |
| "supermetrics alternative" | 1,100 | Comparison page |
| "marketing dashboard automation" | 500 | Guide + template |
| "roas tracking across channels" | 400 | Guide + template |
| "facebook ads api python" | 3,200 | Tutorial (captures developers) |
| "marketing data pipeline" | 300 | Pillar page |

**Content strategy:**

```text
                    ┌─────────────────────┐
                    │   Pillar Pages      │
                    │   (rank for head    │
                    │    terms)           │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌─────▼───────┐ ┌─────▼───────┐
    │  Tutorials     │ │  Templates  │ │ Comparisons │
    │  "How to..."   │ │  "FB + GA4  │ │ "OrbitX vs  │
    │  (rank for     │ │   → BQ"     │ │ Supermetrics│
    │  long-tail)    │ │  (convert)  │ │ (steal)     │
    └────────────────┘ └─────────────┘ └─────────────┘
```

**Every piece of content includes a template the user can import in one click.**

This is the flywheel: content → sign up → use template → see value → upgrade.

### Phase 3: Community & Templates — Months 3-12

```text
┌─ OrbitX Community ───────────────────────────────────────┐
│                                                          │
│  Templates (one-click import):                           │
│                                                          │
│  Popular This Week:                                      │
│  📊 FB + Google + TikTok → BigQuery (unified)   ↓ 2.4k  │
│  📊 All Ads → Weekly Slack Report               ↓ 1.8k  │
│  📊 Shopify + FB Ads → ROAS Dashboard           ↓ 1.2k  │
│  📊 Budget Pacing Monitor + Alerts              ↓ 890   │
│                                                          │
│  Guides:                                                 │
│  📖 How to calculate true ROAS across channels           │
│  📖 Setting up marketing anomaly detection               │
│  📖 Agency reporting automation playbook                 │
│                                                          │
│  Community:                                              │
│  💬 Discord server (marketers helping marketers)         │
│  💬 Monthly webinar: "Marketing Data Office Hours"       │
│  💬 Template submission + featured creators              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Templates are the growth engine:
- User searches "facebook ads to bigquery"
- Finds OrbitX template
- One-click import, connects their accounts
- Working pipeline in 2 minutes
- Upgrades when they need more

### Phase 4: Partnerships — Months 6-18

```text
Partner Type        Example              What They Get           What OrbitX Gets
──────────────────  ───────────────────  ──────────────────────  ─────────────────
BI Tools            Looker Studio,       "Connect OrbitX" in     Distribution to
                    Metabase, Preset     their marketplace       their user base

Ad Agencies         Performance agencies  White-label reports,   Access to their
                    managing $1M+ spend   client management      clients (20-50 each)

Marketing Courses   CXL, Reforge,        "Recommended tool"     Credibility +
                    Marketing Examples    in their curriculum    student signups

Consultants         Freelance marketing  Referral commission     Word-of-mouth in
                    consultants          (20% recurring)        SMB market

Tech Partners       BigQuery, Snowflake  Featured integration   Co-marketing,
                    (Google Cloud, AWS)  in their marketplace   cloud credits
```

**Agency partnership is the highest leverage.** One agency partner = 20-50 new clients. If the agency uses OrbitX for all their clients, switching cost is enormous.

---

## Competitive Playbook

### How to Beat Supermetrics

```text
THEIR STRENGTH              HOW WE COUNTER
──────────────              ───────────────

100+ connectors             We don't need 100. We need the top 15
                            that cover 90% of marketers. Then add
                            the HTTP connector for the long tail.
                            "15 sources + any API" > "100 sources
                            but raw data only"

Brand recognition           Content marketing + SEO + "Supermetrics
                            alternative" comparison pages. Target
                            THEIR keywords with better content.

Google Sheets               We support Sheets too — but also BigQuery,
integration                 Snowflake, and Slack. Plus we UNIFY the
                            data. Sheets users upgrade to BigQuery
                            as they grow.

Easy onboarding             Match their onboarding speed (under 5 min)
                            but deliver MORE value at the end of it.
                            They get raw data. We get unified data
                            with metrics calculated.

Existing customers          Target frustrated Supermetrics users.
                            Build a migration tool: import their
                            Supermetrics config → OrbitX pipeline.
                            "Switch in 10 minutes."
```

**The wedge: Unified schema + data preview.**

When a marketer sees their FB and Google data side-by-side with matching column names, calculated ROAS, and a visual preview — they can't go back to Supermetrics' raw CSV dump.

### How to Beat Windsor.ai

Windsor is smaller and more niche. We don't need a special strategy — we just need to be better on:

1. **More connectors** — Windsor has ~30, we'll have 15+ with HTTP connector
2. **Better UX** — Our visual builder vs their dated interface
3. **More features** — We do everything they do (attribution) plus transforms, AI, reports, reverse ETL
4. **Pricing** — Competitive or cheaper

Windsor users will switch naturally as they discover OrbitX through content/SEO.

### How to Beat Funnel.io

We don't compete directly with Funnel — they're enterprise ($1k+/mo). But we steal their SMB prospects who can't afford Funnel:

- Marketer evaluates Funnel.io → too expensive → searches for alternative → finds OrbitX
- "Funnel.io alternative" is a great SEO keyword to target
- Our $79/mo Team plan does 80% of what Funnel does at 8% of the price

---

## Launch Strategy

### Pre-Launch (4-6 weeks before)

```text
Week -6    Build landing page with waitlist
           Start "marketing data" content series (blog)
           Set up Twitter/LinkedIn presence

Week -4    Launch 3-4 SEO articles targeting high-intent keywords
           Start posting on Reddit (r/PPC, r/marketing, r/analytics)
           Reach out to 10 marketing newsletters for launch coverage

Week -2    Send waitlist preview access (beta)
           Collect testimonials and case studies from beta users
           Prepare Product Hunt launch assets

Week -1    Final testing, prepare launch day content
           Brief 5-10 marketing influencers / creators
```

### Launch Day

```text
Channel              Action                              Expected Impact
───────────────────  ──────────────────────────────────  ──────────────
Product Hunt         Launch with 3 templates + video      500-1,000 signups
Twitter/LinkedIn     Founder story + product demo          200-500 signups
Reddit               r/PPC, r/marketing, r/analytics      100-300 signups
Hacker News          "Show HN: Open-source marketing       300-800 signups
                      data platform with AI"
Email to waitlist    "We're live" with 14-day free trial   50-100 upgrades
Marketing            IndieHackers, Marketing Brew,         200-500 signups
newsletters          The Hustle, etc.
```

**Target: 2,000-3,000 signups in first week.**

### Post-Launch (Months 1-3)

```text
Week 1-2:  Fix bugs, respond to feedback, improve onboarding
Week 3-4:  Publish 5 comparison pages (vs Supermetrics, Funnel, etc.)
Week 5-8:  Launch template gallery with 10+ templates
Week 9-12: First agency partnerships, first case studies

Monthly content cadence:
  - 4 blog posts (SEO-targeted tutorials/guides)
  - 2 templates (importable workflows)
  - 1 comparison page
  - 1 webinar / live demo
  - Daily social posts (tips, insights, product updates)
```

---

## Metrics That Matter

### North Star Metric

**Weekly active pipelines** — A pipeline that ran successfully at least once in the last 7 days. This captures both engagement (user set it up) and reliability (it's working).

### Funnel Metrics

```text
Visitors → Signups → Activated → Paying → Retained → Expanded

Target benchmarks:
  Visitor → Signup:     5-8%   (landing page conversion)
  Signup → Activated:   30-40% (connected 1+ source, ran 1+ pipeline)
  Activated → Paying:   10-15% (hit free tier limit, saw enough value)
  Monthly churn:        <5%    (sticky once data flows through)
  Net revenue retention: 120%+ (teams add sources/workflows over time)
```

### Key milestones

| Milestone | Target | Timeframe |
| --- | --- | --- |
| Launch on Product Hunt | Top 5 of the day | Month 1 |
| 1,000 signups | Active accounts | Month 2 |
| 100 paying customers | Team or Agency plan | Month 4 |
| $10K MRR | Monthly recurring revenue | Month 6 |
| 5 agency partners | Each managing 10+ clients | Month 9 |
| $50K MRR | | Month 12 |
| $100K MRR | | Month 18 |

---

## Content Calendar (First 3 Months)

### Month 1 — Launch & Foundation

| Week | Blog Post | Template | Other |
| --- | --- | --- | --- |
| 1 | "Why your marketing data is a mess (and how to fix it)" | FB + Google → BigQuery | Product Hunt launch |
| 2 | "How to automate Facebook Ads reporting to BigQuery" | FB Ads → BigQuery (daily) | Comparison: OrbitX vs Supermetrics |
| 3 | "Cross-channel ROAS: one dashboard for all your ad spend" | Unified ads → Google Sheets | Guest post on marketing blog |
| 4 | "5 marketing data mistakes costing you $10K/month" | Budget pacing monitor | First webinar |

### Month 2 — SEO & Templates

| Week | Blog Post | Template | Other |
| --- | --- | --- | --- |
| 1 | "Google Ads to BigQuery: the complete guide" | Google Ads → BigQuery | Comparison: OrbitX vs Funnel.io |
| 2 | "TikTok Ads reporting automation for 2026" | TikTok → Sheets (weekly) | Reddit AMA on r/PPC |
| 3 | "How agencies automate client reporting" | Agency weekly report | Reach out to agencies |
| 4 | "Marketing anomaly detection: catch $50K mistakes" | Spend alert pipeline | Case study #1 |

### Month 3 — Growth & Community

| Week | Blog Post | Template | Other |
| --- | --- | --- | --- |
| 1 | "Shopify + Facebook Ads: true ROAS tracking" | Shopify + FB → ROAS | Comparison: OrbitX vs Windsor |
| 2 | "The marketer's guide to BigQuery" | GA4 + Ads → BigQuery | Launch Discord community |
| 3 | "How to build a marketing data warehouse in 10 minutes" | Full stack template | Webinar with agency partner |
| 4 | "AI marketing analyst: ask your data anything" | AI insights pipeline | Feature launch: AI analyst |

---

## Moat Building (Long-term Defensibility)

```text
Time        What We Build                 Why It's Hard to Copy
────        ─────────────                 ──────────────────────

Month 1-6   Unified marketing schema      Deep domain knowledge of
            across 15+ platforms           every platform's API quirks.
                                          Took months of mapping work.

Month 3-9   Template library with          Network effect — more
            100+ community templates       templates = more users =
                                          more templates. Winner
                                          takes most.

Month 6-12  AI trained on marketing        Proprietary training data
            data patterns (anomalies,      from thousands of pipelines.
            benchmarks, insights)          Generic LLMs can't do this.

Month 9-18  Agency ecosystem with          Relationship moat. Agencies
            50+ partners using OrbitX      don't switch once clients
            for all their clients          are onboarded.

Month 12+   Historical benchmark data      "Your CTR is top 20% for
            across all OrbitX users        your industry." Only possible
            (anonymized + aggregated)      with scale. Nobody else has
                                          this cross-company data.
```

The ultimate moat: **OrbitX knows what "normal" looks like for marketing data.** After thousands of pipelines, we can tell a user "your Facebook CPA is 30% higher than similar companies in your industry." No competitor can do this without our data scale.

---

## Budget Allocation (First 12 Months)

Assuming bootstrapped or small seed round:

```text
Category              Monthly Budget    Notes
────────────────────  ──────────────    ─────
Content / SEO         $2,000-3,000      Writers, design, SEO tools
Paid acquisition      $1,000-2,000      Google Ads for "supermetrics alternative"
                                        LinkedIn ads targeting agencies
Community             $500              Discord, events, swag
Tools                 $500              Analytics, email, CRM
Partnerships          $0 (rev share)    20% referral commission
──────────────────────────────────────
Total                 $4,000-6,000/mo
```

**Paid acquisition target:** CAC < $100 for Team plan ($79/mo). At 12-month average lifetime, LTV:CAC > 9:1.

**The real growth engine is organic** (SEO + templates + word of mouth). Paid is just to accelerate early traction.

---

## Summary: The Playbook

```text
1. BUILD the unified marketing schema (the product moat)
2. LAUNCH with a free tier that delivers instant value
3. CREATE content that ranks for every "X ads to Y" keyword
4. SHIP templates that let users start in 2 minutes
5. PRICE 3-5x cheaper than Supermetrics for more features
6. PARTNER with agencies (1 agency = 20-50 clients)
7. ADD AI intelligence that makes raw data tools look primitive
8. BUILD community that creates templates and helps each other
9. ACCUMULATE benchmark data that becomes impossible to replicate
```

**The end state:** Marketers don't ask "which tool should I use for marketing data?" They ask "do you use OrbitX?"

---

*Generated: 2026-03-23*
