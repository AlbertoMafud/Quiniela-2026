// Calcula puntos por jugador desglosados por categoría y por partido.
// Reusa scoreMatch() y scoreEarlyBracket() de lib/scoring.

import { scoreMatch, type ScoringParams } from "./scoring";

export interface MatchData {
  id: string;
  stage: string;
  group_letter: string | null;
  home_score: number | null;
  away_score: number | null;
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

export interface PlayerData {
  id: string;
  name: string;
}

export interface MatchPredictionPoints {
  player_id: string;
  pred_home: number;
  pred_away: number;
  points: number;
  exact: boolean;
  winner: boolean;
}

export interface MatchBreakdown {
  match_id: string;
  predictions: MatchPredictionPoints[];
}

export interface PlayerTotals {
  player_id: string;
  player_name: string;
  group_points: number;
  thirds_points: number;
  bracket_points: number;
  total: number;
  group_predictions_made: number;
  group_matches_played: number; // partidos con resultado oficial
}

/**
 * Para cada partido, devuelve qué predijo cada jugador y cuántos puntos ganó.
 */
export function breakdownByMatch(
  matches: MatchData[],
  predictions: PredictionData[],
  params: Pick<ScoringParams, "exact_score_pts" | "correct_winner_pts">,
): Map<string, MatchPredictionPoints[]> {
  const map = new Map<string, MatchPredictionPoints[]>();
  const matchesById = new Map(matches.map((m) => [m.id, m]));

  for (const p of predictions) {
    const m = matchesById.get(p.match_id);
    if (!m) continue;
    const actual =
      m.home_score !== null && m.away_score !== null
        ? { home: m.home_score, away: m.away_score }
        : null;
    const pred = { home: p.home_score, away: p.away_score };
    const points = scoreMatch(pred, actual, params);
    const exact =
      actual !== null &&
      pred.home === actual.home &&
      pred.away === actual.away;
    const winner =
      actual !== null &&
      !exact &&
      Math.sign(pred.home - pred.away) === Math.sign(actual.home - actual.away);

    const row: MatchPredictionPoints = {
      player_id: p.player_id,
      pred_home: p.home_score,
      pred_away: p.away_score,
      points,
      exact,
      winner,
    };

    const list = map.get(p.match_id) ?? [];
    list.push(row);
    map.set(p.match_id, list);
  }
  return map;
}

/**
 * Para cada jugador, suma puntos totales por categoría.
 */
export function computeTotals(
  players: PlayerData[],
  matches: MatchData[],
  predictions: PredictionData[],
  thirdsActualBest: string[], // 8 best thirds reales (vacío si fase grupos no termina)
  thirdPicks: ThirdPickData[],
  params: ScoringParams,
): PlayerTotals[] {
  const breakdown = breakdownByMatch(matches, predictions, params);

  // Acumular puntos por stage
  const groupPointsByPlayer = new Map<string, number>();
  const eliminationPointsByPlayer = new Map<string, number>();
  for (const [matchId, list] of breakdown) {
    const m = matches.find((x) => x.id === matchId);
    if (!m) continue;
    for (const row of list) {
      if (m.stage === "group") {
        groupPointsByPlayer.set(
          row.player_id,
          (groupPointsByPlayer.get(row.player_id) ?? 0) + row.points,
        );
      } else {
        eliminationPointsByPlayer.set(
          row.player_id,
          (eliminationPointsByPlayer.get(row.player_id) ?? 0) + row.points,
        );
      }
    }
  }

  // Mejores terceros: por cada player, contar cuántos de sus picks están en thirdsActualBest.
  // OJO: solo se cuentan cuando la fase de grupos esté COMPLETA (todos los partidos jugados).
  // De lo contrario, `bestThirds()` devuelve teams ordenados alfabéticamente con 0 pts
  // y daría puntos "fantasma" antes de que arranque el torneo.
  const thirdsByPlayer = new Map<string, number>();
  const groupTotalCount = matches.filter((m) => m.stage === "group").length;
  const groupStageComplete =
    groupTotalCount > 0 &&
    matches.filter(
      (m) =>
        m.stage === "group" && m.home_score !== null && m.away_score !== null,
    ).length === groupTotalCount;
  if (groupStageComplete && thirdsActualBest.length > 0) {
    for (const p of thirdPicks) {
      if (thirdsActualBest.includes(p.team_code)) {
        thirdsByPlayer.set(
          p.player_id,
          (thirdsByPlayer.get(p.player_id) ?? 0) + 1,
        );
      }
    }
  }
  // Cada acierto vale (por convención) el bonus de R32 — equipo llega a R32
  const thirdHitValue = params.early_r32_bonus;

  // Predictions made + matches played en grupos
  const groupPredsCount = new Map<string, number>();
  for (const p of predictions) {
    const m = matches.find((x) => x.id === p.match_id);
    if (m?.stage === "group") {
      groupPredsCount.set(
        p.player_id,
        (groupPredsCount.get(p.player_id) ?? 0) + 1,
      );
    }
  }
  const groupPlayed = matches.filter(
    (m) => m.stage === "group" && m.home_score !== null && m.away_score !== null,
  ).length;

  return players
    .map((pl) => {
      const group = groupPointsByPlayer.get(pl.id) ?? 0;
      const thirds = (thirdsByPlayer.get(pl.id) ?? 0) * thirdHitValue;
      const elims = eliminationPointsByPlayer.get(pl.id) ?? 0;
      return {
        player_id: pl.id,
        player_name: pl.name,
        group_points: group,
        thirds_points: thirds,
        bracket_points: elims,
        total: group + thirds + elims,
        group_predictions_made: groupPredsCount.get(pl.id) ?? 0,
        group_matches_played: groupPlayed,
      };
    })
    .sort((a, b) => b.total - a.total);
}
