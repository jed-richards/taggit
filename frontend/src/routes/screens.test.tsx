import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { vi } from "vitest";
import type { Collection, Item, Tag } from "../api/types";
import { ApiError } from "../api/client";
import AddItem from "./AddItem";
import CollectionDetail from "./CollectionDetail";
import Collections from "./Collections";
import ItemDetail from "./ItemDetail";
import TagManagement from "./TagManagement";

const mocks = vi.hoisted(() => ({
  collections: [] as unknown[],
  items: [] as unknown[],
  tags: [] as unknown[],
  createCollection: vi.fn(),
  createItem: vi.fn(),
  deleteItem: vi.fn(),
  createTag: vi.fn(),
  renameTag: vi.fn(),
  deleteTag: vi.fn(),
  uploadUrl: vi.fn(),
}));

vi.mock("../api/hooks", () => ({
  useCollections: () => ({
    data: mocks.collections,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useItems: () => ({
    data: mocks.items,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    isPlaceholderData: false,
  }),
  useTags: () => ({ data: mocks.tags, isPending: false }),
  useCreateCollection: () => ({ mutate: mocks.createCollection, isPending: false, isError: false }),
  useCreateItem: () => ({ mutate: mocks.createItem, isPending: false, isError: false }),
  useDeleteItem: () => ({ mutate: mocks.deleteItem, isPending: false, isError: false }),
  useCreateTag: () => ({ mutate: mocks.createTag, isPending: false }),
  useRenameTag: () => ({ mutate: mocks.renameTag, isPending: false }),
  useDeleteTag: () => ({ mutate: mocks.deleteTag, isPending: false }),
  useUploadUrl: () => ({ mutateAsync: mocks.uploadUrl }),
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "mk@example.com", name: "Mary K", avatarUrl: null },
    loading: false,
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}));

function coll(over: Partial<Collection> = {}): Collection {
  return {
    id: 1,
    name: "Snoopy Mugs",
    description: "",
    item_count: 3,
    updated_at: new Date().toISOString(),
    recent_image_urls: [],
    role: "owner",
    ...over,
  };
}

function item(over: Partial<Item> = {}): Item {
  return {
    id: 1,
    name: "Joe Cool",
    notes: "",
    image_url: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    added_by: "MK",
    tags: [],
    ...over,
  };
}

function tag(over: Partial<Tag> = {}): Tag {
  return { id: 1, name: "red", count: 2, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.collections = [];
  mocks.items = [];
  mocks.tags = [];
});

describe("Collections screen", () => {
  test("renders cards and the counts line", () => {
    mocks.collections = [coll(), coll({ id: 2, name: "Birds", item_count: 5 })];
    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    );
    expect(screen.getByText("Snoopy Mugs")).toBeInTheDocument();
    expect(screen.getByText("Birds")).toBeInTheDocument();
    expect(screen.getByText(/2 collections · 8 items/)).toBeInTheDocument();
  });

  test("empty state offers creating the first collection", () => {
    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    );
    expect(screen.getByText("No collections yet")).toBeInTheDocument();
    expect(screen.getByText("Create your first collection")).toBeInTheDocument();
  });

  test("create sheet calls the mutation with the name", async () => {
    render(
      <MemoryRouter>
        <Collections />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByLabelText("New collection"));
    await userEvent.type(screen.getByPlaceholderText(/Name — e.g./), "Stamps");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(mocks.createCollection).toHaveBeenCalledWith(
      { name: "Stamps", description: "" },
      expect.anything(),
    );
  });
});

describe("CollectionDetail screen", () => {
  function renderDetail(initial = "/collections/1") {
    return render(
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/collections/:id" element={<CollectionDetail />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  test("toggling pills activates filters and shows the AND/OR toggle at two", async () => {
    mocks.collections = [coll()];
    mocks.tags = [tag(), tag({ id: 2, name: "christmas", count: 1 })];
    mocks.items = [item()];
    renderDetail();

    expect(screen.queryByText("All tags")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "red2" }));
    expect(screen.getByText("Clear")).toBeInTheDocument();
    expect(screen.getByText(/1 filter$/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "christmas1" }));
    expect(screen.getByText("All tags")).toBeInTheDocument();
    expect(screen.getByText("Any tag")).toBeInTheDocument();
    expect(screen.getByText(/2 filters/)).toBeInTheDocument();

    await userEvent.click(screen.getByText("Clear"));
    expect(screen.getByText(/3 items/)).toBeInTheDocument();
  });

  test("filters initialize from the URL", () => {
    mocks.collections = [coll()];
    mocks.tags = [tag()];
    mocks.items = [item()];
    renderDetail("/collections/1?tags=red");
    expect(screen.getByText(/1 filter$/)).toBeInTheDocument();
  });

  test("empty filter result offers clearing", () => {
    mocks.collections = [coll()];
    mocks.tags = [tag()];
    mocks.items = [];
    renderDetail("/collections/1?tags=red");
    expect(screen.getByText("Nothing matches these tags")).toBeInTheDocument();
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });
});

