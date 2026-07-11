import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDeleteItem, useItems } from "../api/hooks";
import type { Item } from "../api/types";
import PhotoCell from "../components/PhotoCell";
import TagPill from "../components/TagPill";
import { BackArrow, Trash } from "../components/icons";

function related(item: Item, all: Item[]): Item[] {
  const mine = new Set(item.tags.map((t) => t.name));
  return all
    .filter((other) => other.id !== item.id)
    .map((other) => ({
      other,
      shared: other.tags.filter((t) => mine.has(t.name)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .map(({ other }) => other)
    .slice(0, 10);
}

export default function ItemDetail() {
  const { id, itemId } = useParams();
  const collectionId = Number(id);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  // The v1 API has no single-item endpoint — resolve from the collection's
  // items (cached by the detail screen in the common path).
  const { data: items, isPending, isError } = useItems(collectionId, {});
  const item = items?.find((i) => i.id === Number(itemId));
  const deleteItem = useDeleteItem(collectionId);

  if (isPending) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <p className="text-[14px]" style={{ color: "var(--fg-subtle)" }}>
          Loading…
        </p>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3"
        style={{ background: "var(--bg)" }}
      >
        <p className="text-[15px]" style={{ color: "var(--fg-muted)" }}>
          This item doesn’t exist (anymore).
        </p>
        <Link
          to={`/collections/${collectionId}`}
          className="text-[14px] font-medium"
          style={{ color: "var(--accent)" }}
        >
          Back to the collection
        </Link>
      </div>
    );
  }

  const relatedItems = related(item, items ?? []);
  const addedDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : "";

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <div className="mx-auto w-full max-w-2xl">
        {/* Photo hero */}
        <div
          className="relative w-full"
          style={{ aspectRatio: "1 / 1", background: "var(--tile-fallback)" }}
        >
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-20 w-20 rounded-full" style={{ background: "var(--fg-subtle)" }} />
            </div>
          )}
          <div className="absolute inset-x-4 top-4 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.8)", color: "#1A1917" }}
            >
              <BackArrow size={16} />
            </button>
            <button
              onClick={() => setConfirming(true)}
              aria-label="Delete item"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.8)", color: "#C63E3E" }}
            >
              <Trash size={16} />
            </button>
          </div>
        </div>

        {/* Content sheet */}
        <div
          className="relative z-10 -mt-4 rounded-t-[18px] px-5 pb-10 pt-5"
          style={{ background: "var(--bg)" }}
        >
          <h1
            className="text-[22px] font-semibold tracking-[-0.4px]"
            style={{ color: "var(--fg)" }}
          >
            {item.name}
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: "var(--fg-muted)" }}>
            {item.added_by ? `Added by ${item.added_by} · ` : "Added "}
            {addedDate}
          </p>

          {item.notes && (
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--fg)" }}>
              {item.notes}
            </p>
          )}

          {item.tags.length > 0 && (
            <div className="mt-5">
              <div
                className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <TagPill
                    key={tag.id}
                    label={tag.name}
                    onClick={() =>
                      navigate(`/collections/${collectionId}?tags=${encodeURIComponent(tag.name)}`)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {relatedItems.length > 0 && (
            <div className="mt-7">
              <div
                className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Related items
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {relatedItems.map((rel) => (
                  <div key={rel.id} className="w-24 flex-shrink-0">
                    <PhotoCell
                      imageUrl={rel.image_url}
                      name={rel.name}
                      onClick={() => navigate(`/collections/${collectionId}/items/${rel.id}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirming && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-6">
          <button
            aria-label="Close"
            className="absolute inset-0 border-none"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setConfirming(false)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-[16px] p-5"
            style={{ background: "var(--surface)" }}
          >
            <p className="text-[16px] font-semibold" style={{ color: "var(--fg)" }}>
              Delete “{item.name}”?
            </p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--fg-muted)" }}>
              This can’t be undone.
            </p>
            {deleteItem.isError && (
              <p className="mt-2 text-[13px]" style={{ color: "var(--danger)" }}>
                Couldn’t delete — try again.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="cursor-pointer rounded-full border-none bg-transparent px-4 py-2 text-[15px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteItem.mutate(item.id, {
                    onSuccess: () => navigate(`/collections/${collectionId}`),
                  })
                }
                disabled={deleteItem.isPending}
                className="cursor-pointer rounded-full border-none px-5 py-2 text-[15px] font-semibold disabled:opacity-50"
                style={{ background: "var(--danger)", color: "#fff" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
