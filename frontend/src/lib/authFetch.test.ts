import { vi } from "vitest";
import { authFetch } from "./authFetch";

const mocks = vi.hoisted(() => ({ token: null as string | null }));

vi.mock("./supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: mocks.token ? { access_token: mocks.token } : null },
        }),
    },
  },
}));

test("attaches the bearer token when a session exists", async () => {
  mocks.token = "my-jwt";
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
  await authFetch("/api/collections");
  const headers = new Headers(fetchSpy.mock.calls[0][1]?.headers);
  expect(headers.get("Authorization")).toBe("Bearer my-jwt");
  fetchSpy.mockRestore();
});

test("sends no Authorization header without a session", async () => {
  mocks.token = null;
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
  await authFetch("/api/collections");
  const headers = new Headers(fetchSpy.mock.calls[0][1]?.headers);
  expect(headers.get("Authorization")).toBeNull();
  fetchSpy.mockRestore();
});
