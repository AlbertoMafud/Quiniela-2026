"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

const schema = z.object({
  teamCodes: z.array(z.string().min(1)).length(8, "Debes seleccionar 8 equipos."),
});

export type SaveThirdsResult = { ok: boolean; error?: string };

export async function saveThirdsAction(
  teamCodes: string[],
): Promise<SaveThirdsResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  const parsed = schema.safeParse({ teamCodes });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const supabase = adminClient();

  // Validar deadline de 'thirds'.
  const { data: deadline } = await supabase
    .from("deadlines")
    .select("deadline_at")
    .eq("stage", "thirds")
    .maybeSingle<{ deadline_at: string }>();

  if (deadline && new Date(deadline.deadline_at) <= new Date()) {
    return { ok: false, error: "El deadline para terceros ya pasó." };
  }

  // Reemplazar selección completa: borrar y reinsertar.
  const { error: delError } = await supabase
    .from("third_picks")
    .delete()
    .eq("player_id", session.playerId);
  if (delError) return { ok: false, error: delError.message };

  const rows = parsed.data.teamCodes.map((code, idx) => ({
    player_id: session.playerId,
    team_code: code,
    pick_order: idx + 1,
  }));
  const { error } = await supabase
    .from("third_picks")
    .insert(rows as never);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/pronosticos/terceros");
  revalidatePath("/ranking");
  return { ok: true };
}
