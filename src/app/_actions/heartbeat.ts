"use server";

import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Actualiza el last_seen_at del jugador actual. Llamado desde el cliente
 * cada minuto via setInterval. Idempotente y barato.
 */
export async function pingHeartbeat(): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const supabase = adminClient();
  // Update sin select; ignoramos errores silenciosamente (no es crítico)
  await supabase
    .from("players")
    .update({ last_seen_at: new Date().toISOString() } as never)
    .eq("id", session.playerId);
}
