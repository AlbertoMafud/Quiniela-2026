"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

const schema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
});

export type SavePredictionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function savePredictionAction(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
}): Promise<SavePredictionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const supabase = adminClient();

  // Validar que la etapa del partido no haya pasado deadline.
  const { data: match } = await supabase
    .from("matches")
    .select("id, stage, kickoff_at")
    .eq("id", parsed.data.matchId)
    .maybeSingle<{ id: string; stage: string; kickoff_at: string }>();
  if (!match) return { ok: false, error: "Partido no encontrado." };

  const deadlineStage =
    match.stage === "group"
      ? "group_stage"
      : `${match.stage}_scores`;

  const { data: deadline } = await supabase
    .from("deadlines")
    .select("deadline_at")
    .eq("stage", deadlineStage)
    .maybeSingle<{ deadline_at: string }>();

  const now = new Date();
  if (deadline && new Date(deadline.deadline_at) <= now) {
    return { ok: false, error: "Deadline pasado: no puedes editar este pronóstico." };
  }

  // Adicional: si el partido ya empezó, tampoco editar.
  if (new Date(match.kickoff_at) <= now) {
    return { ok: false, error: "El partido ya empezó." };
  }

  const { error } = await supabase
    .from("predictions")
    .upsert(
      {
        player_id: session.playerId,
        match_id: parsed.data.matchId,
        home_score: parsed.data.homeScore,
        away_score: parsed.data.awayScore,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "player_id,match_id" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/pronosticos/grupos");
  revalidatePath("/ranking");
  return { ok: true };
}
