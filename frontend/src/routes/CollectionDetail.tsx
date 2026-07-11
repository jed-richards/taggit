import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCollections, useItems, useTags } from "../api/hooks";
import FAB from "../components/FAB";
import PhotoCell from "../components/PhotoCell";
import TagPill from "../components/TagPill";
import { BackArrow, Dots, X } from "../components/icons";

const PAGE_SIZE = 50;

export default function CollectionDetail() {
  const { id } = useParams();
  const collectionId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pages, setPages] = useState(1);

  // Filter state lives in the URL so item-detail tag taps and back
  // navigation restore it.
  const activeTags = useMemo(
    () => (searchParams.get("tags") ?? "").split(",").filter(Boolean),
    [searchParams],
  );
  const match = searchParams.get("match") === "any" ? ("any" as const) : ("all" as const);

  const { data: collections } = useCollections();
  const collection = collections?.find((c) => c.id === collectionId);

  const { data: allTags } = useTags(collectionId);
  const {
    data: items,
    isPending,
    isError,
    refetch,
    isPlaceholderData,
  } = useItems(collectionId, {
    tags: activeTags,
    match,
    limit: PAGE_SIZE * pages,
  });

  const setFilters = (tags: string[], nextMatch: "all" | "any") => {
    const params = new URLSearchParams();
    if (tags.length) params.set("tags", tags.join(","));
    if (nextMatch === "any" && tags.length >= 2) params.set("match", "any");
    setSearchParams(params, { replace: true });
    setPages(1);
  };

  const toggleTag = (name: string) => {
    const next = activeTags.includes(name)
      ? activeTags.filter((t) => t !== name)
      : [...activeTags, name];
    setFilters(next, match);
  };

  const totalCount = collection?.item_count ?? null;
  const mayHaveMore = (items?.length ?? 0) === PAGE_SIZE * pages;

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Header */}
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <button
            onClick={() => navigate("/collections")}
            aria-label="Back"
            className="-ml-2 cursor-pointer rounded-full border-none bg-transparent p-2"
            style={{ color: "var(--fg)" }}
          >
            <BackArrow />
          </button>
          <span
            className="flex-1 truncate text-[17px] font-semibold tracking-[-0.2px]"
            style={{ color: "var(--fg)" }}
          >
            {collection?.name ?? ""}
          </span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More"
              className="cursor-pointer rounded-full border-none bg-transparent p-2"
              style={{ color: "var(--fg)" }}
            >
              <Dots />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 z-20 mt-1 w-44 rounded-[12px] py-1"
                style={{
                  background: "var(--surface)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px var(--border-soft)",
                }}
              >
                <button
                  onClick={() => navigate(`/collections/${collectionId}/tags`)}
                  className="w-full cursor-pointer border-none bg-transparent px-4 py-[10px] text-left text-[14px]"
                  style={{ color: "var(--fg)" }}
                >
                  Manage tags
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Count line */}
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <div className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
            {activeTags.length === 0 ? (
              totalCount != null ? (
                `${totalCount} item${totalCount === 1 ? "" : "s"}`
              ) : (
                " "
              )
            ) : (
              <span>
                <b style={{ color: "var(--fg)" }}>{items?.length ?? "…"}</b>
                {totalCount != null ? ` of ${totalCount}` : ""} ·{" "}
                <span style={{ color: "var(--accent)" }}>
                  {activeTags.length} filter{activeTags.length > 1 ? "s" : ""}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Sticky tag filter row */}
        <div
          className="sticky top-0 z-10 border-b py-[10px]"
          style={{ background: "var(--bg)", borderColor: "var(--border-soft)" }}
        >
          <div className="flex gap-[6px] overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
            {activeTags.length > 0 && (
              <button
                onClick={() => setFilters([], "all")}
                className="flex h-7 flex-shrink-0 cursor-pointer items-center gap-1 rounded-[14px] border-none px-[10px] text-[12px] font-medium"
                style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}
              >
                <X size={10} /> Clear
              </button>
            )}
            {allTags?.map((t) => (
              <div key={t.id} className="flex-shrink-0">
                <TagPill
                  label={t.name}
                  count={t.count}
                  active={activeTags.includes(t.name)}
                  onClick={() => toggleTag(t.name)}
                  size="sm"
                />
              </div>
            ))}
            <button
              onClick={() => navigate(`/collections/${collectionId}/tags`)}
              className="flex h-7 flex-shrink-0 cursor-pointer items-center rounded-full bg-transparent px-3 text-[12px] font-medium"
              style={{ color: "var(--fg-muted)", border: "1.5px dashed var(--border)" }}
            >
              Manage tags
            </button>
          </div>

          {activeTags.length >= 2 && (
            <div className="mt-[8px] flex justify-center px-4">
              <div
                className="flex overflow-hidden rounded-full border text-[12px]"
                style={{ borderColor: "var(--border)" }}
              >
                {(["all", "any"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilters(activeTags, m)}
                    className="cursor-pointer border-none px-4 py-1 font-[inherit] text-[12px]"
                    style={{
                      background: match === m ? "var(--accent)" : "var(--surface-2)",
                      color: match === m ? "var(--accent-on)" : "var(--fg-muted)",
                    }}
                  >
                    {m === "all" ? "All tags" : "Any tag"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 px-4 pb-28 pt-4" style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
          {isPending && (
            <p className="mt-8 text-center text-[14px]" style={{ color: "var(--fg-subtle)" }}>
              Loading…
            </p>
          )}
          {isError && (
            <div className="mt-8 text-center">
              <p className="text-[14px]" style={{ color: "var(--fg-muted)" }}>
                Couldn’t load items.
              </p>
              <button
                onClick={() => void refetch()}
                className="mt-2 cursor-pointer rounded-full border px-4 py-2 text-[14px]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--fg)",
                  background: "transparent",
                }}
              >
                Retry
              </button>
            </div>
          )}
          {items?.length === 0 && activeTags.length === 0 && (
            <div className="mt-16 text-center">
              <p className="text-[15px] font-medium" style={{ color: "var(--fg)" }}>
                Nothing here yet
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "var(--fg-muted)" }}>
                Add your first item with the camera button.
              </p>
            </div>
          )}
          {items?.length === 0 && activeTags.length > 0 && (
            <div className="mt-16 text-center">
              <p className="text-[15px] font-medium" style={{ color: "var(--fg)" }}>
                Nothing matches these tags
              </p>
              <button
                onClick={() => setFilters([], "all")}
                className="mt-3 cursor-pointer rounded-full border px-4 py-2 text-[13px]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--fg)",
                  background: "transparent",
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items?.map((item) => (
              <PhotoCell
                key={item.id}
                imageUrl={item.image_url}
                name={item.name}
                onClick={() => navigate(`/collections/${collectionId}/items/${item.id}`)}
              />
            ))}
          </div>
          {mayHaveMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setPages((p) => p + 1)}
                className="cursor-pointer rounded-full border px-5 py-2 text-[13px]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--fg)",
                  background: "transparent",
                }}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>

      <FAB
        icon="camera"
        label="Add item"
        onClick={() => navigate(`/collections/${collectionId}/add`)}
      />
    </div>
  );
}
