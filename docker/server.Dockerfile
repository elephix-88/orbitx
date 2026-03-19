FROM python:3.13-slim AS builder

WORKDIR /build
RUN pip install uv

COPY pyproject.toml ./
COPY common/ common/
COPY server/ server/

RUN cd server && uv sync --frozen --no-dev

FROM python:3.13-slim

WORKDIR /app
COPY --from=builder /build/server/.venv /app/.venv
COPY common/orbitx_common /app/common/orbitx_common
COPY server/configs/ /app/server/configs/
COPY server/server/ /app/server/server/

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

EXPOSE 8080

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8080"]
