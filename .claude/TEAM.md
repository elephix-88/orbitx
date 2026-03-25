# OrbitX AI Agent Team Structure

## Organization Chart

```text
                        ┌─────────────────┐
                        │    FOUNDER       │
                        │  (Human — You)   │
                        │  Final authority │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   TEAM LEAD      │
                        │  (Claude — Main) │
                        │  Orchestrates    │
                        │  the sprint loop │
                        └────────┬─────────┘
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     │                           │                           │
     ▼                           ▼                           ▼
┌─────────────┐          ┌──────────────┐          ┌─────────────────┐
│  RESEARCH   │          │   PRODUCT    │          │    PROJECT      │
│  TEAM       │─────────►│   OWNER      │─────────►│    MANAGER      │
│             │consensus │   (opus)     │big req   │    (sonnet)     │
│ Researcher  │          │             │          │                 │
│  (sonnet)   │◄─────────│  Researches │          │ Splits into     │
│ Creative    │ feedback  │  Decides    │          │ sprint tasks    │
│  (opus)     │          │  Approves   │          │ Assigns to      │
│             │          │             │          │ engineers       │
└─────────────┘          └─────────────┘          └────────┬────────┘
                                                           │
                                          task specs per engineer
                                                           │
                              ┌─────────────┬──────────────┼──────────────┐
                              │             │              │              │
                       ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐      │
                       │  Frontend   │ │ Backend  │ │   Data     │      │
                       │  Engineer   │ │ Engineer │ │  Engineer  │      │
                       │  (sonnet)   │ │ (sonnet) │ │  (opus)    │      │
                       │  web/       │ │ server/  │ │  engine/   │      │
                       │             │ │          │ │  dagster/  │      │
                       │             │ │          │ │  common/   │      │
                       └──────┬──────┘ └────┬─────┘ └─────┬──────┘      │
                              │             │             │              │
                              │    can request help from  │              │
                              │  ┌───────────────────┐    │              │
                              ├─►│ CONSULTANT AGENTS │◄───┤              │
                              │  │                   │    │              │
                              │  │ API Docs (sonnet) │    │              │
                              │  │ × N instances     │    │              │
                              │  └───────────────────┘    │              │
                              │                           │              │
                              └─────────────┬─────────────┘              │
                                            │                            │
                                   ┌────────▼────────┐                   │
                                   │   QA TESTER     │                   │
                                   │   (sonnet)      │                   │
                                   │                 │                   │
                                   │  Reviews ONLY   │                   │
                                   │  No coding      │                   │
                                   │  No implementing│                   │
                                   │                 │                   │
                                   │  Checks:        │                   │
                                   │  - Global rules │                   │
                                   │  - Product sense │                   │
                                   │  - Broken code  │                   │
                                   └────────┬────────┘                   │
                                            │                            │
                                     PASS ──┤── FAIL                     │
                                            │      │                     │
                                            │      └─ bug report ───────►│
                                            │         back to PM         │
                                            │         PM reassigns       │
                                            │                            │
                                   ┌────────▼────────┐                   │
                                   │  EXPORT TO MD   │                   │
                                   │  Report to      │                   │
                                   │  Team Lead +    │                   │
                                   │  Founder        │                   │
                                   └─────────────────┘
```

## Sprint Loop (Step by Step)

```text
STEP 1: RESEARCH
  ┌──────────────┐     ┌──────────────────┐
  │ Market       │────►│ Creative         │
  │ Researcher   │◄────│ Strategist       │
  └──────────────┘     └──────────────────┘
         │      DEBATE & DISCUSS      │
         └────────────┬───────────────┘
                      │
                 CONSENSUS
                 (agreed recommendation)
                      │
STEP 2: PRODUCT DECISION
                      ▼
               ┌──────────────┐
               │ Product Owner │
               │              │
               │ Does own     │──── feedback to researchers
               │ research     │     if needs more data
               │              │
               │ APPROVES     │──── writes big requirement
               │ or DEFERS    │
               └──────┬───────┘
                      │
STEP 3: SPRINT PLANNING
                      ▼
               ┌──────────────────┐
               │ Project Manager  │
               │                  │
               │ Splits big req   │
               │ into small tasks │
               │ Plans sprint     │
               │ Defines deps     │
               │ Assigns to       │
               │ engineers        │
               └──────┬───────────┘
                      │
STEP 4: BUILD (engineers + consultants)
                      ▼
         ┌────────────┼────────────┐
         │            │            │
    Frontend     Backend      Data Eng
     (web/)     (server/)    (engine/)
         │            │            │
         │   request consultants   │
         │   (API Docs, etc.)      │
         │   as needed             │
         │            │            │
         └────────────┼────────────┘
                      │
STEP 5: QA REVIEW (no coding)
                      ▼
               ┌──────────────┐
               │  QA Tester   │
               │              │
               │  Checks:     │
               │  • Global    │
               │    config    │
               │    rules     │
               │  • Product   │
               │    sense     │
               │  • Broken    │
               │    features  │
               │              │
               │  Does NOT:   │
               │  • Write code│
               │  • Write     │
               │    tests     │
               │  • Implement │
               │    fixes     │
               └──────┬───────┘
                      │
               PASS ──┤── FAIL
                      │      │
                      │      ▼
                      │   Bug report → Project Manager
                      │   PM reassigns to engineer
                      │   Engineer fixes → QA retests
                      │
STEP 6: EXPORT & REPORT
                      ▼
               ┌──────────────┐
               │ Export to MD  │
               │ Report to     │
               │ Team Lead +   │
               │ Founder       │
               └──────┬────────┘
                      │
               Loop back to Step 1
```

