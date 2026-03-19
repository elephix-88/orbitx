FROM python:3.13-slim AS builder

WORKDIR /build
RUN pip install uv

COPY pyproject.toml ./
COPY common/ common/
COPY engine/ engine/

RUN cd engine && uv sync --frozen --no-dev

FROM python:3.13-slim

WORKDIR /app
COPY --from=builder /build/engine/.venv /app/.venv
COPY common/orbitx_common /app/common/orbitx_common
COPY engine/configs/ /app/engine/configs/
COPY engine/engine/ /app/engine/engine/

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"

CMD ["python", "-m", "engine.workflow"]
