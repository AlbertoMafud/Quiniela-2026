import type { Round, Tables } from "@/lib/supabase/database.types";

export type ScoringParams = Tables<"scoring_params">;

export interface MatchPrediction {
  home: number;
  away: number;
}

export interface MatchResult {
  home: number;
  away: number;
}

/**
 * Puntos por un partido individual (grupos o eliminatorias).
 * - Marcador exacto: exact_score_pts
 * - Ganador correcto (o empate correcto): correct_winner_pts
 * - Resto: 0
 */
export function scoreMatch(
  prediction: MatchPrediction,
  actual: MatchResult | null,
  params: Pick<ScoringParams, "exact_score_pts" | "correct_winner_pts">,
): number {
  if (!actual) return 0;
  if (
    prediction.home === actual.home &&
    prediction.away === actual.away
  ) {
    return params.exact_score_pts;
  }
  const predDiff = Math.sign(prediction.home - prediction.away);
  const realDiff = Math.sign(actual.home - actual.away);
  if (predDiff === realDiff) return params.correct_winner_pts;
  return 0;
}

/**
 * ¿El tercero pickeado por el jugador quedó dentro de los 8 mejores reales?
 * Devuelve true si sí, false si no.
 */
export function scoreThirdPick(
  pickedTeam: string,
  actualBestThirds: string[],
): boolean {
  return actualBestThirds.includes(pickedTeam);
}

/**
 * Bonus por equipo del bracket-desde-inicio que efectivamente llega a esa ronda.
 * actualTeamsInRound: equipos reales que avanzaron a la ronda indicada.
 * Devuelve los puntos correspondientes a esa ronda según params.
 */
export function scoreEarlyBracket(
  pickedTeam: string,
  round: Round,
  actualTeamsInRound: string[],
  params: ScoringParams,
): number {
  if (!actualTeamsInRound.includes(pickedTeam)) return 0;
  switch (round) {
    case "r32":
      return params.early_r32_bonus;
    case "r16":
      return params.early_r16_bonus;
    case "qf":
      return params.early_qf_bonus;
    case "sf":
      return params.early_sf_bonus;
    case "final":
      return params.early_final_bonus;
  }
}