## Agent Roster

### Strategic Layer

| Agent | Model | Role |
|---|---|---|
| **Product Owner** | opus | Decides WHAT to build. Reviews researcher consensus. Does own research to validate. Gives feedback to researchers or approves. Writes the big requirement document for PM. |
| **Project Manager** | sonnet | Plans HOW and WHEN. Takes PO's big requirement, splits into small tasks per engineer, plans sprint order, defines dependencies, assigns work. Handles bug reports from QA and reassigns to engineers. |

### Research Team

| Agent | Model | Role |
|---|---|---|
| **Market Researcher** | sonnet | Brings DATA — competitor analysis, market trends, user pain points, pricing gaps. |
| **Creative Strategist** | opus | Brings IDEAS — challenges assumptions, thinks laterally, reframes problems, proposes bold directions. |

Research team works as a **pair**. They debate and discuss until they reach **consensus**. Only then do they present to the Product Owner.

### Engineering Team

| Agent | Model | Owns | Role |
|---|---|---|---|
| **Frontend Engineer** | sonnet | `web/` | React 18, TypeScript, Tailwind, Zustand, React Flow. Receives task specs from PM. Can request consultant agents. |
| **Backend Engineer** | sonnet | `server/` | FastAPI, MongoDB, JWT auth. Receives task specs from PM. Can request consultant agents. |
| **Data Engineer** | opus | `engine/` `dagster/` `common/` | Extractors, transformers, loaders, Dagster, shared models. Receives task specs from PM. Can request consultant agents. |

### Quality Gate

| Agent | Model | Role |
|---|---|---|
| **QA Tester** | sonnet | Reviews ONLY — does NOT write code, tests, or implementations. Checks: (1) code follows global config rules, (2) feature makes product sense, (3) nothing is broken. Reports bugs to PM with file, line, and description. |

### Consultant Agents (on-demand)

| Agent | Model | Role |
|---|---|---|
| **API Docs Researcher** | sonnet | On-demand, multi-instance. Engineers request when they need platform API documentation (Facebook, Google, TikTok, LINE, Slack, etc.). Delivers structured integration guides. |

## Model Strategy

```text
OPUS (3 agents) — Deep reasoning, architecture, creativity
  Product Owner       Strategic decisions, requirement writing
  Creative Strategist Lateral thinking, blue ocean ideas
  Data Engineer       Schema design, cross-platform data

SONNET (6 agents) — Fast execution, pattern matching
  Project Manager     Task planning, sprint management
  Market Researcher   Data gathering, trend analysis
  Frontend Engineer   React/Tailwind component code
  Backend Engineer    FastAPI endpoint code
  QA Tester           Rule checking, review (no coding)
  API Docs Researcher Documentation lookup (on-demand)
```

## Rules

### Flow Rules
- Researchers must reach consensus before presenting to PO
- PO can send feedback back to researchers for more data
- PO writes the big requirement — PM breaks it down
- PM assigns tasks to engineers — engineers don't self-assign
- Engineers can request consultant agents (API Docs) as needed
- QA reviews AFTER engineers deliver — QA never writes code
- QA reports bugs to PM — PM reassigns to engineers
- Every sprint output is exported to an MD file and reported to Team Lead + Founder

### Ownership Rules
- Frontend touches ONLY `web/`
- Backend touches ONLY `server/`
- Data Engineer touches ONLY `engine/`, `dagster/`, `common/`
- Shared models in `common/` are owned by Data Engineer
- Cross-boundary work is coordinated by Project Manager

### Quality Rules
- All code must follow the founder's global config rules
- No underscore prefixes on methods
- No abbreviations in names
- Pydantic BaseModel for all structured data
- loguru only for logging
- No isinstance in production code
- Specific exceptions only
- QA checks ALL of these before approving
