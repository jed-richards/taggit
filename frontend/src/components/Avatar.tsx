interface AvatarProps {
  initials: string;
  size?: number;
  idx?: number;
}

const PALETTE = ["#C8742A", "#0F6E6E", "#8B4A8C", "#2B4C7E", "#6B5B3A"];

export default function Avatar({ initials, size = 24, idx = 0 }: AvatarProps) {
  return (
    <div
      className="flex items-center justify-center font-semibold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: PALETTE[idx % PALETTE.length],
        fontSize: Math.round(size * 0.42),
        boxShadow: "0 0 0 1.5px var(--surface)",
      }}
    >
      {initials}
    </div>
  );
}
