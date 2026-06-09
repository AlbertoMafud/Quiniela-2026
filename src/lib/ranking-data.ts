import "server-only";

// Fuente ÚNICA de la tabla de puntos. Tanto /ranking como el dashboard usan
// esto, para que ambos muestren EXACTAMENTE los mismos totales (B-4).

import { adminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import {
  computeTotals,
  type PlayerTotals,
  type MatchData,
  type PredictionData,
  type ThirdPickData,
  type BracketPickData,
  type PlayerData,
  type TeamInfo,
} from "@/lib/ranking-calculator";
import type { ScoringParams } from "@/lib/scoring";
import type { Round } from "@/lib/supabase/database.types";

interface PlayerDB {
  id: string;
  name: string;
}
interface MatchDB {
  id: string;
  stage: string;
  group_letter: string | null;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner: string | null;
}
interface PredDB {
  match_id: string;
  player_id: string;
  home_score: number;
  away_score: number;
}
interface TeamDB {
  code: string;
  name: string;
  group_letter: string;
}
interface ThirdDB {
  player_id: string;
  team_code: string;
}
interface BracketDB {
  player_id: string;
  slot_id: string;
  round: Round;
  winner_team_code: string | null;
}

const DEFAULT_PARAMS: ScoringParams = {
  id: 1,
  exact_score_pts: 3,
  correct_winner_pts: 1,
  early_r32_bonus: 1,
  early_r16_bonus: 2,
  early_qf_bonus: 3,
  early_sf_bonus: 4,
  early_final_bonus: 5,
  updated_at: new Date(0).toISOString(),
};

/** Totales por jugador, ordenados desc. Misma lógica que la página /ranking. */
export async function getRankingTotals(): Promise<PlayerTotals[]> {
  const supabase = adminClient();

  const [
    { data: players },
    { data: matches },
    predictions,
    { data: teams },
    { data: thirdPicks },
    { data: bracketPicks },
    { data: scoringRow },
  ] = await Promise.all([
    supabase.from("players").select("id, name").order("name"),
    supabase
      .from("matches")
      .select(
        "id, stage, group_letter, home_team_code, away_team_code, home_score, away_score, penalty_winner",
      ),
    fetchAllRows<PredDB>((from, to) =>
      supabase
        .from("predictions")
        .select("match_id, player_id, home_score, away_score")
        .order("id")
        .range(from, to),
    ),
    supabase.from("teams").select("code, name, group_letter"),
    supabase.from("third_picks").select("player_id, team_code"),
    supabase
      .from("bracket_picks")
      .select("player_id, slot_id, round, winner_team_code"),
    supabase
      .from("scoring_params")
      .select("*")
      .eq("id", 1)
      .maybeSingle<ScoringParams>(),
  ]);

  const playerData: PlayerData[] = ((players ?? []) as PlayerDB[]).map((p) => ({
    id: p.id,
    name: p.name,
  }));
  const matchData: MatchData[] = ((matches ?? []) as MatchDB[]).map((m) => ({
    id: m.id,
    stage: m.stage,
    group_letter: m.group_letter,
    home_team_code: m.home_team_code,
    away_team_code: m.away_team_code,
    home_score: m.home_score,
    away_score: m.away_score,
    penalty_winner: m.penalty_winner,
  }));
  const predData: PredictionData[] = ((predictions ?? []) as PredDB[]).map(
    (p) => ({
      match_id: p.match_id,
      player_id: p.player_id,
      home_score: p.home_score,
      away_score: p.away_score,
    }),
  );
  const teamData: TeamInfo[] = ((teams ?? []) as TeamDB[]).map((t) => ({
    code: t.code,
    name: t.name,
    group_letter: t.group_letter,
  }));
  const thirdData: ThirdPickData[] = ((thirdPicks ?? []) as ThirdDB[]).map(
    (t) => ({ player_id: t.player_id, team_code: t.team_code }),
  );
  const bracketData: BracketPickData[] = (
    (bracketPicks ?? []) as BracketDB[]
  ).map((b) => ({
    player_id: b.player_id,
    slot_id: b.slot_id,
    round: b.round,
    winner_team_code: b.winner_team_code,
  }));
  const params: ScoringParams = scoringRow ?? DEFAULT_PARAMS;

  return computeTotals(
    playerData,
    matchData,
    predData,
    thirdData,
    bracketData,
    teamData,
    params,
  );
}
