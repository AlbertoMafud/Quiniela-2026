// Test manual del detalle de puntaje por jugador (no es parte del build).
// Corre:  npx tsx scripts/test-player-detail.ts
import { computeTotals, computePlayerDetail } from "../src/lib/ranking-calculator";

const params = {
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

// Mismo fixture que scripts/test-scoring.ts: grupo A con 4 equipos, A1 gana
// todo, A2 2°, A3 3° (y mejor tercero real), A4 4°.
const teams = [
  { code: "A1", name: "A1", group_letter: "A" },
  { code: "A2", name: "A2", group_letter: "A" },
  { code: "A3", name: "A3", group_letter: "A" },
  { code: "A4", name: "A4", group_letter: "A" },
];

const g = (id: string, h: string, a: string, hs: number, as: number) => ({
  id,
  stage: "group",
  group_letter: "A",
  home_team_code: h,
  away_team_code: a,
  home_score: hs,
  away_score: as,
  penalty_winner: null as string | null,
});

const matches = [
  g("g1", "A1", "A2", 1, 0),
  g("g2", "A1", "A3", 1, 0),
  g("g3", "A1", "A4", 1, 0),
  g("g4", "A2", "A3", 1, 0),
  g("g5", "A2", "A4", 1, 0),
  g("g6", "A3", "A4", 1, 0),
  // KO: r32 A1 2-1 A2 (pasa A1). Final A1 1-1 A3, penales A1 (campeón A1).
  {
    id: "r32_m1",
    stage: "r32",
    group_letter: null,
    home_team_code: "A1",
    away_team_code: "A2",
    home_score: 2,
    away_score: 1,
    penalty_winner: null as string | null,
  },
  {
    id: "final_m1",
    stage: "final",
    group_letter: null,
    home_team_code: "A1",
    away_team_code: "A3",
    home_score: 1,
    away_score: 1,
    penalty_winner: "A1",
  },
];

const players = [{ id: "p1", name: "Tester" }];

const predictions = [
  { match_id: "g1", player_id: "p1", home_score: 2, away_score: 0 },
  { match_id: "g2", player_id: "p1", home_score: 1, away_score: 0 },
  { match_id: "g3", player_id: "p1", home_score: 1, away_score: 0 },
  { match_id: "g4", player_id: "p1", home_score: 1, away_score: 0 },
  { match_id: "g5", player_id: "p1", home_score: 1, away_score: 0 },
  { match_id: "g6", player_id: "p1", home_score: 1, away_score: 0 },
  { match_id: "r32_m1", player_id: "p1", home_score: 2, away_score: 1 },
  { match_id: "final_m1", player_id: "p1", home_score: 1, away_score: 1 },
];

// Tercero elegido: A3 (que sí queda 3° real y entra a "mejores terceros").
const thirdPicks = [{ player_id: "p1", team_code: "A3" }];

// Cuadro: predice A1 gana r32 (+2) y A1 campeón en la final (+6).
const bracketPicks = [
  { player_id: "p1", slot_id: "r32_m1", round: "r32" as const, winner_team_code: "A1" },
  { player_id: "p1", slot_id: "final_m1", round: "final" as const, winner_team_code: "A1" },
];

const [totals] = computeTotals(players, matches, predictions, thirdPicks, bracketPicks, teams, params);
const detail = computePlayerDetail("p1", matches, predictions, thirdPicks, bracketPicks, teams);

const clasifSum = detail.clasificados.reduce((s, c) => s + c.points, 0);
const cuadroSum = detail.cuadro.reduce((s, c) => s + c.points, 0);

console.log("clasificados:", detail.clasificados);
console.log("cuadro:", detail.cuadro);

const checks: Array<[string, boolean]> = [
  ["clasificados_ready === true", detail.clasificados_ready === true],
  ["sum(clasificados.points) === totals.clasificados_points", clasifSum === totals.clasificados_points],
  ["sum(cuadro.points) === totals.cuadro_points", cuadroSum === totals.cuadro_points],
  ["clasificados tiene 3 filas (A1 1°, A2 2°, A3 tercero)", detail.clasificados.length === 3],
  [
    "A3 aparece como tercero, calificado",
    detail.clasificados.some((c) => c.team_code === "A3" && c.origin === "tercero" && c.qualified === true),
  ],
  [
    "pick r32_m1 -> A1 es hit +2",
    detail.cuadro.some((c) => c.slot_id === "r32_m1" && c.status === "hit" && c.points === 2),
  ],
  [
    "pick final_m1 -> A1 es hit +6 (campeón)",
    detail.cuadro.some((c) => c.slot_id === "final_m1" && c.status === "hit" && c.points === 6),
  ],
];

const ok = checks.every(([, pass]) => pass);
for (const [label, pass] of checks) {
  console.log(pass ? "✅" : "❌", label);
}
console.log(ok ? "✅ PASA" : "❌ FALLA");
if (!ok) process.exit(1);
