import { Camera, Plus } from "./icons";

interface FABProps {
  onClick?: () => void;
  icon?: "plus" | "camera";
  label?: string;
}

export default function FAB({ onClick, icon = "plus", label = "Add" }: FABProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="fixed bottom-10 right-5 z-20 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-none"
      style={{
        background: "var(--accent)",
        color: "var(--accent-on)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.08)",
        marginBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {icon === "camera" ? <Camera size={22} /> : <Plus size={22} stroke={2.2} />}
    </button>
  );
}
