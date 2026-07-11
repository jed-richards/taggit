# Deployment

Taggit ships as a **single container**: FastAPI serves both the API (under
`/api`) and the built React app (SPA fallback for client routes). One origin,
no CORS, one thing to run. Postgres is the only external dependency besides
the managed services (Supabase Auth, Cloudflare R2).

## Architecture

```
browser ── https ──> app container (uvicorn)
                       ├── /api/*   FastAPI routers
                       ├── /*       static frontend (STATIC_DIR) + SPA fallback
                       └── Postgres (DATABASE_URL)
photos:  browser ──presigned PUT──> Cloudflare R2   (never through the app)
auth:    browser ──OAuth──> Supabase; app verifies the JWT itself
```

Migrations run on container boot (`alembic upgrade head`) — fine for a
single-instance personal app; move to a release phase if instances ever scale.

## Hosting recommendation

**Fly.io** (implemented here via `fly.toml` + the deploy workflow):
scale-to-zero machines, managed Postgres, ~free at this traffic level.
Alternatives considered: **Railway** (simplest dashboard-driven DX, slightly
pricier idle) and a **VPS + compose** (cheapest long-run, most hands-on —
`docker-compose.prod.yml` works as-is there). Any of the three runs the same
container; switching later is cheap.

## One-time Fly.io setup

1. `brew install flyctl` (or the installer), `fly auth signup`
2. From the repo root: `fly launch --no-deploy` — accept the existing
   `fly.toml`, pick a unique app name (update `app = "…"` if "taggit" is
   taken) and region
3. Postgres: `fly postgres create` (dev single-node is fine) then
   `fly postgres attach <pg-app-name>` — this sets `DATABASE_URL` on the app.
   Note: Fly's `DATABASE_URL` is `postgres://…`; set the SQLAlchemy form
   explicitly: `fly secrets set DATABASE_URL="postgresql+psycopg://<same creds>"`
4. Secrets (values from [auth-setup](auth-setup.md) / [r2-setup](r2-setup.md)):

   ```sh
   fly secrets set \
     SUPABASE_URL=… SUPABASE_JWT_SECRET=… \
     R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… \
     R2_BUCKET=taggit-images R2_PUBLIC_BASE_URL=…
   ```

5. First deploy: `fly deploy`
6. Point Supabase's Site URL / redirect URLs and the R2 CORS policy at the
   production URL (`https://<app>.fly.dev` or your custom domain via
   `fly certs add`)
7. Auto-deploys: `fly tokens create deploy` → save as the `FLY_API_TOKEN`
   repository secret. Every push to `main` then deploys via
   `.github/workflows/deploy.yml` (the job no-ops until the secret exists).
8. Turn on daily Postgres snapshots (on by default for Fly Postgres — verify
   with `fly postgres backup list`).

## Manual operations

| Task | Command |
|---|---|
| Deploy by hand | `fly deploy` |
| Logs | `fly logs` |
| Roll back | `fly releases` → `fly deploy --image <previous image ref>` |
| Migrations by hand | `fly ssh console -C "alembic upgrade head"` |
| psql into prod | `fly postgres connect -a <pg-app-name>` |

## Prod-like local run

```sh
cp backend/.env.example backend/.env   # fill Supabase + R2 values
docker compose -f docker-compose.prod.yml up --build
# whole app on http://localhost:8000
```
