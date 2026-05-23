import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

interface PlayerRow {
  id: string;
  name: string;
  is_admin: boolean;
}

/**
 * Garantiza que el usuario actual es admin. Redirige a / si no lo es,
 * o a /login si no hay sesión. Devuelve los datos del player.
 */
export async function requireAdmin(): Promise<PlayerRow> {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = adminClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, name, is_admin")
    .eq("id", session.playerId)
    .maybeSingle<PlayerRow>();

  if (!player) redirect("/login");
  if (!player.is_admin) redirect("/");
  return player;
}

/**
 * Verifica en una server action que el actor es admin.
 * Lanza error si no lo es.
 */
export async function assertAdmin(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("No autenticado.");

  const supabase = adminClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, is_admin")
    .eq("id", session.playerId)
    .maybeSingle<{ id: string; is_admin: boolean }>();

  if (!player || !player.is_admin) {
    throw new Error("No autorizado.");
  }
  return player.id;
}

export async function logAdminAction(
  actorId: string,
  action: string,
  target: string | null,
  payload: Record<string, unknown>,
) {
  const supabase = adminClient();
  await supabase.from("audit_log").insert({
    actor_player_id: actorId,
    action,
    target,
    payload,
  } as never);
}
