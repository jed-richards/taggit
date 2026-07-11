interface IconProps {
  size?: number;
  color?: string;
}

export function Plus({
  size = 16,
  color = "currentColor",
  stroke = 1.8,
}: IconProps & { stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
      <path d="M8 2v12M2 8h12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    </svg>
  );
}

export function Camera({
  size = 20,
  color = "currentColor",
  dim = false,
}: IconProps & { dim?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ opacity: dim ? 0.35 : 1 }}
    >
      <path
        d="M3 7h3.5l1.5-2h8l1.5 2H21v12H3z"
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function BackArrow({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M9 4l-5 6 5 6M4 10h12"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronLeft({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M10 3l-5 5 5 5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRight({ size = 14, color = "var(--fg-subtle)" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path
        d="M5 3l4 4-4 4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Dots({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="3" cy="9" r="1.5" fill={color} />
      <circle cx="9" cy="9" r="1.5" fill={color} />
      <circle cx="15" cy="9" r="1.5" fill={color} />
    </svg>
  );
}

export function Search({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke={color} strokeWidth="1.6" />
      <path d="M10.5 10.5L14 14" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function X({ size = 12, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M3 3l6 6M9 3l-6 6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Trash({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 4h10M6.5 4V2.5h3V4M5 4l.7 9h4.6l.7-9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Edit({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 14l.8-2.8L10 4l2 2-7.2 7.2L2 14zM9 5l2 2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Filter({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 3h12M4 8h8M6 13h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Settings({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M10 3v3M10 14v3M3 10h3M14 10h3M5 5l2 2M13 13l2 2M5 15l2-2M13 7l2-2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="2.3" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function TagIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M8 2H3v5l8 8 5-5-8-8z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="6" cy="6" r="1" fill={color} />
    </svg>
  );
}

export function Collections({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="3" y="3" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="9.5" y="3" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="3" y="9.5" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
