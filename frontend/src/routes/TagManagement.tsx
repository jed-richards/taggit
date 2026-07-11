import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCollections, useCreateTag, useDeleteTag, useRenameTag, useTags } from "../api/hooks";
import type { Tag } from "../api/types";
import { ApiError } from "../api/client";

function TagActionSheet({
  tag,
  collectionId,
  onClose,
}: {
  tag: Tag;
  collectionId: number;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "rename" | "delete">("menu");
  const [newName, setNewName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const rename = useRenameTag(collectionId);
  const remove = useDeleteTag(collectionId);

  const doRename = () => {
    setError(null);
    rename.mutate(
      { tagId: tag.id, data: { name: newName } },
      {
        onSuccess: onClose,
        onError: (err) => {
          setError(
            err instanceof ApiError && err.status === 409
              ? "A tag with that name already exists."
              : "Couldn’t rename — try again.",
          );
        },
      },
    );
  };

  const doDelete = () => {
    setError(null);
    remove.mutate(tag.id, {
      onSuccess: onClose,
      onError: () => setError("Couldn’t delete — try again."),
    });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        className="absolute inset-0 border-none"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-[18px] px-5 pb-8 pt-5 sm:rounded-[18px]"
        style={{ background: "var(--surface)", animation: "slide-up 200ms ease-out" }}
      >
        <p className="text-[16px] font-semibold" style={{ color: "var(--fg)" }}>
          {tag.name}
        </p>
        <p className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
          Used on {tag.count} item{tag.count === 1 ? "" : "s"}
        </p>

        {mode === "menu" && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => setMode("rename")}
              className="cursor-pointer rounded-[10px] border px-4 py-3 text-left text-[15px]"
              style={{
                borderColor: "var(--border-soft)",
                color: "var(--fg)",
                background: "var(--surface-2)",
              }}
            >
              Rename
            </button>
            <button
              onClick={() => setMode("delete")}
              className="cursor-pointer rounded-[10px] border px-4 py-3 text-left text-[15px]"
              style={{
                borderColor: "var(--border-soft)",
                color: "var(--danger)",
                background: "var(--surface-2)",
              }}
            >
              Delete
            </button>
          </div>
        )}

        {mode === "rename" && (
          <div className="mt-4">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newName.trim() && doRename()}
              className="w-full rounded-[10px] border px-3 py-3 text-[16px] outline-none"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border-soft)",
                color: "var(--fg)",
              }}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="cursor-pointer rounded-full border-none bg-transparent px-4 py-2 text-[15px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={doRename}
                disabled={!newName.trim() || rename.isPending}
                className="cursor-pointer rounded-full border-none px-5 py-2 text-[15px] font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-on)" }}
              >
                Rename
              </button>
            </div>
          </div>
        )}

        {mode === "delete" && (
          <div className="mt-4">
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--fg)" }}>
              Remove “{tag.name}” from {tag.count} item{tag.count === 1 ? "" : "s"}? The items
              themselves are kept.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="cursor-pointer rounded-full border-none bg-transparent px-4 py-2 text-[15px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                disabled={remove.isPending}
                className="cursor-pointer rounded-full border-none px-5 py-2 text-[15px] font-semibold disabled:opacity-50"
                style={{ background: "var(--danger)", color: "#fff" }}
              >
                Delete tag
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-[13px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TagManagement() {
  const { id } = useParams();
  const collectionId = Number(id);
  const navigate = useNavigate();
  const { data: tags, isPending } = useTags(collectionId);
  const { data: collections } = useCollections();
  const collection = collections?.find((c) => c.id === collectionId);
  const createTag = useCreateTag(collectionId);
  const [actionTag, setActionTag] = useState<Tag | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const doCreate = () => {
    if (!newTagName.trim()) return;
    createTag.mutate(
      { name: newTagName },
      {
        onSuccess: () => {
          setNewTagName("");
          setAdding(false);
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--surface-2)" }}>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div
          className="flex items-center border-b px-4 py-3"
          style={{ background: "var(--bg)", borderColor: "var(--border-soft)" }}
        >
          <button
            onClick={() => navigate(`/collections/${collectionId}`)}
            className="cursor-pointer border-none bg-transparent font-[inherit] text-[15px]"
            style={{ color: "var(--accent)" }}
          >
            Done
          </button>
          <span
            className="flex-1 text-center text-[17px] font-semibold"
            style={{ color: "var(--fg)" }}
          >
            Tags
          </span>
          <button
            onClick={() => setAdding((v) => !v)}
            className="cursor-pointer border-none bg-transparent font-[inherit] text-[15px] font-semibold"
            style={{ color: "var(--accent)" }}
          >
            + New
          </button>
        </div>

        <p className="px-5 py-2 text-[13px]" style={{ color: "var(--fg-muted)" }}>
          {tags ? `${tags.length} tag${tags.length === 1 ? "" : "s"}` : "…"}
          {collection ? ` in ${collection.name}` : ""}
        </p>

        {adding && (
          <div className="mx-4 mb-2 flex gap-2">
            <input
              autoFocus
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doCreate()}
              placeholder="New tag name"
              className="flex-1 rounded-[10px] border px-3 py-2 text-[15px] outline-none"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-soft)",
                color: "var(--fg)",
              }}
            />
            <button
              onClick={doCreate}
              disabled={!newTagName.trim() || createTag.isPending}
              className="cursor-pointer rounded-[10px] border-none px-4 text-[14px] font-semibold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-on)" }}
            >
              Add
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isPending && (
            <p className="mt-8 text-center text-[14px]" style={{ color: "var(--fg-subtle)" }}>
              Loading…
            </p>
          )}
          {tags?.length === 0 && (
            <p
              className="mx-auto mt-12 max-w-[260px] text-center text-[13px]"
              style={{ color: "var(--fg-muted)" }}
            >
              No tags yet — tags are created when you add items, or with “+ New”.
            </p>
          )}
          {tags && tags.length > 0 && (
            <div
              className="mx-4 my-2 overflow-hidden rounded-[12px]"
              style={{ background: "var(--surface)", boxShadow: "0 0 0 1px var(--border-soft)" }}
            >
              {tags.map((tag, i) => (
                <button
                  key={tag.id}
                  onClick={() => setActionTag(tag)}
                  className={`w-full cursor-pointer border-none bg-transparent px-4 py-[14px] text-left font-[inherit] ${
                    i < tags.length - 1 ? "border-b" : ""
                  }`}
                  style={{ borderColor: "var(--border-soft)" }}
                >
                  <div className="text-[15px]" style={{ color: "var(--fg)" }}>
                    {tag.name}
                  </div>
                  <div className="mt-[2px] text-[12px]" style={{ color: "var(--fg-muted)" }}>
                    Used on {tag.count} item{tag.count === 1 ? "" : "s"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {actionTag && (
        <TagActionSheet
          tag={actionTag}
          collectionId={collectionId}
          onClose={() => setActionTag(null)}
        />
      )}
    </div>
  );
}
