import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "./App";

const mocks = vi.hoisted(() => ({
  session: null as Session | null,
}));

vi.mock("./lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: mocks.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

function fakeSession(): Session {
  return {
    access_token: "fake",
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "mk@example.com",
      user_metadata: { full_name: "Mary K" },
    },
  } as unknown as Session;
}

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.session = null;
});

test("unauthenticated visit to an app route lands on the login screen", async () => {
  renderAt("/collections");
  expect(await screen.findByText(/Continue with Google/)).toBeInTheDocument();
});

test("root redirects signed-in users to the collections screen", async () => {
  mocks.session = fakeSession();
  renderAt("/");
  expect(await screen.findByText(/Collections — coming soon/)).toBeInTheDocument();
});

test("signed-in visit to /login bounces to collections", async () => {
  mocks.session = fakeSession();
  renderAt("/login");
  expect(await screen.findByText(/Collections — coming soon/)).toBeInTheDocument();
});

test("collection detail route renders when signed in", async () => {
  mocks.session = fakeSession();
  renderAt("/collections/1");
  expect(await screen.findByText(/CollectionDetail — coming soon/)).toBeInTheDocument();
});
