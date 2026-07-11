import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { useCollections, useCreateItem, useCreateTag } from "./hooks";

vi.mock("../lib/authFetch", () => ({
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | undefined) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const resp = handler(url, init as RequestInit);
    if (!resp) throw new Error(`unmocked fetch: ${url}`);
    return resp;
  });
}

afterEach(() => vi.restoreAllMocks());

test("useCollections fetches and returns typed data", async () => {
  mockFetch((url) =>
    url === "/api/collections"
      ? Response.json([
          {
            id: 1,
            name: "Mugs",
            description: "",
            item_count: 3,
            updated_at: "2026-01-01T00:00:00Z",
            recent_image_urls: [],
            role: "owner",
          },
        ])
      : undefined,
  );
  const { wrapper } = makeWrapper();
  const { result } = renderHook(() => useCollections(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.[0].name).toBe("Mugs");
});

test("creating an item invalidates items, tags, and collections keys", async () => {
  mockFetch((url, init) =>
    url === "/api/collections/1/items" && init?.method === "POST"
      ? Response.json(
          {
            id: 9,
            name: "New mug",
            notes: "",
            image_url: null,
            created_at: "",
            updated_at: "",
            added_by: "MK",
            tags: [],
          },
          { status: 201 },
        )
      : undefined,
  );
  const { queryClient, wrapper } = makeWrapper();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  const { result } = renderHook(() => useCreateItem(1), { wrapper });
  result.current.mutate({ name: "New mug", tag_ids: [] });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  const keys = invalidate.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
  expect(keys).toContain(JSON.stringify(["collections", 1, "items"]));
  expect(keys).toContain(JSON.stringify(["collections", 1, "tags"]));
  expect(keys).toContain(JSON.stringify(["collections"]));
});

test("useCreateTag treats a 409 as success with the existing tag", async () => {
  mockFetch((url, init) =>
    url === "/api/collections/1/tags" && init?.method === "POST"
      ? Response.json(
          { detail: { message: "tag already exists", tag: { id: 42, name: "red" } } },
          { status: 409 },
        )
      : undefined,
  );
  const { wrapper } = makeWrapper();
  const { result } = renderHook(() => useCreateTag(1), { wrapper });
  result.current.mutate({ name: "RED " });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ id: 42, name: "red", count: 0 });
});
