import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// The anon key is public by design — real security is the backend's JWT
// verification. Fallback values keep the client constructable in tests and
// unconfigured dev; isSupabaseConfigured gates the login UI.
export const supabase = createClient(
  url ?? "https://unconfigured.supabase.co",
  anonKey ?? "unconfigured",
);
