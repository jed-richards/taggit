# taggit

A personal collection-tracking app: photograph physical items, organize them
into collections, and tag them so you can filter a collection at the point of
purchase — "is this Snoopy mug already owned?"

Built for one very important user (my fiancée's mom), designed to be installable
on a phone as a PWA.

## Architecture

One monolith, one deployment:

| Layer | Technology |
|---|---|
| Frontend | React (TypeScript) + Vite + Tailwind CSS v4 + TanStack Query |
| Backend | FastAPI (Python) + SQLAlchemy 2.0 + Alembic |
| Database | PostgreSQL |
| Image storage | Cloudflare R2 (presigned direct-from-client uploads) |
| Auth | Supabase Auth (Google OAuth) — identity only; the API verifies JWTs itself |

Full design: [docs/taggit-lld.md](docs/taggit-lld.md) ·
Build plan: [docs/roadmap.md](docs/roadmap.md)

## Repository layout

```
taggit/
├── frontend/   # Vite + React app
├── backend/    # FastAPI service (serves the built frontend in production)
└── docs/       # design doc, diagrams, roadmap, setup guides
```

## Dev setup

### Backend

Requires [uv](https://docs.astral.sh/uv/) and a local PostgreSQL
(`docker compose up -d db`, or any Postgres 16 with a `taggit` database).

Image uploads need R2 credentials (see [docs/r2-setup.md](docs/r2-setup.md)) — or,
for local dev without a real Cloudflare account, run the bundled MinIO
stand-in instead: `docker compose up -d minio minio-init`, then set the
`R2_*` vars in `backend/.env` to the MinIO block commented in
`backend/.env.example`. Production keeps using real R2.

```sh
cd backend
cp .env.example .env      # adjust DATABASE_URL if needed
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Tests and lint:

```sh
uv run pytest
uv run ruff check .
```

### Frontend

Requires Node 22+ and pnpm.

```sh
cd frontend
cp .env.example .env      # Supabase URL + anon key
pnpm install
pnpm dev                  # proxies /api to http://localhost:8000
```

Tests and lint:

```sh
pnpm test
pnpm lint
pnpm exec tsc --noEmit
```

## One-time service setup

- Supabase project + Google OAuth: [docs/auth-setup.md](docs/auth-setup.md)
- Cloudflare R2 bucket + CORS: [docs/r2-setup.md](docs/r2-setup.md)
