// Placeholder de equipos. Reemplazar con datos reales del sorteo del Mundial 2026.
// El mismo set debe quedar reflejado en supabase/seed.sql.

export interface TeamRecord {
  code: string;
  name: string;
  group_letter: string;
  flag_emoji: string;
}

export const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
export type GroupLetter = (typeof GROUPS)[number];

function makeGroupTeams(letter: GroupLetter): TeamRecord[] {
  return [1, 2, 3, 4].map((idx) => ({
    code: `E${letter}${idx}`,
    name: `Equipo ${letter}${idx}`,
    group_letter: letter,
    flag_emoji: "🏳️",
  }));
}

export const TEAMS: TeamRecord[] = GROUPS.flatMap(makeGroupTeams);

export const TEAMS_BY_CODE = new Map(TEAMS.map((t) => [t.code, t]));
