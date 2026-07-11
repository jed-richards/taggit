import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCollections, useCreateCollection } from "../api/hooks";
import Avatar from "../components/Avatar";
import CollectionCard from "../components/CollectionCard";
import FAB from "../components/FAB";
import { useAuth } from "../lib/auth";
import { initials, relativeTime } from "../lib/time";

function CreateCollectionSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const create = useCreateCollection();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const save = () => {
    create.mutate(
      { name: name.trim(), description },
      { onSuccess: (coll) => navigate(`/collections/${coll.id}`) },
    );
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        className="absolute inset-0 border-none"
        style={{ background: "rgba(0,0,0,0.4)", animation: "fade-in 150ms" }}
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-t-[18px] px-5 pb-8 pt-5 sm:rounded-[18px]"
        style={{ background: "var(--surface)", animation: "slide-up 200ms ease-out" }}
      >
        <h2 className="text-[17px] font-semibold" style={{ color: "var(--fg)" }}>
          New collection
        </h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && save()}
          placeholder="Name — e.g. Snoopy Mugs"
          className="mt-4 w-full rounded-[10px] border px-3 py-3 text-[16px] outline-none"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border-soft)",
            color: "var(--fg)",
          }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="mt-3 w-full resize-none rounded-[10px] border px-3 py-3 text-[16px] outline-none"
          style={{
            background: "var(--surface-2)",
            borderColor: "var(--border-soft)",
            color: "var(--fg)",
          }}
        />
        {create.isError && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--danger)" }}>
            Couldn’t create the collection — try again.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-full border-none bg-transparent px-4 py-2 text-[15px]"
            style={{ color: "var(--fg-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || create.isPending}
            className="cursor-pointer rounded-full border-none px-5 py-2 text-[15px] font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-on)" }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Collections() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: collections, isPending, isError, refetch } = useCollections();
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const totalItems = collections?.reduce((s, c) => s + c.item_count, 0) ?? 0;

  return (
    <div className="relative flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="px-5 pb-2 pt-4">
          <div className="flex min-h-8 items-center">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="cursor-pointer rounded-full border-none bg-transparent p-0"
              aria-label="Account menu"
            >
              <Avatar initials={initials(user?.name ?? user?.email ?? "?")} size={32} />
            </button>
            <div className="flex-1" />
          </div>
          {menuOpen && (
            <div
              className="absolute z-20 mt-2 w-64 rounded-[12px] p-4"
              style={{
                background: "var(--surface)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px var(--border-soft)",
              }}
            >
              <p className="text-[14px] font-semibold" style={{ color: "var(--fg)" }}>
                {user?.name ?? "Signed in"}
              </p>
              <p className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
                {user?.email}
              </p>
              <button
                onClick={() => void signOut()}
                className="mt-3 w-full cursor-pointer rounded-[8px] border px-3 py-2 text-left text-[14px]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--danger)",
                  background: "transparent",
                }}
              >
                Sign out
              </button>
            </div>
          )}
          <h1
            className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.6px]"
            style={{ color: "var(--fg)" }}
          >
            Collections
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--fg-muted)" }}>
            {collections
              ? `${collections.length} collection${collections.length === 1 ? "" : "s"} · ${totalItems} item${totalItems === 1 ? "" : "s"}`
              : " "}
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-[10px] px-4 py-3 pb-28">
          {isPending && (
            <p className="mt-8 text-center text-[14px]" style={{ color: "var(--fg-subtle)" }}>
              Loading…
            </p>
          )}
          {isError && (
            <div className="mt-8 text-center">
              <p className="text-[14px]" style={{ color: "var(--fg-muted)" }}>
                Couldn’t load your collections.
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
          {collections?.length === 0 && (
            <div className="mt-16 text-center">
              <p className="text-[15px] font-medium" style={{ color: "var(--fg)" }}>
                No collections yet
              </p>
              <p
                className="mx-auto mt-1 max-w-[260px] text-[13px]"
                style={{ color: "var(--fg-muted)" }}
              >
                Start one for the things you collect — mugs, birds, stamps…
              </p>
              <button
                onClick={() => setCreating(true)}
                className="mt-4 cursor-pointer rounded-full border-none px-5 py-[10px] text-[14px] font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-on)" }}
              >
                Create your first collection
              </button>
            </div>
          )}
          {collections?.map((coll) => (
            <CollectionCard
              key={coll.id}
              name={coll.name}
              itemCount={coll.item_count}
              updatedLabel={relativeTime(coll.updated_at)}
              imageUrls={coll.recent_image_urls}
              onClick={() => navigate(`/collections/${coll.id}`)}
            />
          ))}
        </div>
      </div>

      <FAB label="New collection" onClick={() => setCreating(true)} />
      {creating && <CreateCollectionSheet onClose={() => setCreating(false)} />}
    </div>
  );
}
