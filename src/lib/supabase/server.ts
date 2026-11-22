import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Per-request client that acts as the signed-in user (RLS applies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Service-role client that BYPASSES RLS. Only for trusted server actions
 * (creating auth users, first-run setup). Never import from client code.
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
