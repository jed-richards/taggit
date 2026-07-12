# ---- deps ---------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS build
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .
RUN uv sync --frozen --no-dev

# ---- runtime --------------------------------------------------------------
FROM python:3.12-slim-bookworm AS app
WORKDIR /app

COPY --from=build /app /app
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000
# Migrations run at boot: single instance, small DB — a release phase can
# replace this when the platform supports one (see docs/deploy.md).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
