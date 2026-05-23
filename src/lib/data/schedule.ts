import { GROUPS } from "./teams";

// Round-robin pattern dentro de cada grupo (índices 1..4)
const ROUND_PATTERN: Array<{ match_num: number; home: number; away: number }> = [
  { match_num: 1, home: 1, away: 2 },
  { match_num: 2, home: 3, away: 4 },
  { match_num: 3, home: 1, away: 3 },
  { match_num: 4, home: 2, away: 4 },
  { match_num: 5, home: 1, away: 4 },
  { match_num: 6, home: 2, away: 3 },
];

export interface MatchRecord {
  id: string;
  stage: "group";
  group_letter: string;
  home_team_code: string;
  away_team_code: string;
  kickoff_at: string;
}

const KICKOFF_BASE = new Date("2026-06-11T12:00:00Z").getTime();
const MS_DAY = 24 * 60 * 60 * 1000;
const MS_HOUR = 60 * 60 * 1000;

export const GROUP_MATCHES: MatchRecord[] = GROUPS.flatMap((g, gIdx) =>
  ROUND_PATTERN.map((r) => {
    const dayOffset =
      r.match_num <= 2 ? 0 : r.match_num <= 4 ? 6 : 12;
    const day = dayOffset + Math.floor(gIdx / 2);
    const slot = (r.match_num % 2 === 1 ? 0 : 1) + (gIdx % 2) * 2;
    const kickoff = new Date(KICKOFF_BASE + day * MS_DAY + slot * 3 * MS_HOUR);

    return {
      id: `g_${g}_${r.match_num}`,
      stage: "group" as const,
      group_letter: g,
      home_team_code: `E${g}${r.home}`,
      away_team_code: `E${g}${r.away}`,
      kickoff_at: kickoff.toISOString(),
    };
  }),
);
