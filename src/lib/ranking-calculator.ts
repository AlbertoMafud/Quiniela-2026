// Cálculo de puntos por jugador (modelo oficial 2026). Cuatro fuentes:
//
//  1. Marcador de grupos:        exacto = exact_score_pts (3) · ganador = correct_winner_pts (1)
//  2. Clasificados (Fase 1):     +1 por cada uno de tus 32 (1° y 2° de tus standings
//                                pronosticados + tus 8 terceros elegidos) que pasó de
//                                verdad a 16avos.
//  3. Marcador de eliminatorias: misma regla que grupos (3 / 1).
//  4. Cuadro (quién avanza):     por cada acierto, bonus por ronda (16avos→2, octavos→3,
//                                cuartos→4, semis→5, final/campeón→6). Independiente del marcador.

import { scoreMatch, CUADRO_BONUS, type ScoringParams } from "./scoring";
import { computeStandings, bestThirds, type MatchScore } from "./standings";
import type { Round } from "@/lib/supabase/database.types";

export interface MatchData {
  id: string;
  stage: string;
  group_letter: string | null;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner: string | null;
}
export interface PredictionData {
  match_id: string;
  player_id: string;
  home_score: number;
  away_score: number;
}
export interface ThirdPickData {
  player_id: string;
  team_code: string;
}
export interface BracketPickData {
  player_id: string;
  slot_id: string;
  round: Round;
  winner_team_code: string | null;
}
export interface PlayerData {
  id: string;
  name: string;
}
export interface TeamInfo {
  code: string;
  name: string;
  group_letter: string;
}

export interface PlayerTotals {
  player_id: string;
  player_name: string;
  group_points: number; // marcador de grupos
  clasificados_points: number; // +1 por clasificado real entre tus 32
  elim_points: number; // marcador de eliminatorias
  cuadro_points: number; // bonus por avance del cuadro
  total: number;
  group_predictions_made: number;
  group_matches_played: number;
}

export function computeTotals(
  players: PlayerData[],
  matches: MatchData[],
  predictions: PredictionData[],
  thirdPicks: ThirdPickData[],
  bracketPicks: BracketPickData[],
  teams: TeamInfo[],
  params: ScoringParams,
): PlayerTotals[] {
  const matchParams = {
    exact_score_pts: params.exact_score_pts,
    correct_winner_pts: params.correct_winner_pts,
  };
  const matchesById = new Map(matches.map((m) => [m.id, m]));

  // --- Realidad: clasificados reales (32) y avanzador real por partido KO ---
  const groupMatches = matches.filter((m) => m.stage === "group");
  const completedGroup: MatchScore[] = [];
  for (const m of groupMatches) {
    if (
      m.home_team_code &&
      m.away_team_code &&
      m.home_score !== null &&
      m.away_score !== null
    ) {
      completedGroup.push({
        home_team_code: m.home_team_code,
        away_team_code: m.away_team_code,
        home_score: m.home_score,
        away_score: m.away_score,
      });
    }
  }
  const groupStageComplete =
    groupMatches.length > 0 && completedGroup.length === groupMatches.length;

  const realQualifiers = new Set<string>();
  if (groupStageComplete) {
    const realStandings = computeStandings(teams, completedGroup);
    for (const s of realStandings) {
      if (s.position === 1 || s.position === 2) realQualifiers.add(s.team_code);
    }
    for (const t of bestThirds(realStandings)) realQualifiers.add(t.team_code);
  }

  // Avanzador real de cada partido de eliminatoria (empate a 90' → penalty_winner).
  const advancerByMatch = new Map<string, string>();
  for (const m of matches) {
    if (m.stage === "group") continue;
    if (m.home_score === null || m.away_score === null) continue;
    let adv: string | null = null;
    if (m.home_score > m.away_score) adv = m.home_team_code;
    else if (m.away_score > m.home_score) adv = m.away_team_code;
    else adv = m.penalty_winner;
    if (adv) advancerByMatch.set(m.id, adv);
  }

  // --- Índices por jugador ---
  const predsByPlayer = new Map<string, PredictionData[]>();
  for (const p of predictions) {
    const list = predsByPlayer.get(p.player_id);
    if (list) list.push(p);
    else predsByPlayer.set(p.player_id, [p]);
  }
  const thirdsByPlayer = new Map<string, string[]>();
  for (const t of thirdPicks) {
    const list = thirdsByPlayer.get(t.player_id);
    if (list) list.push(t.team_code);
    else thirdsByPlayer.set(t.player_id, [t.team_code]);
  }
  const bracketByPlayer = new Map<string, BracketPickData[]>();
  for (const b of bracketPicks) {
    const list = bracketByPlayer.get(b.player_id);
    if (list) list.push(b);
    else bracketByPlayer.set(b.player_id, [b]);
  }

  return players
    .map((pl) => {
      const myPreds = predsByPlayer.get(pl.id) ?? [];

      let group_points = 0;
      let elim_points = 0;
      let group_predictions_made = 0;
      const myGroupScores: MatchScore[] = [];

      for (const p of myPreds) {
        const m = matchesById.get(p.match_id);
        if (!m) continue;
        const actual =
          m.home_score !== null && m.away_score !== null
            ? { home: m.home_score, away: m.away_score }
            : null;
        const pts = scoreMatch(
          { home: p.home_score, away: p.away_score },
          actual,
          matchParams,
        );
        if (m.stage === "group") {
          group_points += pts;
          group_predictions_made += 1;
          if (m.home_team_code && m.away_team_code) {
            myGroupScores.push({
              home_team_code: m.home_team_code,
              away_team_code: m.away_team_code,
              home_score: p.home_score,
              away_score: p.away_score,
            });
          }
        } else {
          elim_points += pts;
        }
      }

      // Clasificados (solo cuando la fase de grupos real ya terminó).
      let clasificados_points = 0;
      if (groupStageComplete) {
        const myPredicted = new Set<string>();
        const myStandings = computeStandings(teams, myGroupScores);
        for (const s of myStandings) {
          if (s.position === 1 || s.position === 2) {
            myPredicted.add(s.team_code);
          }
        }
        for (const code of thirdsByPlayer.get(pl.id) ?? []) {
          myPredicted.add(code);
        }
        for (const code of myPredicted) {
          if (realQualifiers.has(code)) clasificados_points += 1;
        }
      }

      // Cuadro: por cada pick cuyo equipo realmente avanzó esa llave, bonus por ronda.
      let cuadro_points = 0;
      for (const b of bracketByPlayer.get(pl.id) ?? []) {
        if (!b.winner_team_code) continue;
        const adv = advancerByMatch.get(b.slot_id);
        if (adv && adv === b.winner_team_code) {
          cuadro_points += CUADRO_BONUS[b.round] ?? 0;
        }
      }

      const total =
        group_points + clasificados_points + elim_points + cuadro_points;
      return {
        player_id: pl.id,
        player_name: pl.name,
        group_points,
        clasificados_points,
        elim_points,
        cuadro_points,
        total,
        group_predictions_made,
        group_matches_played: completedGroup.length,
      };
    })
    .sort((a, b) => b.total - a.total);
}
