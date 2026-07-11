# ---- frontend build ---------------------------------------------------------
FROM node:22-slim AS frontend
WORKDIR /fe
RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# ---- backend + static serving ----------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS app
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
COPY --from=frontend /fe/dist /app/static

ENV PATH="/app/.venv/bin:$PATH" \
    STATIC_DIR=/app/static

EXPOSE 8000
# Migrations run at boot: single instance, small DB — a release phase can
# replace this when the platform supports one (see docs/deploy.md).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
