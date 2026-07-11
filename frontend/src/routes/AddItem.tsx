import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateItem, useCreateTag, useTags, useUploadUrl } from "../api/hooks";
import type { ItemTagRef } from "../api/types";
import TagPill from "../components/TagPill";
import { Camera, X } from "../components/icons";

type UploadState =
  | { phase: "empty" }
  | { phase: "uploading"; previewUrl: string }
  | { phase: "done"; previewUrl: string; imageUrl: string }
  | { phase: "error"; previewUrl: string; file: File };

export default function AddItem() {
  const { id } = useParams();
  const collectionId = Number(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<ItemTagRef[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [upload, setUpload] = useState<UploadState>({ phase: "empty" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allTags } = useTags(collectionId);
  const uploadUrl = useUploadUrl(collectionId);
  const createTag = useCreateTag(collectionId);
  const createItem = useCreateItem(collectionId);

  const normalizedInput = tagInput.trim().toLowerCase();
  const suggestions = (allTags ?? [])
    .filter(
      (t) =>
        normalizedInput.length > 0 &&
        t.name.includes(normalizedInput) &&
        !selectedTags.some((s) => s.id === t.id),
    )
    .slice(0, 5);
  const showCreateRow =
    normalizedInput.length > 0 &&
    !(allTags ?? []).some((t) => t.name === normalizedInput) &&
    !selectedTags.some((s) => s.name === normalizedInput);

  const addExistingTag = (tag: ItemTagRef) => {
    setSelectedTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
    setTagInput("");
  };

  const createAndAddTag = () => {
    createTag.mutate(
      { name: normalizedInput },
      { onSuccess: (tag) => addExistingTag({ id: tag.id, name: tag.name }) },
    );
  };

  const startUpload = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setUpload({ phase: "uploading", previewUrl });
    try {
      const presign = await uploadUrl.mutateAsync(file.type);
      const put = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`upload failed: ${put.status}`);
      setUpload({ phase: "done", previewUrl, imageUrl: presign.image_url });
    } catch {
      // The item is never created without its intended photo — the save
      // button stays disabled until retry succeeds or the photo is removed.
      setUpload({ phase: "error", previewUrl, file });
    }
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void startUpload(file);
    e.target.value = "";
  };

  const canSave =
    name.trim().length > 0 &&
    (upload.phase === "empty" || upload.phase === "done") &&
    !createItem.isPending;

  const save = () => {
    createItem.mutate(
      {
        name: name.trim(),
        notes,
        image_url: upload.phase === "done" ? upload.imageUrl : null,
        tag_ids: selectedTags.map((t) => t.id),
      },
      { onSuccess: () => navigate(`/collections/${collectionId}`) },
    );
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Modal-style header */}
        <div
          className="flex items-center border-b px-4 py-3"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <button
            onClick={() => navigate(`/collections/${collectionId}`)}
            className="cursor-pointer border-none bg-transparent font-[inherit] text-[15px]"
            style={{ color: "var(--fg-muted)" }}
          >
            Cancel
          </button>
          <span
            className="flex-1 text-center text-[17px] font-semibold"
            style={{ color: "var(--fg)" }}
          >
            New Item
          </span>
          <button
            disabled={!canSave}
            onClick={save}
            className="cursor-pointer border-none bg-transparent font-[inherit] text-[15px] font-semibold"
            style={{ color: canSave ? "var(--accent)" : "var(--fg-subtle)" }}
          >
            Save
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 pb-16">
          {/* Photo picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFilePicked}
            aria-label="Add photo"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full cursor-pointer overflow-hidden rounded-[8px] border-2 border-dashed"
            style={{
              aspectRatio: "1 / 1",
              borderColor: upload.phase === "empty" ? "var(--border)" : "transparent",
              background: upload.phase === "empty" ? "var(--surface-2)" : "var(--tile-fallback)",
            }}
          >
            {upload.phase === "empty" ? (
              <div
                className="flex h-full w-full flex-col items-center justify-center gap-2"
                style={{ color: "var(--fg-muted)" }}
              >
                <Camera size={32} />
                <span className="text-[13px]">Add photo</span>
              </div>
            ) : (
              <>
                <img
                  src={upload.previewUrl}
                  alt="Selected item"
                  className="h-full w-full object-cover"
                  style={{ opacity: upload.phase === "uploading" ? 0.5 : 1 }}
                />
                {upload.phase === "uploading" && (
                  <span
                    className="absolute inset-x-0 bottom-3 text-center text-[13px] font-medium"
                    style={{ color: "var(--fg)" }}
                  >
                    Uploading…
                  </span>
                )}
                {upload.phase === "done" && (
                  <span
                    className="absolute inset-x-0 bottom-3 text-center text-[12px]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Photo uploaded · tap to retake
                  </span>
                )}
              </>
            )}
          </button>
          {upload.phase === "error" && (
            <div
              className="-mt-2 flex items-center justify-between rounded-[10px] px-4 py-3 text-[13px]"
              style={{ background: "var(--surface-2)", color: "var(--danger)" }}
            >
              <span>Upload failed — check your connection.</span>
              <button
                onClick={() => void startUpload(upload.file)}
                className="cursor-pointer rounded-full border-none px-3 py-1 text-[12px] font-semibold"
                style={{ background: "var(--danger)", color: "#fff" }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Name + notes */}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-[10px] border px-3 py-3 text-[16px] outline-none"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--border-soft)",
              color: "var(--fg)",
            }}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={3}
            className="w-full resize-none rounded-[10px] border px-3 py-3 text-[16px] outline-none"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--border-soft)",
              color: "var(--fg)",
            }}
          />

          {/* Tags */}
          <div>
            <div
              className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px]"
              style={{ color: "var(--fg-muted)" }}
            >
              Tags
            </div>
            {selectedTags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span key={tag.id} className="inline-flex items-center gap-1">
                    <TagPill label={tag.name} active />
                    <button
                      aria-label={`Remove ${tag.name}`}
                      onClick={() => setSelectedTags((prev) => prev.filter((t) => t.id !== tag.id))}
                      className="cursor-pointer rounded-full border-none bg-transparent p-1"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Type to add tags…"
              className="w-full rounded-[10px] border px-3 py-3 text-[16px] outline-none"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border-soft)",
                color: "var(--fg)",
              }}
            />
            {(suggestions.length > 0 || showCreateRow) && (
              <div
                className="mt-1 overflow-hidden rounded-[10px]"
                style={{ background: "var(--surface)", boxShadow: "0 0 0 1px var(--border-soft)" }}
              >
                {suggestions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => addExistingTag({ id: t.id, name: t.name })}
                    className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent px-4 py-[10px] text-left text-[14px]"
                    style={{ color: "var(--fg)" }}
                  >
                    <span>{t.name}</span>
                    <span className="text-[12px]" style={{ color: "var(--fg-subtle)" }}>
                      {t.count}
                    </span>
                  </button>
                ))}
                {showCreateRow && (
                  <button
                    onClick={createAndAddTag}
                    disabled={createTag.isPending}
                    className="w-full cursor-pointer border-none bg-transparent px-4 py-[10px] text-left text-[14px] font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    Create “{normalizedInput}”
                  </button>
                )}
              </div>
            )}
          </div>

          {createItem.isError && (
            <p className="text-[13px]" style={{ color: "var(--danger)" }}>
              Couldn’t save the item — try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
