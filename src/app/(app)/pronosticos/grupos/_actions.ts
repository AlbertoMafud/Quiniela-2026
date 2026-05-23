"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

const schema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
  penaltyWinnerCode: z.string().nullable().optional(),
});

export type SavePredictionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function savePredictionAction(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
  penaltyWinnerCode?: string | null;
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
    .select("id, stage, kickoff_at, home_team_code, away_team_code")
    .eq("id", parsed.data.matchId)
    .maybeSingle<{
      id: string;
      stage: string;
      kickoff_at: string;
      home_team_code: string | null;
      away_team_code: string | null;
    }>();
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
    return { ok: false, error: "Cierre pasado: no puedes editar este pronóstico." };
  }

  if (new Date(match.kickoff_at) <= now) {
    return { ok: false, error: "El partido ya empezó." };
  }

  const isElimination = match.stage !== "group";
  const isDraw = parsed.data.homeScore === parsed.data.awayScore;
  let penaltyWinner: string | null = null;

  if (isElimination && isDraw) {
    if (!parsed.data.penaltyWinnerCode) {
      return {
        ok: false,
        error: "En empate de eliminatoria debes definir quién pasa por penales.",
      };
    }
    if (
      parsed.data.penaltyWinnerCode !== match.home_team_code &&
      parsed.data.penaltyWinnerCode !== match.away_team_code
    ) {
      return {
        ok: false,
        error: "El equipo de penales debe ser uno de los dos del partido.",
      };
    }
    penaltyWinner = parsed.data.penaltyWinnerCode;
  }

  // Solo incluimos penalty_winner_code en el payload si es eliminatoria.
  // Así, si la migración aún no se aplicó en la DB, los pronósticos de grupo
  // siguen funcionando sin tocar la columna.
  const payload: Record<string, unknown> = {
    player_id: session.playerId,
    match_id: parsed.data.matchId,
    home_score: parsed.data.homeScore,
    away_score: parsed.data.awayScore,
    updated_at: new Date().toISOString(),
  };
  if (isElimination) {
    payload.penalty_winner_code = penaltyWinner;
  }

  const { error } = await supabase
    .from("predictions")
    .upsert(payload as never, { onConflict: "player_id,match_id" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/pronosticos/grupos");
  revalidatePath("/pronosticos/eliminatorias/r32");
  revalidatePath("/pronosticos/eliminatorias/r16");
  revalidatePath("/pronosticos/eliminatorias/qf");
  revalidatePath("/pronosticos/eliminatorias/sf");
  revalidatePath("/pronosticos/eliminatorias/final");
  revalidatePath("/bracket");
  revalidatePath("/ranking");
  return { ok: true };
}
