import { Camera, ChevronRight } from "./icons";

interface CollectionCardProps {
  name: string;
  itemCount: number;
  updatedLabel: string;
  imageUrls: string[];
  onClick?: () => void;
}

export default function CollectionCard({
  name,
  itemCount,
  updatedLabel,
  imageUrls,
  onClick,
}: CollectionCardProps) {
  const thumbs = imageUrls.slice(0, 3);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-[14px] rounded-[12px] border-none px-4 py-[14px] text-left font-[inherit]"
      style={{ background: "var(--surface)", boxShadow: "0 0 0 1px var(--border-soft)" }}
    >
      <div className="flex flex-shrink-0 gap-[3px]">
        {thumbs.length > 0 ? (
          thumbs.map((url) => (
            <div key={url} className="h-14 w-11 overflow-hidden rounded-[3px]">
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
          ))
        ) : (
          <div
            className="flex h-14 w-11 items-center justify-center rounded-[3px]"
            style={{ background: "var(--surface-2)", color: "var(--fg-subtle)" }}
          >
            <Camera size={16} dim />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-[600] tracking-[-0.2px]" style={{ color: "var(--fg)" }}>
          {name}
        </div>
        <div className="mt-[2px] text-[13px]" style={{ color: "var(--fg-muted)" }}>
          {itemCount} item{itemCount === 1 ? "" : "s"} · {updatedLabel}
        </div>
      </div>

      <ChevronRight />
    </button>
  );
}
