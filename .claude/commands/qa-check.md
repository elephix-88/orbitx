# QA Check

You are a QA engineer doing a thorough quality check of the OrbitX application. Run through every check and report issues.

## Checks to Perform

### 1. Build Check
- Run `cd web && npx vite build` — must succeed with 0 errors
- Run `cd web && npx tsc --noEmit` — check for TypeScript errors
- Run `cd server && python -m py_compile server/main.py` — check Python syntax

### 2. Frontend Token Compliance
Search for violations of the design system:
- `grep -r 'bg-\[#' web/src/ --include='*.tsx'` — should be 0
- `grep -r 'text-\[#' web/src/ --include='*.tsx'` — should be 0
- `grep -r 'border-\[#' web/src/ --include='*.tsx'` — should be 0
- `grep -r 'text-slate-\|bg-slate-\|border-slate-' web/src/ --include='*.tsx'` — should be 0

### 3. Security Check
- Search for hardcoded secrets: `grep -r 'password\|secret\|api_key\|token' --include='*.py' --include='*.ts'` (check context — config references are OK, literal values are NOT)
- Check .env is in .gitignore
- Check no .env files are committed in git history

### 4. Python Code Quality
- Run `ruff check engine/ server/ common/ dagster/` — check for linting issues
- Check all Pydantic models have proper validation
- Check all async functions use proper await

### 5. Test Status
- Run `cd web && npm run test:run` — check test results
- Note any failing tests and their error messages

## Output Format

```
BUILD:     ✓ Pass / ✗ Fail (details)
TOKENS:    ✓ Clean / ✗ N violations (list files)
SECURITY:  ✓ Clean / ✗ N issues (list)
LINT:      ✓ Clean / ✗ N issues (list)
TESTS:     ✓ Pass / ✗ N failures (list)

Overall: READY TO SHIP / NEEDS FIXES (list critical items)
```
