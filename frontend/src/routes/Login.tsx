import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { isSupabaseConfigured } from "../lib/supabase";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 34.9 44 30 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (!loading && user) return <Navigate to="/collections" replace />;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-[16px] text-[26px]"
          style={{ background: "var(--accent-soft)" }}
          aria-hidden="true"
        >
          🏷️
        </div>
        <h1 className="text-[32px] font-bold tracking-[-0.6px]" style={{ color: "var(--fg)" }}>
          Taggit
        </h1>
        <p
          className="max-w-[280px] text-[15px] leading-relaxed"
          style={{ color: "var(--fg-muted)" }}
        >
          Your collections in your pocket — snap it, tag it, never buy a duplicate again.
        </p>
      </div>

      <button
        onClick={() => void signInWithGoogle()}
        disabled={loading}
        className="flex h-12 cursor-pointer items-center gap-3 rounded-full border px-6 text-[15px] font-medium"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--fg)",
        }}
      >
        <GoogleMark />
        Continue with Google
      </button>

      {!isSupabaseConfigured && (
        <p className="max-w-[300px] text-center text-[12px]" style={{ color: "var(--danger)" }}>
          Supabase is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. See
          docs/auth-setup.md.
        </p>
      )}
    </div>
  );
}
