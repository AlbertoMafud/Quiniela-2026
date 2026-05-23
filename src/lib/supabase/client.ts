import { createBrowserClient } from "@supabase/ssr";

// TODO: cuando ejecutemos `supabase gen types typescript --local`, tipar como
// createBrowserClient<Database>.

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
