import { supabase } from "./supabase";

/**
 * fetch with the Supabase access token attached. getSession() transparently
 * refreshes an expired token, so callers never handle refresh themselves.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
