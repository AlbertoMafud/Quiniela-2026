import "server-only";
import { createClient } from "@supabase/supabase-js";

// TODO: cuando ejecutemos `supabase gen types typescript --local`, reemplazar
// la importación de Database y tipar createClient<Database>.

let _client: ReturnType<typeof createClient> | null = null;

export function adminClient() {
  if (typeof window !== "undefined") {
    throw new Error("adminClient() solo puede usarse en el servidor.");
  }
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
      );
    }
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/**
 * Setea el GUC app.player_id para que las policies RLS sepan quién actúa.
 * Llamar antes de cualquier insert/update por cuenta de un jugador.
 */
export async function setPlayerContext(playerId: string) {
  const supabase = adminClient();
  await (supabase as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  }).rpc("set_config", {
    setting_name: "app.player_id",
    setting_value: playerId,
    is_local: true,
  });
}
