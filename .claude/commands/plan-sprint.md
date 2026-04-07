# Sprint Planning (Founder Shortcut)

> ⚠️ **When to use this command:**
> This is a **founder-only shortcut** for quick solo planning — prototyping, hotfixes, or unblocking yourself fast.
>
> For full product sprints, use the agent team instead:
> Research Team → Product Owner → Project Manager → Engineers → QA
>
> This command bypasses the research consensus, feasibility scoring, and QA gate.
> Use it when speed matters more than process. Do not use it for features that need the unified schema, multi-engineer coordination, or platform API work.

## Tools You Use

- `read_file` — read PRODUCT_ROADMAP.md, COMPETITIVE_STRATEGY.md, recent work
- `bash_tool` — check recent git log and open TODOs
- `list_directory` — check current codebase state

## Process

### Step 1 — Read context

```bash
# Recent work
git log --oneline -20

# Open TODOs in codebase
grep -r "TODO\|FIXME\|HACK" engine/ server/ web/src/ --include="*.py" --include="*.ts" --include="*.tsx" | head -30
```

Then read using `read_file`:
- `PRODUCT_ROADMAP.md`
- `COMPETITIVE_STRATEGY.md`

### Step 2 — Assess current state

Answer these before planning:
- What was the last thing shipped?
- What is currently broken or incomplete?
- What is the single most important thing for getting to the next paying customer?

### Step 3 — Plan

Apply these constraints hard — do not negotiate them away:
- **Max 5 tasks** — focus beats volume
- **Max 3 days per task** — if bigger, break it down or defer it
- **Every task must connect to revenue** — directly (new feature) or indirectly (fixes blocker, reduces churn)
- **At least 1 marketing task** — SEO article or template (use `/write-article` command after planning)
- **No speculative architecture** — nothing that "will be useful later"

### Step 4 — Flag multi-engineer work

If any task requires both Backend and Frontend, or touches `common/` models AND `server/` endpoints, flag it:

```
⚠️ COORDINATION REQUIRED
This task spans multiple packages. For clean execution, run it through the agent team sprint loop instead of solo.
Reason: [what crosses the boundary]
```

## Output Format

```
## Sprint Goal
[One sentence — what is demonstrably working at the end of this sprint]

## Tasks (ordered by priority)

[P0] Task name
  What: [what to build — specific enough to start immediately]
  Files: [which files to create or modify]
  Effort: [hours]
  Done when: [specific, testable condition]
  Revenue link: [direct / unblocks X / reduces churn by Y]

[P1] ...
[P1] ...
[P2] ...
[P2] ...

## Explicitly NOT this sprint
- [Thing 1] — defer because [reason]
- [Thing 2] — defer because [reason]

## Decision needed before starting
[Any product or architecture decision that must be made first. If none, write "None."]

## Coordination flags
[Any tasks that should move to the agent team sprint loop instead. If none, write "None."]
```