import { defineConfig, devices } from "@playwright/test";

/**
 * Full-stack E2E: real backend (uvicorn + Postgres), real frontend (vite dev
 * proxying /api), and a local S3-shaped stub standing in for R2. Auth is
 * faked with an HS256 test secret shared between the seeded browser session
 * and the backend's verifier — no real Supabase/Google involved.
 */

const E2E_DB =
  process.env.E2E_DATABASE_URL ??
  "postgresql+psycopg://postgres:postgres@localhost:5432/taggit_e2e";
export const E2E_JWT_SECRET = "e2e-test-secret";

const backendEnv = [
  `DATABASE_URL=${E2E_DB}`,
  `SUPABASE_JWT_SECRET=${E2E_JWT_SECRET}`,
  "R2_ACCOUNT_ID=e2e",
  "R2_ACCESS_KEY_ID=e2e",
  "R2_SECRET_ACCESS_KEY=e2e",
  "R2_BUCKET=taggit-images",
  "R2_ENDPOINT_URL=http://localhost:9999",
  "R2_PUBLIC_BASE_URL=http://localhost:9999/taggit-images",
].join(" ");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  // Phone-shaped Chromium — the primary form factor. A preinstalled Chromium
  // can be pointed at via PW_CHROMIUM_PATH when the bundled revision isn't
  // downloaded (e.g. sandboxed CI/dev containers).
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 5"],
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: [
    {
      command: "cd ../backend && uv run uvicorn upload_stub:app --port 9999 --app-dir ../e2e",
      url: "http://localhost:9999/docs",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `cd ../backend && env ${backendEnv} uv run alembic upgrade head && env ${backendEnv} uv run uvicorn app.main:app --port 8000`,
      url: "http://localhost:8000/healthz",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command:
        "env VITE_SUPABASE_URL=https://e2e.supabase.co VITE_SUPABASE_ANON_KEY=e2e-anon pnpm dev --port 5173 --strictPort",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
