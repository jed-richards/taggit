import { Camera } from "./icons";

interface PhotoCellProps {
  imageUrl: string | null;
  name: string;
  showLabel?: boolean;
  onClick?: () => void;
}

export default function PhotoCell({ imageUrl, name, showLabel = true, onClick }: PhotoCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full border-none bg-transparent p-0 text-left font-[inherit]"
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div
        className="w-full overflow-hidden border"
        style={{
          aspectRatio: "1 / 1",
          borderRadius: 4,
          background: "var(--tile-fallback)",
          borderColor: "var(--border-soft)",
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ color: "var(--fg-subtle)" }}
          >
            <Camera size={24} />
          </div>
        )}
      </div>
      {showLabel && (
        <div
          className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-medium leading-snug"
          style={{ color: "var(--fg)" }}
        >
          {name || "Untitled"}
        </div>
      )}
    </button>
  );
}
