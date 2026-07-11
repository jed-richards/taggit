interface TagPillProps {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export default function TagPill({
  label,
  count,
  active = false,
  onClick,
  size = "md",
}: TagPillProps) {
  const pad = size === "sm" ? "px-[9px] py-[3px]" : "px-3 py-[5px]";
  const fs = size === "sm" ? "text-[12px]" : "text-[13px]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-[6px] whitespace-nowrap rounded-full border font-medium leading-none transition-all duration-[120ms] ${pad} ${fs}`}
      style={{
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--accent-on)" : "var(--fg)",
        borderColor: active ? "var(--accent)" : "var(--border)",
      }}
    >
      <span>{label}</span>
      {count != null && (
        <span
          className="tabular-nums"
          style={{ opacity: active ? 0.75 : 0.5, fontSize: size === "sm" ? 11 : 12 }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
