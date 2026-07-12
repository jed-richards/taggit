# Deployment

Taggit runs as two containers: an nginx frontend (serves the built React app
and reverse-proxies `/api/*` to the backend, so the browser only ever sees
one origin — no CORS) and a FastAPI backend. Postgres is the only external
dependency besides the managed services (Supabase Auth, Cloudflare R2).

## Architecture

```
browser ── https ──> frontend container (nginx)
                       ├── /*       static frontend build
                       └── /api/*   proxied to the backend container
                                     └── Postgres (DATABASE_URL)
photos:  browser ──presigned PUT──> Cloudflare R2   (never through the app)
auth:    browser ──OAuth──> Supabase; app verifies the JWT itself
```

Migrations run on backend container boot (`alembic upgrade head`) — fine for
a single-instance personal app.

## Hosting: self-hosted (mini PC + Tailscale)

Runs on a machine you own — a home server, mini PC, old laptop — reachable
only over your private [Tailscale](https://tailscale.com/) network. No cloud
hosting bill.

1. Install Tailscale **on the host machine itself** (not in Docker) and join
   it to your tailnet. Note the MagicDNS name it's assigned
   (`https://login.tailscale.com/admin/machines`).
2. Fill `backend/.env.prod` with real Supabase + R2 values (see
   [auth-setup](auth-setup.md) / [r2-setup](r2-setup.md)) — copy the shape of
   `backend/.env.example`. This file is gitignored; it never leaves the
   machine you put it on.
3. Update your R2 bucket's CORS policy (`docs/r2-setup.md`) to allow the
   origin the frontend will actually be served from — your Tailscale
   MagicDNS name on port 8080 (e.g. `http://my-mini-pc.tailXXXX.ts.net:8080`),
   not just `localhost:5173`.
4. From the repo root on the host machine:
   ```sh
   docker compose -f docker-compose.selfhost.yml up -d --build
   ```
5. From any device on your tailnet: `http://<tailscale-magicdns-name>:8080`.
6. Auto-start on boot: enable Docker's restart policy or a systemd unit
   running the compose command above, so the stack survives a host reboot.

## Manual operations

| Task | Command |
|---|---|
| Redeploy after a code change | `docker compose -f docker-compose.selfhost.yml up -d --build` |
| Logs | `docker compose -f docker-compose.selfhost.yml logs -f backend` |
| Migrations by hand | `docker compose -f docker-compose.selfhost.yml exec backend alembic upgrade head` |
| psql into the db | `docker compose -f docker-compose.selfhost.yml exec db psql -U postgres -d taggit` |
| Stop everything | `docker compose -f docker-compose.selfhost.yml down` |

## Local dev, full stack in containers

`docker-compose.yml` also has an opt-in `full` profile that runs the same
split frontend/backend containers locally against the local MinIO stand-in
(`backend/.env`, not `.env.prod`) — useful to sanity-check the containerized
build without touching real R2:

```sh
docker compose --profile full up -d --build
# frontend: http://localhost:8080
```

Plain `docker compose up -d` (no profile) still brings up just the dev
dependencies (`db`, `minio`, `minio-init`) for host-run `uv run uvicorn` /
`pnpm dev`, unchanged.
