// Resuelve qué equipo va en cada slot del bracket a partir de:
// - Standings (pronósticos del jugador o reales)
// - 8 mejores terceros escogidos
// - Picks previos del bracket (ganadores ya seleccionados)
//
// Devuelve para cada matchId el equipo en el lado izquierdo y derecho.

import {
  BRACKET_MATCHES,
  type BracketMatch,
  type Round,
  type SlotSource,
} from "./bracket-structure";
import type { StandingRow } from "./standings";

export interface ResolvedTeam {
  code: string | null; // null = TBD
  label: string; // texto a mostrar (ej. "1A", "T3", o el nombre real)
}

export type PicksMap = Record<string, string | null>; // matchId -> winner team code

export interface ResolveContext {
  standings: StandingRow[];
  thirdsOrdered: string[]; // 8 team codes en el orden en que el jugador los seleccionó (T1..T8)
  picks: PicksMap;
}

function findInGroup(
  standings: StandingRow[],
  group: string,
  position: 1 | 2,
): ResolvedTeam {
  const found = standings.find(
    (s) => s.group_letter === group && s.position === position,
  );
  return {
    code: found?.team_code ?? null,
    label: found ? found.team_name : `${position}${group}`,
  };
}

function resolveSlot(
  src: SlotSource,
  ctx: ResolveContext,
  teamNameOf: (code: string) => string,
): ResolvedTeam {
  if (src.type === "group_pos") {
    return findInGroup(ctx.standings, src.group, src.position);
  }
  if (src.type === "third") {
    const code = ctx.thirdsOrdered[src.thirdSlot - 1] ?? null;
    return {
      code,
      label: code ? teamNameOf(code) : `T${src.thirdSlot}`,
    };
  }
  // winner_of
  const winnerCode = ctx.picks[src.matchId] ?? null;
  return {
    code: winnerCode,
    label: winnerCode ? teamNameOf(winnerCode) : `Ganador ${src.matchId}`,
  };
}

export interface ResolvedMatch {
  id: string;
  round: Round;
  left: ResolvedTeam;
  right: ResolvedTeam;
  next: string | null;
  pick: string | null;
}

export function resolveBracket(
  ctx: ResolveContext,
  teamNameOf: (code: string) => string,
): ResolvedMatch[] {
  return BRACKET_MATCHES.map((m: BracketMatch) => ({
    id: m.id,
    round: m.round,
    left: resolveSlot(m.left, ctx, teamNameOf),
    right: resolveSlot(m.right, ctx, teamNameOf),
    next: m.next,
    pick: ctx.picks[m.id] ?? null,
  }));
}
