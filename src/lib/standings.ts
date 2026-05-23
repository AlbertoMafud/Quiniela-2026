// Cálculo de tablas de posiciones (W/D/L/GF/GA/GD/pts) a partir de un set
// de partidos con marcadores. Lo usamos tanto para standings oficiales
// (basados en `matches.home_score`/`away_score`) como para standings
// "hipotéticos" de un jugador (basados en sus `predictions`).
//
// Tiebreakers (simplificados): puntos → GD → GF → orden alfabético del code.
// Para uso en producción se debería aplicar el desempate FIFA completo
// (head-to-head, fair play), pero para los pronósticos del jugador esto basta.

export interface MatchScore {
  home_team_code: string;
  away_team_code: string;
  home_score: number;
  away_score: number;
}

export interface TeamLite {
  code: string;
  name: string;
  group_letter: string;
}

export interface StandingRow {
  team_code: string;
  team_name: string;
  group_letter: string;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  position: number; // 1-4 dentro del grupo
}

export function computeStandings(
  teams: TeamLite[],
  matches: MatchScore[],
): StandingRow[] {
  const init = new Map<string, StandingRow>();
  for (const t of teams) {
    init.set(t.code, {
      team_code: t.code,
      team_name: t.name,
      group_letter: t.group_letter,
      w: 0,
      d: 0,
      l: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
      position: 0,
    });
  }

  for (const m of matches) {
    const home = init.get(m.home_team_code);
    const away = init.get(m.away_team_code);
    if (!home || !away) continue;
    home.gf += m.home_score;
    home.ga += m.away_score;
    away.gf += m.away_score;
    away.ga += m.home_score;
    if (m.home_score > m.away_score) {
      home.w += 1;
      home.pts += 3;
      away.l += 1;
    } else if (m.home_score < m.away_score) {
      away.w += 1;
      away.pts += 3;
      home.l += 1;
    } else {
      home.d += 1;
      away.d += 1;
      home.pts += 1;
      away.pts += 1;
    }
  }

  for (const row of init.values()) row.gd = row.gf - row.ga;

  const byGroup = new Map<string, StandingRow[]>();
  for (const row of init.values()) {
    const list = byGroup.get(row.group_letter) ?? [];
    list.push(row);
    byGroup.set(row.group_letter, list);
  }

  for (const [, list] of byGroup) {
    list.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team_code.localeCompare(b.team_code);
    });
    list.forEach((row, i) => {
      row.position = i + 1;
    });
  }

  return Array.from(init.values()).sort((a, b) => {
    if (a.group_letter !== b.group_letter) {
      return a.group_letter.localeCompare(b.group_letter);
    }
    return a.position - b.position;
  });
}

/** Devuelve los 12 equipos que quedaron en tercer lugar (uno por grupo). */
export function pickThirds(rows: StandingRow[]): StandingRow[] {
  return rows.filter((r) => r.position === 3);
}

/**
 * De los 12 terceros, devuelve los 8 mejores ordenados por
 * pts → GD → GF → code. FIFA usa una tabla más compleja con
 * head-to-head y fair play; aquí simplificamos para v1.
 */
export function bestThirds(rows: StandingRow[]): StandingRow[] {
  return pickThirds(rows)
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team_code.localeCompare(b.team_code);
    })
    .slice(0, 8);
}
