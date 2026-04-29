# OrbitX Founder Learning Roadmap

> What I need to learn to develop this product — ranked by leverage, not by what's easiest or most fun.
>
> Last updated: 2026-04-24

---

## The One Rule

**My technical edge is not the bottleneck. My proximity to the customer is.**

Every hour spent on tech I already know is an hour not spent with a Thai agency owner. Before opening my IDE, ask: "Have I talked to an agency this week?"

---

## Knowledge Priority Stack

```
┌──────────────────────────────────────────────────────────────┐
│  HIGHEST LEVERAGE ↑                                          │
│                                                              │
│  1. Thai Agency Operations (domain)                          │
│     What they sell, charge, report, struggle with daily      │
│                                                              │
│  2. SMB SaaS Distribution in Thailand (GTM)                  │
│     How Thai agencies discover & buy tools                   │
│                                                              │
│  3. Marketing Attribution & Data Science                     │
│     The real "unified schema" moat                           │
│                                                              │
│  4. Platform APIs I Don't Have Yet                           │
│     LINE OA, Shopee Ads, Lazada Ads, TikTok Shop             │
│                                                              │
│  5. Thai Billing / Compliance                                │
│     PromptPay, VAT/WHT, THB invoicing                        │
│                                                              │
│  6. Core Tech Stack (Prefect, FastAPI, etc.)                 │
│     Already have this — stop polishing                       │
│                                                              │
│  LOWEST LEVERAGE ↓                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. Thai Agency Operations — HIGHEST LEVERAGE

**Why:** Building a tool for a customer I may not deeply understand yet. This is where 80% of solo founders fail — building what they *think* agencies need.

### What to learn

- [ ] How a 10-person Thai agency structures its week (media buyer vs account manager vs creative vs analyst roles)
- [ ] What client reports actually look like (Thai-language, weekly, which metrics)
- [ ] Pricing models: retainer vs % of ad spend vs performance
- [ ] Client onboarding process and reporting cadence
- [ ] The exact manual steps that eat hours every week — **that's the product**
- [ ] What "good data tooling" means to a Thai agency owner — in their words, not mine

### How to learn it

- [ ] Cold-message 20 Thai agency owners on LinkedIn this week. Offer free pilot access + 30-min call
- [ ] Take 5 calls. Record. Transcribe. Write up patterns
- [ ] Join Facebook groups:
  - [ ] "Digital Marketing Thailand"
  - [ ] "Performance Marketing Thailand"
  - [ ] "Shopee Seller Thailand"
  - [ ] "TikTok Shop Seller Thailand"
- [ ] Read DAAT reports: https://daat.in.th
- [ ] Follow on LinkedIn: Primal, Convert Cake, GVN, Digitory, Rabbit's Tale
- [ ] Shadow one agency for half a day (offer free month in return)

**Single highest-ROI action: 5 agency conversations this week.**

---

## 2. SMB SaaS Distribution in Thailand — GTM

**Why:** This is the knowledge that decides whether I get to 10 paying agencies in 90 days or zero. Tech won't save me if nobody knows the product exists.

### What to learn

- [ ] How Thai agencies actually discover new tools (FB groups, YouTube, referrals — NOT Product Hunt, NOT Twitter)
- [ ] What a Thai-language landing page looks like that converts
- [ ] Pricing presentation for THB vs USD
- [ ] The role of LINE for customer support in Thailand
- [ ] Free tier → paid conversion patterns in SEA SaaS
- [ ] Thai content marketing patterns (YouTube tutorials, Pantip threads, Facebook live)

### Resources

- [ ] Book: *Obviously Awesome* — April Dunford (positioning — essential)
- [ ] Book: *Play Bigger* — for category design thinking
- [ ] Kaidee, Ookbee, Wongnai case studies (Thai consumer SaaS pioneers)
- [ ] Techsauce content on SEA SaaS GTM (techsauce.co)
- [ ] Interview: founders of Skooldio, FlowAccount, PEAK — Thai SaaS founders who've done it
- [ ] YouTube channel: "Creative Talk" (Thai business content)

### Action items

- [ ] Write a one-page Thai-language positioning doc
- [ ] Study 3 competitor Thai-language landing pages (if any exist)
- [ ] Map the Thai agency buying journey — awareness → trial → purchase → renewal

---

## 3. Marketing Attribution & Data Science

**Why:** This is what makes the "real unified schema" claim actually true vs. fake like competitors. If I want to own this as a moat, I need to actually understand the problem, not just ship another field-renamer.

Supermetrics and Windsor both claim unified schema. Neither reconciles overlapping attribution. That gap is mine to own — but only if I understand it deeply.

### What to learn

- [ ] Multi-touch attribution models: first-touch, last-touch, linear, time-decay, position-based, Markov, Shapley
- [ ] Why Meta and Google both claim credit for the same conversion (attribution window overlap)
- [ ] Incrementality testing basics
- [ ] iOS 14+ / ATT impact on attribution
- [ ] Data Clean Rooms (Meta's, Google's) — emerging but relevant
- [ ] Marketing Mix Modeling (MMM) fundamentals
- [ ] Media Mix Optimization
- [ ] Conversion lag and attribution windows
- [ ] View-through vs click-through conversions

### Resources

- [ ] Avinash Kaushik's blog (kaushik.net/avinash)
- [ ] Book: *Lean Analytics* — Alistair Croll
- [ ] Google's "Marketing Mix Modeling" public docs
- [ ] MeasureCamp videos on YouTube (free, deep technical content)
- [ ] Rand Fishkin's SparkToro writing on attribution realities
- [ ] Meta's "Attribution Setting" documentation
- [ ] Google's "Data-Driven Attribution" whitepapers
- [ ] Book: *Trustworthy Online Controlled Experiments* (Kohavi) — for incrementality

**Estimated time: 20-40 hours of serious reading. Don't skip if I want the schema claim to be defensible.**

---

## 4. Platform APIs I Don't Have Yet

Ranked by Thai-market value:

| Platform | Priority | Why | Docs |
|----------|----------|-----|------|
| **LINE OA (Messaging API + Ads)** | HIGHEST | 56M Thai users, zero competitors, defensible moat | developers.line.biz |
| **Shopee Ads API** | HIGH | Dominant Thai e-commerce; Supermetrics already has it | open.shopee.com |
| **Lazada Sponsored Max API** | HIGH | Dominant Thai e-commerce; new ad format in 2025 | open.lazada.com |
| **TikTok Shop API** | HIGH | Fastest-growing Thai channel | partner.tiktokshop.com |
| LinkedIn Ads | LOW | B2B only; low Thai agency demand | — |
| GA4 | MEDIUM | Table stakes but Google's free connector covers it | developers.google.com/analytics |
| Shopify | LOW | Mostly Western; Thai SMBs use Shopee/Lazada | — |

### Action items

- [ ] Read LINE OA Messaging API docs end-to-end (2-3 hours)
- [ ] Apply for LINE OA developer account
- [ ] Apply for Shopee Open Platform access
- [ ] Apply for Lazada Open Platform access
- [ ] Apply for TikTok Shop Partner Center access
- [ ] **Skip LinkedIn/GA4/Shopify from current CLAUDE.md roadmap — they're catch-up, not differentiation**

---

## 5. Thai Billing / Compliance

**Why:** Small but necessary — blocks conversion if missing. USD-only billing is documented friction for Thai agencies.

### What to learn

- [ ] PromptPay B2B integration options
- [ ] Thai payment gateway comparison: Omise vs 2C2P vs GBPrimePay vs Opn
- [ ] 7% VAT self-declaration rules (foreign SaaS vs Thai SaaS)
- [ ] 3% WHT (withholding tax) on foreign service fees
- [ ] Thai tax invoice format — specific legal requirements
- [ ] e-Tax Invoice system (Revenue Department of Thailand)
- [ ] How to incorporate a Thai company vs Singapore Pte Ltd for SaaS

### Action items

- [ ] Talk to a Thai accountant for 1 hour (~$30-50). Solves 80% of this.
- [ ] Read Omise documentation for recurring SaaS billing
- [ ] Decide: Thai Co Ltd vs Singapore holding structure (affects VAT)

---

## 6. What to STOP Learning

**These are rabbit holes. Every hour here is not spent with an agency owner.**

- [ ] ~~New orchestration frameworks~~ (Prefect works, leave it)
- [ ] ~~Perfect TypeScript strictness polish~~
- [ ] ~~Kubernetes / self-hosting optimization~~
- [ ] ~~New LLM model comparisons~~
- [ ] ~~Fancy visualization libraries~~
- [ ] ~~Alternative databases to MongoDB~~
- [ ] ~~Rewriting the workflow engine~~
- [ ] ~~Premature performance optimization~~

When tempted, ask: "Would an agency owner care?" If no, close the tab.

---

## This Week's Concrete Plan

```
Mon-Tue:  Cold-message 20 Thai agency owners on LinkedIn
Wed-Thu:  Take 5 calls. Record. Transcribe. Write up patterns.
Fri:      Read April Dunford Obviously Awesome (3 hours)
Sat:      Shadow one agency for half a day if possible
Sun:      Write a one-page Thai-language positioning doc
```

## 30-Day Learning Goals

- [ ] 20+ Thai agency conversations logged
- [ ] Finished: Obviously Awesome
- [ ] Finished: core attribution reading (20h)
- [ ] LINE OA API doc reading complete
- [ ] Thai accountant consultation done
- [ ] Thai-language positioning doc drafted
- [ ] Joined 4 relevant Facebook groups, posted intro in each

## 90-Day Checkpoint

- [ ] 50+ agency conversations
- [ ] 10 paying Thai agencies on ~$99-199/month tier
- [ ] LINE OA connector live
- [ ] Shopee Ads connector live
- [ ] Thai-language UI shipped
- [ ] THB billing + PromptPay shipped
- [ ] Multi-tenancy + scheduling + anomaly alert delivery shipped

**If < 3 paying agencies at day 90, stop. The market is telling me no.**

---

## Reading Log

| Date | Resource | Key takeaway |
|------|----------|--------------|
|      |          |              |

## Agency Conversation Log

| Date | Agency | Owner | Size | Biggest pain | Would pay $? |
|------|--------|-------|------|--------------|--------------|
|      |        |       |      |              |              |
