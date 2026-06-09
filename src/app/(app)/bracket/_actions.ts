"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

const schema = z.object({
  round: z.enum(["r32", "r16", "qf", "sf", "final"]),
  slotId: z.string().min(1),
  winnerTeamCode: z.string().nullable(),
});

export type SavePickResult = { ok: boolean; error?: string };

export async function saveBracketPickAction(input: {
  round: "r32" | "r16" | "qf" | "sf" | "final";
  slotId: string;
  winnerTeamCode: string | null;
}): Promise<SavePickResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const supabase = adminClient();

  const stageKey = `${parsed.data.round}_picks`;
  const { data: deadline } = await supabase
    .from("deadlines")
    .select("deadline_at")
    .eq("stage", stageKey)
    .maybeSingle<{ deadline_at: string }>();
  if (deadline && new Date(deadline.deadline_at) <= new Date()) {
    return { ok: false, error: `El Cierre de ${parsed.data.round} ya pasó.` };
  }

  if (parsed.data.winnerTeamCode === null) {
    const { error } = await supabase
      .from("bracket_picks")
      .delete()
      .eq("player_id", session.playerId)
      .eq("round", parsed.data.round)
      .eq("slot_id", parsed.data.slotId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("bracket_picks")
      .upsert(
        {
          player_id: session.playerId,
          round: parsed.data.round,
          slot_id: parsed.data.slotId,
          winner_team_code: parsed.data.winnerTeamCode,
        } as never,
        { onConflict: "player_id,round,slot_id" },
      );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/bracket");
  return { ok: true };
}