describe("AddItem screen", () => {
  function renderAdd() {
    return render(
      <MemoryRouter initialEntries={["/collections/1/add"]}>
        <Routes>
          <Route path="/collections/:id/add" element={<AddItem />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  test("save is disabled until a name is entered, then submits the payload", async () => {
    mocks.tags = [tag()];
    renderAdd();
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("Name"), "New Mug");
    expect(save).toBeEnabled();

    await userEvent.click(save);
    expect(mocks.createItem).toHaveBeenCalledWith(
      { name: "New Mug", notes: "", image_url: null, tag_ids: [] },
      expect.anything(),
    );
  });

  test("suggestions filter and create-row appears for unknown input", async () => {
    mocks.tags = [tag(), tag({ id: 2, name: "christmas", count: 1 })];
    renderAdd();
    const input = screen.getByPlaceholderText("Type to add tags…");

    await userEvent.type(input, "chr");
    expect(screen.getByRole("button", { name: /christmas/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^red/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Create “chr”/)).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, "red");
    // exact match — no create row
    expect(screen.queryByText(/Create “red”/)).not.toBeInTheDocument();
  });

  test("upload failure blocks saving and offers retry", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
    mocks.uploadUrl.mockRejectedValue(new Error("network"));
    renderAdd();

    await userEvent.type(screen.getByPlaceholderText("Name"), "New Mug");
    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("Add photo"), file);

    expect(await screen.findByText(/Upload failed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    vi.unstubAllGlobals();
  });
});

describe("ItemDetail screen", () => {
  function renderItem(itemId = 1) {
    return render(
      <MemoryRouter initialEntries={[`/collections/1/items/${itemId}`]}>
        <Routes>
          <Route path="/collections/:id/items/:itemId" element={<ItemDetail />} />
          <Route path="/collections/:id" element={<FilterEcho />} />
        </Routes>
      </MemoryRouter>,
    );
  }
  function FilterEcho() {
    const location = useLocation();
    return <div>ECHO {location.search}</div>;
  }

  test("renders fields and related items ranked by shared tags", () => {
    mocks.items = [
      item({
        id: 1,
        name: "Joe Cool",
        notes: "Thrifted $4.",
        tags: [
          { id: 1, name: "red" },
          { id: 2, name: "christmas" },
        ],
      }),
      item({ id: 2, name: "Related Red", tags: [{ id: 1, name: "red" }] }),
      item({ id: 3, name: "Unrelated", tags: [{ id: 9, name: "blue" }] }),
    ];
    renderItem();
    expect(screen.getByRole("heading", { name: "Joe Cool" })).toBeInTheDocument();
    expect(screen.getByText("Thrifted $4.")).toBeInTheDocument();
    expect(screen.getByText(/Added by MK/)).toBeInTheDocument();
    const related = screen.getByText("Related items").parentElement!;
    expect(within(related).getByText("Related Red")).toBeInTheDocument();
    expect(within(related).queryByText("Unrelated")).not.toBeInTheDocument();
  });

  test("tapping a tag navigates to the filtered collection", async () => {
    mocks.items = [item({ id: 1, tags: [{ id: 1, name: "red" }] })];
    renderItem();
    await userEvent.click(screen.getByRole("button", { name: "red" }));
    expect(screen.getByText(/ECHO \?tags=red/)).toBeInTheDocument();
  });

  test("delete asks for confirmation then mutates", async () => {
    mocks.items = [item({ id: 1, name: "Joe Cool" })];
    renderItem();
    await userEvent.click(screen.getByLabelText("Delete item"));
    expect(screen.getByText(/Delete “Joe Cool”\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(mocks.deleteItem).toHaveBeenCalledWith(1, expect.anything());
  });

  test("unknown item shows the not-found state", () => {
    mocks.items = [];
    renderItem(999);
    expect(screen.getByText(/doesn’t exist/)).toBeInTheDocument();
    expect(screen.getByText("Back to the collection")).toBeInTheDocument();
  });
});

describe("TagManagement screen", () => {
  function renderTags() {
    return render(
      <MemoryRouter initialEntries={["/collections/1/tags"]}>
        <Routes>
          <Route path="/collections/:id/tags" element={<TagManagement />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  test("lists tags with usage counts", () => {
    mocks.collections = [coll()];
    mocks.tags = [tag(), tag({ id: 2, name: "christmas", count: 1 })];
    renderTags();
    expect(screen.getByText("red")).toBeInTheDocument();
    expect(screen.getByText("Used on 2 items")).toBeInTheDocument();
    expect(screen.getByText("Used on 1 item")).toBeInTheDocument();
    expect(screen.getByText(/2 tags in Snoopy Mugs/)).toBeInTheDocument();
  });

  test("rename conflict shows the 409 message", async () => {
    mocks.tags = [tag()];
    mocks.renameTag.mockImplementation((_vars, opts) => {
      opts.onError(new ApiError(409, { message: "taken" }));
    });
    renderTags();
    await userEvent.click(screen.getByText("red"));
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.getByText(/already exists/)).toBeInTheDocument();
  });

  test("delete confirm states the blast radius and mutates", async () => {
    mocks.tags = [tag({ count: 5 })];
    renderTags();
    await userEvent.click(screen.getByText("red"));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(
      screen.getByText(/Remove “red” from 5 items\? The items themselves are kept./),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete tag" }));
    expect(mocks.deleteTag).toHaveBeenCalledWith(1, expect.anything());
  });
});
