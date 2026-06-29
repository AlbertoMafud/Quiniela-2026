"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { checkStageEditable } from "@/lib/gates-server";
import {
  CUADRO_FROZEN_BRANCH_MATCH_IDS,
  isCuadroFrozenForPlayer,
} from "@/lib/cuadro-overrides";

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

  if (
    isCuadroFrozenForPlayer(session.playerId) &&
    (CUADRO_FROZEN_BRANCH_MATCH_IDS as readonly string[]).includes(
      parsed.data.slotId,
    )
  ) {
    return { ok: false, error: "Esta rama del cuadro queda fija al resultado real." };
  }

  const supabase = adminClient();

  const stageKey = `${parsed.data.round}_picks`;
  const gate = await checkStageEditable(stageKey);
  if (!gate.editable) {
    return { ok: false, error: gate.reason ?? "Etapa cerrada." };
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
