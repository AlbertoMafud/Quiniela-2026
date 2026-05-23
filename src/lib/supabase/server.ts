import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// TODO: cuando ejecutemos `supabase gen types typescript --local`, reemplazar
// la importación de Database y tipar createServerClient<Database>.
// Por ahora dejamos el cliente sin tipar y casteamos rows en cada query.

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde Server Component: la mutación se ignora.
          }
        },
      },
    },
  );
}
