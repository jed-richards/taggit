# Auth setup — Supabase + Google OAuth (one-time)

Taggit uses **Supabase Auth for identity only**: the React app obtains a
session via Google sign-in, and the FastAPI backend independently verifies the
Supabase JWT on every request (`backend/app/auth.py`). The app database is our
own Postgres — Supabase's database is not used.

## 1. Google Cloud: create an OAuth client

1. Go to <https://console.cloud.google.com/> → create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: External, app name "Taggit",
   add your email as a test user (or publish the app once ready).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
     (shown verbatim in the Supabase dashboard step below)
4. Note the **Client ID** and **Client secret**.

## 2. Supabase: enable the Google provider

1. In the [Supabase dashboard](https://supabase.com/dashboard), open the
   project (or create one — the free tier is fine; only Auth is used).
2. **Authentication → Sign In / Providers → Google**: enable, paste the Google
   Client ID and secret. The dashboard shows the exact callback URL to put in
   Google Cloud (step 1.3).
3. **Authentication → URL Configuration**:
   - Site URL: the production URL (e.g. `https://taggit.example.com`)
   - Additional redirect URLs: `http://localhost:5173/**` for local dev, plus
     the production URL pattern `https://taggit.example.com/**`

## 3. Environment variables

Frontend (`frontend/.env`, from `frontend/.env.example`):

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Project Settings → Data API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API Keys → `anon` / publishable key |

The anon key is public by design; it only lets the browser talk to Supabase
Auth. Real API security is the backend's JWT verification.

Backend (`backend/.env`, from `backend/.env.example`):

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Same Project URL as above — used to fetch the JWKS for RS256/ES256 verification |
| `SUPABASE_JWT_SECRET` | Project Settings → API → JWT Secret — only needed for legacy HS256 projects; leave empty if the project uses asymmetric signing keys |

## 4. Verify

1. `cd backend && uv run uvicorn app.main:app` and `cd frontend && pnpm dev`
2. Open <http://localhost:5173> → you land on `/login`
3. "Continue with Google" → Google account chooser → back at `/collections`
4. Reload: still signed in. `curl` the API without a token: `401`.

When the production domain exists (deploy issue), add it to both the Google
consent screen's authorized domains and Supabase's redirect URLs.
