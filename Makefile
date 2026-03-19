.PHONY: install dev-server dev-web dev test-all test-server test-engine test-web lint format

# ── Setup ──────────────────────────────────────────────
install:
	uv sync
	cd web && npm install

# ── Development ────────────────────────────────────────
dev-server:
	cd server && uv run uvicorn server.main:app --reload --host 0.0.0.0 --port 8080

dev-web:
	cd web && npm run dev

dev: ## Run server + web in parallel (Ctrl+C kills both)
	@lsof -ti:8080 -ti:5173 | xargs kill -9 2>/dev/null || true
	@trap 'kill 0' EXIT; \
	(cd server && uv run uvicorn server.main:app --reload --host 0.0.0.0 --port 8080) & \
	(cd web && npm run dev) & \
	wait

# ── Testing ────────────────────────────────────────────
test-all: test-server test-engine test-web

test-server:
	cd server && uv run pytest

test-engine:
	cd engine && uv run pytest

test-web:
	cd web && npm run test:run

# ── Linting ────────────────────────────────────────────
lint:
	uv run ruff check .

format:
	uv run ruff format .
