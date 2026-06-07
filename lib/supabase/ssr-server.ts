import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cookie-bound server Supabase client (auth context). Use in route handlers
 * and server components to read the signed-in user and run RLS-scoped queries
 * as that user. Returns null when Supabase isn't configured.
 *
 * Next 16: cookies() is async. Mutating cookies only works in route handlers /
 * middleware — the setAll try/catch makes it a no-op in Server Components.
 */
export async function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — cookies are read-only there.
        }
      },
    },
  });
}

export function isAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Convenience: the signed-in user (or null). */
export async function getSessionUser() {
  const sb = await createServerSupabase();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user ?? null;
}
