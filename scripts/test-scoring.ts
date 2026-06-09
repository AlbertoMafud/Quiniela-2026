// Test manual del motor de puntos (no es parte del build).
// Corre:  npx tsx scripts/test-scoring.ts
import { computeTotals } from "../src/lib/ranking-calculator";

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

// Un grupo A con 4 equipos (round-robin de 6 partidos) + 2 partidos KO.
const teams = [
  { code: "A1", name: "A1", group_letter: "A" },
  { code: "A2", name: "A2", group_letter: "A" },
  { code: "A3", name: "A3", group_letter: "A" },
  { code: "A4", name: "A4", group_letter: "A" },
];

// Resultados REALES de grupos: A1 gana todo, A2 2°, A3 3°, A4 4°.
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

// Pronósticos de grupos: 5 exactos + 1 con ganador correcto pero marcador no
// (g1 real 1-0, predice 2-0 -> ganador correcto = 1 pt). Sigue prediciendo A1>A2.
const predictions = [
  { match_id: "g1", player_id: "p1", home_score: 2, away_score: 0 }, // ganador (1)
  { match_id: "g2", player_id: "p1", home_score: 1, away_score: 0 }, // exacto (3)
  { match_id: "g3", player_id: "p1", home_score: 1, away_score: 0 }, // exacto (3)
  { match_id: "g4", player_id: "p1", home_score: 1, away_score: 0 }, // exacto (3)
  { match_id: "g5", player_id: "p1", home_score: 1, away_score: 0 }, // exacto (3)
  { match_id: "g6", player_id: "p1", home_score: 1, away_score: 0 }, // exacto (3)
  // KO marcador: ambos exactos (3 + 3)
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

const [r] = computeTotals(
  players,
  matches,
  predictions,
  thirdPicks,
  bracketPicks,
  teams,
  params,
);

const expected = {
  group_points: 16, // 5x exacto (15) + 1x ganador (1)
  clasificados_points: 3, // A1, A2 (1°/2°) + A3 (tercero) — los 3 clasificaron
  elim_points: 6, // 2 marcadores KO exactos
  cuadro_points: 8, // r32 (+2) + final/campeón (+6)
  total: 33,
};

console.log("Resultado:", {
  group_points: r.group_points,
  clasificados_points: r.clasificados_points,
  elim_points: r.elim_points,
  cuadro_points: r.cuadro_points,
  total: r.total,
});
console.log("Esperado: ", expected);

const ok =
  r.group_points === expected.group_points &&
  r.clasificados_points === expected.clasificados_points &&
  r.elim_points === expected.elim_points &&
  r.cuadro_points === expected.cuadro_points &&
  r.total === expected.total;

console.log(ok ? "✅ PASA" : "❌ FALLA");
if (!ok) process.exit(1);
