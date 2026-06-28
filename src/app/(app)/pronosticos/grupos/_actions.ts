"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { checkStageEditable, getTournamentStart } from "@/lib/gates-server";

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
    match.stage === "group" ? "group_stage" : `${match.stage}_scores`;

  const gate = await checkStageEditable(deadlineStage);
  if (!gate.editable) {
    return { ok: false, error: gate.reason ?? "Etapa cerrada." };
  }

  const now = new Date();
  if (gate.override !== "open") {
    if (new Date(match.kickoff_at) <= now) {
      return { ok: false, error: "El partido ya empezó." };
    }
    if (match.stage === "group") {
      const start = await getTournamentStart();
      if (start && new Date(start) <= now) {
        return { ok: false, error: "El torneo ya inició: los grupos están cerrados." };
      }
    }
  }

  const isElimination = match.stage !== "group";
  const isDraw = parsed.data.homeScore === parsed.data.awayScore;
  let penaltyWinner: string | null = null;

  if (isElimination && isDraw) {
    if (!parsed.data.penaltyWinnerCode) {
      return {
        ok: false,
        error: "En empate de eliminatoria debes definir quién pasa.",
      };
    }
    if (
      parsed.data.penaltyWinnerCode !== match.home_team_code &&
      parsed.data.penaltyWinnerCode !== match.away_team_code
    ) {
      return {
        ok: false,
        error: "El equipo que pasa debe ser uno de los dos del partido.",
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

  // El Cuadro muestra 16avos "ya llenado" con el ganador de tu marcador (no
  // editable a mano), pero los puntos de cuadro (CUADRO_BONUS) solo se pagan
  // si hay una fila en bracket_picks — sin esto, el bono de "+2 por pasar
  // 16avos" (documentado en /reglas) nunca se podía ganar. Lo guardamos aquí
  // para que quede igual de automático que se ve en pantalla.
  if (match.stage === "r32") {
    let winner: string | null = null;
    if (parsed.data.homeScore > parsed.data.awayScore) winner = match.home_team_code;
    else if (parsed.data.awayScore > parsed.data.homeScore) winner = match.away_team_code;
    else winner = penaltyWinner;

    const { error: pickError } = await supabase.from("bracket_picks").upsert(
      {
        player_id: session.playerId,
        round: "r32",
        slot_id: parsed.data.matchId,
        winner_team_code: winner,
      } as never,
      { onConflict: "player_id,round,slot_id" },
    );
    if (pickError) return { ok: false, error: pickError.message };
  }

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
