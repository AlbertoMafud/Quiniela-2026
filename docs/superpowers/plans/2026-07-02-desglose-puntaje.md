# Desglose de puntaje por jugador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cualquiera puede ver, para cualquier jugador, de dónde salen exactamente sus puntos: Grupos, Eliminatorias, Clasificados (+1 por equipo que pasó de verdad) y Cuadro (bono 2/3/4/5/6 por ronda, acumulado con Clasificados).

**Architecture:** Extiende `/ranking` (server component). Nueva función pura `computePlayerDetail` en `src/lib/ranking-calculator.ts` reusa la misma reconstrucción de "qué pasó de verdad" que ya usa `computeTotals` (extraída a `computeReality`, cero cambio de comportamiento). Tres componentes de presentación nuevos + un selector de jugador vía query param `?jugador=`.

**Tech Stack:** Next.js 16 (App Router, server components), TypeScript, Supabase (Postgres local para pruebas — snapshot de prod ya cargado, prod jamás se toca), Tailwind v4. Pruebas de lógica: scripts standalone (`npx tsx scripts/*.ts`), mismo patrón que `test-scoring.ts`. No hay framework de test de componentes en este repo — los componentes nuevos se verifican con `typecheck` + revisión manual en el navegador (localhost), igual que el resto de `/ranking` hoy.

---

## Task 1: `computeReality` + `computePlayerDetail` en `ranking-calculator.ts`

**Files:**
- Modify: `src/lib/ranking-calculator.ts`
- Test: `scripts/test-player-detail.ts`

- [ ] **Step 1: Escribe el test que falla**

Crea `scripts/test-player-detail.ts`:

```ts
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
```

- [ ] **Step 2: Corre el test, confirma que falla**

Run: `npx tsx scripts/test-player-detail.ts`
Expected: error en tiempo de ejecución tipo `computePlayerDetail is not a function` (el símbolo no existe todavía en `ranking-calculator.ts`).

- [ ] **Step 3: Extrae `computeReality` (sin cambiar comportamiento)**

En `src/lib/ranking-calculator.ts`, busca este bloque dentro de `computeTotals` (justo después de `const matchesById = new Map(matches.map((m) => [m.id, m]));`):

```ts
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
```

Reemplázalo por:

```ts
  const { groupStageComplete, realQualifiers, advancerByMatch } = computeReality(matches, teams);
```

Justo **antes** de `export function computeTotals(` agrega la función extraída:

```ts
/**
 * Reconstruye "qué pasó de verdad": si la fase de grupos real ya terminó, el
 * set de los 32 equipos que clasificaron (1°/2° de cada grupo real + 8
 * mejores terceros reales), y el avanzador real de cada partido de
 * eliminatoria (empate a 90' → penalty_winner). Usada tanto por
 * `computeTotals` (agregados) como por `computePlayerDetail` (desglose) para
 * que nunca diverjan.
 */
export function computeReality(
  matches: MatchData[],
  teams: TeamInfo[],
): {
  groupStageComplete: boolean;
  realQualifiers: Set<string>;
  advancerByMatch: Map<string, string>;
} {
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

  return { groupStageComplete, realQualifiers, advancerByMatch };
}

```

- [ ] **Step 4: Agrega `computePlayerDetail` y sus tipos**

Al **final** de `src/lib/ranking-calculator.ts` (después del cierre de `computeTotals`), agrega:

```ts

export interface ClasificadoPickDetail {
  team_code: string;
  group_letter: string;
  origin: "1" | "2" | "tercero"; // 1°/2° de TU tabla predicha, o tercero elegido
  qualified: boolean; // ¿pasó de verdad a 16avos?
  points: 0 | 1;
}

export interface CuadroPickDetail {
  round: Round;
  slot_id: string;
  home_team_code: string | null;
  away_team_code: string | null;
  picked_team_code: string;
  status: "hit" | "miss" | "pending"; // pending = el partido de ese slot no se ha jugado
  points: number;
}

export interface PlayerDetail {
  clasificados_ready: boolean; // = groupStageComplete
  clasificados: ClasificadoPickDetail[];
  cuadro: CuadroPickDetail[];
}

const ROUND_ORDER: Record<Round, number> = { r32: 0, r16: 1, qf: 2, sf: 3, final: 4 };

/**
 * Desglose de puntaje de UN jugador: cada pick de Clasificados y de Cuadro
 * con su resultado individual. `sum(clasificados[].points)` y
 * `sum(cuadro[].points)` deben ser siempre iguales a `clasificados_points` y
 * `cuadro_points` de `computeTotals` para ese mismo jugador (misma fuente de
 * verdad vía `computeReality`).
 */
export function computePlayerDetail(
  playerId: string,
  matches: MatchData[],
  predictions: PredictionData[],
  thirdPicks: ThirdPickData[],
  bracketPicks: BracketPickData[],
  teams: TeamInfo[],
): PlayerDetail {
  const matchesById = new Map(matches.map((m) => [m.id, m]));
  const { groupStageComplete, realQualifiers, advancerByMatch } = computeReality(matches, teams);

  const clasificados: ClasificadoPickDetail[] = [];
  if (groupStageComplete) {
    const seen = new Set<string>();
    const push = (
      team_code: string,
      group_letter: string,
      origin: ClasificadoPickDetail["origin"],
    ) => {
      if (seen.has(team_code)) return;
      seen.add(team_code);
      const qualified = realQualifiers.has(team_code);
      clasificados.push({ team_code, group_letter, origin, qualified, points: qualified ? 1 : 0 });
    };

    const myGroupScores: MatchScore[] = [];
    for (const p of predictions) {
      if (p.player_id !== playerId) continue;
      const m = matchesById.get(p.match_id);
      if (!m || m.stage !== "group" || !m.home_team_code || !m.away_team_code) continue;
      myGroupScores.push({
        home_team_code: m.home_team_code,
        away_team_code: m.away_team_code,
        home_score: p.home_score,
        away_score: p.away_score,
      });
    }
    const myStandings = computeStandings(teams, myGroupScores);
    for (const s of myStandings) {
      if (s.position === 1) push(s.team_code, s.group_letter, "1");
      else if (s.position === 2) push(s.team_code, s.group_letter, "2");
    }
    for (const t of thirdPicks) {
      if (t.player_id !== playerId) continue;
      const team = teams.find((tt) => tt.code === t.team_code);
      push(t.team_code, team?.group_letter ?? "", "tercero");
    }
  }

  const cuadro: CuadroPickDetail[] = [];
  for (const b of bracketPicks) {
    if (b.player_id !== playerId) continue;
    if (!b.winner_team_code) continue;
    const m = matchesById.get(b.slot_id);
    const adv = advancerByMatch.get(b.slot_id);
    const status: CuadroPickDetail["status"] =
      adv === undefined ? "pending" : adv === b.winner_team_code ? "hit" : "miss";
    const points = status === "hit" ? CUADRO_BONUS[b.round] ?? 0 : 0;
    cuadro.push({
      round: b.round,
      slot_id: b.slot_id,
      home_team_code: m?.home_team_code ?? null,
      away_team_code: m?.away_team_code ?? null,
      picked_team_code: b.winner_team_code,
      status,
      points,
    });
  }
  cuadro.sort((a, b) => ROUND_ORDER[a.round] - ROUND_ORDER[b.round]);

  return { clasificados_ready: groupStageComplete, clasificados, cuadro };
}
```

- [ ] **Step 5: Corre el test, confirma que pasa**

Run: `npx tsx scripts/test-player-detail.ts`
Expected: las 7 líneas con ✅ y `✅ PASA` al final (exit code 0).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ranking-calculator.ts scripts/test-player-detail.ts
git commit -m "feat: computePlayerDetail — desglose de Clasificados y Cuadro por jugador"
```

---

## Task 2: Componente `PlayerSelect`

**Files:**
- Create: `src/app/(app)/ranking/_components/player-select.tsx`

- [ ] **Step 1: Crea el componente**

```tsx
"use client";

import { useRouter } from "next/navigation";

export interface PlayerOption {
  id: string;
  name: string;
}

interface Props {
  players: PlayerOption[];
  selectedId: string;
}

export function PlayerSelect({ players, selectedId }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="player-select" className="text-[var(--color-text-muted)] whitespace-nowrap">
        Viendo a
      </label>
      <select
        id="player-select"
        value={selectedId}
        onChange={(e) => router.push(`/ranking?jugador=${e.target.value}`)}
        className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2"
      >
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores (el componente aún no se usa en ningún lado, pero debe compilar solo).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/ranking/_components/player-select.tsx"
git commit -m "feat: componente PlayerSelect para /ranking"
```

---

## Task 3: Componente `ClasificadosBreakdown`

**Files:**
- Create: `src/app/(app)/ranking/_components/clasificados-breakdown.tsx`

- [ ] **Step 1: Crea el componente**

```tsx
"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClasificadoRow {
  team_code: string;
  team_name: string;
  flag_emoji: string | null;
  group_letter: string;
  origin: "1" | "2" | "tercero";
  qualified: boolean;
  points: 0 | 1;
}

const ORIGIN_LABEL: Record<ClasificadoRow["origin"], string> = {
  "1": "1° de tu tabla",
  "2": "2° de tu tabla",
  tercero: "Tercero elegido",
};

interface Props {
  ready: boolean;
  rows: ClasificadoRow[];
  defaultOpen?: boolean;
}

export function ClasificadosBreakdown({ ready, rows, defaultOpen = false }: Props) {
  const [open, setOpen] = React.useState(defaultOpen);
  const total = rows.reduce((s, r) => s + r.points, 0);

  if (!ready) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-5 py-4 text-sm text-[var(--color-text-muted)]">
        <span className="font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)] mr-2">
          Clasificados
        </span>
        — se calcula cuando termine la fase de grupos real.
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-2)] transition-colors"
        aria-expanded={open}
      >
        <span className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold text-[var(--color-text)]">
          Clasificados
        </span>
        <span className="ml-auto inline-flex items-center gap-3 text-sm text-[var(--color-text-muted)] tabular-nums">
          {total} pts
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {rows.map((r) => (
            <div key={r.team_code} className="px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap">
              <span className="flex-1 min-w-0 text-sm font-medium truncate">
                {r.flag_emoji ?? "🏳️"} {r.team_name}
                <span className="ml-2 text-xs text-[var(--color-text-subtle)]">
                  Grupo {r.group_letter} · {ORIGIN_LABEL[r.origin]}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center px-1.5 h-5 rounded-full text-[10px] font-bold",
                  r.qualified
                    ? "bg-[var(--color-success)] text-white"
                    : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)]",
                )}
              >
                {r.qualified ? "✓ Pasó" : "✗ No pasó"} · +{r.points}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="px-4 sm:px-5 py-3 text-sm text-[var(--color-text-muted)]">
              Este jugador no eligió terceros ni tiene pronóstico de grupos.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/ranking/_components/clasificados-breakdown.tsx"
git commit -m "feat: componente ClasificadosBreakdown para /ranking"
```

---

## Task 4: Componente `CuadroBreakdown`

**Files:**
- Create: `src/app/(app)/ranking/_components/cuadro-breakdown.tsx`

- [ ] **Step 1: Crea el componente**

```tsx
"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUND_LABELS, type Round } from "@/lib/bracket-structure";

export interface CuadroRow {
  slot_id: string;
  home_name: string;
  home_emoji: string | null;
  away_name: string;
  away_emoji: string | null;
  picked_name: string;
  picked_emoji: string | null;
  status: "hit" | "miss" | "pending";
  points: number;
}

interface Props {
  rowsByRound: Record<Round, CuadroRow[]>;
  defaultOpenRound?: Round | null;
}

const ROUNDS_ORDER: Round[] = ["r32", "r16", "qf", "sf", "final"];

export function CuadroBreakdown({ rowsByRound, defaultOpenRound = null }: Props) {
  const hasAny = ROUNDS_ORDER.some((r) => rowsByRound[r].length > 0);

  if (!hasAny) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-5 py-4 text-sm text-[var(--color-text-muted)]">
        <span className="font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)] mr-2">
          Cuadro
        </span>
        — aún no hay picks de cuadro guardados.
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-tint)] px-4 sm:px-5 py-3 text-xs sm:text-sm text-[var(--color-text-muted)]">
        Clasificados te da el primer punto (+1) cuando ese equipo pasa 16avos.
        Cada ronda de Cuadro suma el bono de la ronda <strong>a la que avanzó</strong>:
        16avos +2, octavos +3, cuartos +4, semis +5, campeón +6 — por eso un
        equipo que llega a semis te da 1+2+3+4+5 = <strong>15 puntos</strong> en
        total, no solo el bono de semis.
      </section>

      {ROUNDS_ORDER.map((round) => (
        <CuadroRoundSection
          key={round}
          round={round}
          rows={rowsByRound[round]}
          defaultOpen={defaultOpenRound === round}
        />
      ))}
    </div>
  );
}

function CuadroRoundSection({
  round,
  rows,
  defaultOpen,
}: {
  round: Round;
  rows: CuadroRow[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.points, 0);

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-2)] transition-colors"
        aria-expanded={open}
      >
        <span className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold text-[var(--color-text)]">
          {ROUND_LABELS[round]}
        </span>
        <span className="ml-auto inline-flex items-center gap-3 text-sm text-[var(--color-text-muted)] tabular-nums">
          {total} pts
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {rows.map((r) => (
            <div key={r.slot_id} className="px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap">
              <span className="flex-1 min-w-0 text-xs text-[var(--color-text-subtle)] truncate">
                {r.home_emoji ?? "🏳️"} {r.home_name} vs {r.away_name} {r.away_emoji ?? "🏳️"}
              </span>
              <span className="text-sm font-medium">
                Pick: {r.picked_emoji ?? "🏳️"} {r.picked_name}
              </span>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center px-1.5 h-5 rounded-full text-[10px] font-bold",
                  r.status === "hit"
                    ? "bg-[var(--color-success)] text-white"
                    : r.status === "pending"
                      ? "bg-[var(--color-warning)] text-black"
                      : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)]",
                )}
              >
                {r.status === "hit"
                  ? `✓ Avanzó · +${r.points}`
                  : r.status === "pending"
                    ? "⏳ Pendiente"
                    : "✗ No avanzó · 0"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/ranking/_components/cuadro-breakdown.tsx"
git commit -m "feat: componente CuadroBreakdown para /ranking"
```

---

## Task 5: Conectar todo en `/ranking/page.tsx`

**Files:**
- Modify: `src/app/(app)/ranking/page.tsx`

- [ ] **Step 1: Actualiza los imports**

Busca:

```ts
import {
  computeTotals,
  type MatchData,
  type PredictionData,
  type PlayerData,
  type ThirdPickData,
  type BracketPickData,
  type TeamInfo,
} from "@/lib/ranking-calculator";
```

Reemplaza por:

```ts
import {
  computeTotals,
  computePlayerDetail,
  type MatchData,
  type PredictionData,
  type PlayerData,
  type ThirdPickData,
  type BracketPickData,
  type TeamInfo,
} from "@/lib/ranking-calculator";
```

Busca:

```ts
import { ROUND_LABELS, type Round } from "@/lib/bracket-structure";
```

Reemplaza por:

```ts
import { ROUND_LABELS, type Round } from "@/lib/bracket-structure";
import { PlayerSelect } from "./_components/player-select";
import { ClasificadosBreakdown, type ClasificadoRow } from "./_components/clasificados-breakdown";
import { CuadroBreakdown, type CuadroRow } from "./_components/cuadro-breakdown";
```

- [ ] **Step 2: Lee `?jugador=` de la URL**

Busca:

```ts
export default async function RankingPage() {
  const session = await getSession();
  if (!session) return null;
```

Reemplaza por:

```ts
export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ jugador?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { jugador } = await searchParams;
```

- [ ] **Step 3: Resuelve el jugador seleccionado y arma su detalle**

Busca:

```ts
  const teamsByCode = new Map(teamList.map((t) => [t.code, t]));

  // Construir mapa de MI pronóstico por match (para mostrar en breakdowns como info personal)
  const myPicksByMatch = new Map<string, GroupMyPick>();
  for (const p of predList) {
    if (p.player_id !== session.playerId) continue;
```

Reemplaza por:

```ts
  const teamsByCode = new Map(teamList.map((t) => [t.code, t]));

  const selectedPlayerId = playerList.some((p) => p.id === jugador)
    ? (jugador as string)
    : session.playerId;
  const selectedPlayer = playerList.find((p) => p.id === selectedPlayerId);
  const selectedPlayerName = selectedPlayer?.name ?? "—";
  const isViewingSelf = selectedPlayerId === session.playerId;

  // Construir mapa del pronóstico del jugador SELECCIONADO por match (no siempre el tuyo)
  const myPicksByMatch = new Map<string, GroupMyPick>();
  for (const p of predList) {
    if (p.player_id !== selectedPlayerId) continue;
```

Justo después del bloque que llena `myPicksByMatch` (busca el cierre `}` que sigue a `myPicksByMatch.set(p.match_id, {...});` y antes de `// Construir grupos con sus standings y matches`), agrega:

```ts

  const playerDetail = computePlayerDetail(
    selectedPlayerId,
    matchDataForCalc,
    predDataForCalc,
    thirdDataForCalc,
    bracketDataForCalc,
    teamDataForCalc,
  );

  const ORIGIN_ORDER: Record<ClasificadoRow["origin"], number> = { "1": 0, "2": 1, tercero: 2 };
  const clasificadoRows: ClasificadoRow[] = playerDetail.clasificados
    .map((c) => {
      const t = teamsByCode.get(c.team_code);
      return {
        team_code: c.team_code,
        team_name: t?.name ?? c.team_code,
        flag_emoji: t?.flag_emoji ?? null,
        group_letter: c.group_letter,
        origin: c.origin,
        qualified: c.qualified,
        points: c.points,
      };
    })
    .sort((a, b) => {
      if (a.group_letter !== b.group_letter) return a.group_letter.localeCompare(b.group_letter);
      return ORIGIN_ORDER[a.origin] - ORIGIN_ORDER[b.origin];
    });

  const cuadroRowsByRound: Record<Round, CuadroRow[]> = {
    r32: [],
    r16: [],
    qf: [],
    sf: [],
    final: [],
  };
  for (const c of playerDetail.cuadro) {
    const home = c.home_team_code ? teamsByCode.get(c.home_team_code) : undefined;
    const away = c.away_team_code ? teamsByCode.get(c.away_team_code) : undefined;
    const picked = teamsByCode.get(c.picked_team_code);
    cuadroRowsByRound[c.round].push({
      slot_id: c.slot_id,
      home_name: home?.name ?? c.home_team_code ?? "Por definir",
      home_emoji: home?.flag_emoji ?? null,
      away_name: away?.name ?? c.away_team_code ?? "Por definir",
      away_emoji: away?.flag_emoji ?? null,
      picked_name: picked?.name ?? c.picked_team_code,
      picked_emoji: picked?.flag_emoji ?? null,
      status: c.status,
      points: c.points,
    });
  }
  for (const round of Object.keys(cuadroRowsByRound) as Round[]) {
    cuadroRowsByRound[round].sort((a, b) =>
      a.slot_id.localeCompare(b.slot_id, undefined, { numeric: true }),
    );
  }
```

- [ ] **Step 4: Agrega el selector y las 2 secciones nuevas al JSX**

Busca:

```tsx
      <SummaryTable totals={totals} mePlayerId={session.playerId} />

      <EliminationsSection
```

Reemplaza por:

```tsx
      <SummaryTable
        totals={totals}
        mePlayerId={session.playerId}
        selectedPlayerId={selectedPlayerId}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)]">
          Detalle de {selectedPlayerName}
          {isViewingSelf && (
            <span className="ml-2 text-sm font-normal text-[var(--color-primary)]">(tú)</span>
          )}
        </h2>
        <PlayerSelect players={playerList} selectedId={selectedPlayerId} />
      </div>

      <EliminationsSection
```

Busca el final de la sección "Fase de grupos" — el cierre de esa `<section>` justo antes de `</div>\n  );\n}` que cierra el `return` de `RankingPage`:

```tsx
        })}
      </section>
    </div>
  );
}
```

(Ese patrón aparece una sola vez: es el cierre de `{groupLetters.map(...)}` seguido del cierre de `<section>` y del `<div>` raíz de la página.) Reemplázalo por:

```tsx
        })}
      </section>

      <ClasificadosBreakdown ready={playerDetail.clasificados_ready} rows={clasificadoRows} />

      <CuadroBreakdown rowsByRound={cuadroRowsByRound} />
    </div>
  );
}
```

- [ ] **Step 5: Actualiza `SummaryTable` — prop nueva + link por fila**

Busca:

```tsx
function SummaryTable({
  totals,
  mePlayerId,
}: {
  totals: Array<{
    player_id: string;
    player_name: string;
    group_points: number;
    clasificados_points: number;
    elim_points: number;
    cuadro_points: number;
    total: number;
    group_predictions_made: number;
    group_matches_played: number;
  }>;
  mePlayerId: string;
}) {
```

Reemplaza por:

```tsx
function SummaryTable({
  totals,
  mePlayerId,
  selectedPlayerId,
}: {
  totals: Array<{
    player_id: string;
    player_name: string;
    group_points: number;
    clasificados_points: number;
    elim_points: number;
    cuadro_points: number;
    total: number;
    group_predictions_made: number;
    group_matches_played: number;
  }>;
  mePlayerId: string;
  selectedPlayerId: string;
}) {
```

Busca:

```tsx
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center gap-2">
                        {podium ? (
                          <podium.Icon className="h-4 w-4 shrink-0" style={{ color: podium.color }} />
                        ) : (
                          <span className="w-4 h-4 shrink-0" />
                        )}
                        <span className={cn("truncate", isMe && "font-semibold")}>
                          {row.player_name}
                          {isMe && (
                            <span className="ml-1.5 text-xs text-[var(--color-primary)]">(tú)</span>
                          )}
                        </span>
                      </span>
                    </td>
```

Reemplaza por:

```tsx
                    <td className="py-3 px-2">
                      <Link
                        href={`/ranking?jugador=${row.player_id}`}
                        className="inline-flex items-center gap-2 hover:underline"
                      >
                        {podium ? (
                          <podium.Icon className="h-4 w-4 shrink-0" style={{ color: podium.color }} />
                        ) : (
                          <span className="w-4 h-4 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "truncate",
                            isMe && "font-semibold",
                            row.player_id === selectedPlayerId &&
                              "text-[var(--color-primary)] font-semibold",
                          )}
                        >
                          {row.player_name}
                          {isMe && (
                            <span className="ml-1.5 text-xs text-[var(--color-primary)]">(tú)</span>
                          )}
                        </span>
                      </Link>
                    </td>
```

- [ ] **Step 6: Typecheck y lint**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 7: Verifica en el navegador (local, Supabase local — prod no se toca)**

1. Confirma que el server de preview sigue corriendo contra `.env.development.local`
   (log debe decir `Environments: .env.development.local, .env.local`).
2. Recarga `/ranking`.
3. Confirma: la tabla general sigue mostrando a todos con sus 4 columnas de
   siempre. Aparece "Detalle de {tu nombre} (tú)" con el selector.
4. Cambia el selector a otro jugador (ej. "Adriana") → la URL cambia a
   `/ranking?jugador=<id>`, el encabezado cambia a "Detalle de Adriana" (sin
   "(tú)"), y Grupos/Eliminatorias muestran los picks de Adriana, no los tuyos.
5. Click en el nombre de un tercer jugador en la tabla general → mismo
   comportamiento, selector se actualiza a ese jugador.
6. Abre "Clasificados": lista con banderas, origen (1°/2°/tercero), badge
   ✓/✗ y puntaje. Suma total en el header del acordeón coincide con la
   columna "Clasificados" de la tabla general para ese jugador.
7. Abre "Cuadro": nota fija arriba explicando el acumulado, acordeones por
   ronda con partido real + pick + badge hit/miss/pending. Suma de todas las
   rondas coincide con la columna "Cuadro" de la tabla general para ese
   jugador.
8. Revisa consola del navegador: sin errores.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/ranking/page.tsx"
git commit -m "feat: selector de jugador + desglose de Clasificados y Cuadro en /ranking"
```

---

## Self-Review (hecho antes de entregar el plan)

- **Cobertura del spec:** selector de jugador (Task 5) ✓, filas clicables en
  tabla general (Task 5 Step 5) ✓, Grupos/Eliminatorias generalizados al
  jugador seleccionado (Task 5 Step 3) ✓, Clasificados nuevo (Task 3 + wiring)
  ✓, Cuadro nuevo con nota de acumulado (Task 4 + wiring) ✓, cero cambio a
  `computeTotals`/`scoreMatch`/`CUADRO_BONUS` (Task 1 solo extrae y agrega) ✓,
  invariante de suma probada (Task 1 Step 1/5) ✓.
- **Placeholders:** ninguno — todo el código de cada paso está completo.
- **Consistencia de tipos:** `ClasificadoPickDetail`/`CuadroPickDetail` (lib,
  Task 1) vs `ClasificadoRow`/`CuadroRow` (UI, Tasks 3/4) son intencionalmente
  distintos — el mapeo entre ambos vive en `page.tsx` (Task 5 Step 3), mismo
  patrón que ya usa el archivo hoy entre `MatchDB` y `UIMatchRow`. Nombres de
  props (`ready`, `rows`, `rowsByRound`, `selectedId`, `players`,
  `selectedPlayerId`) se usan igual en la definición del componente y en su
  invocación desde `page.tsx`.

## Fuera de alcance (igual que el spec)

- Cambiar la fórmula de puntos.
- Notificaciones o resúmenes fuera de `/ranking`.
- Exportar el desglose (PDF/imagen).
- Tocar producción (ni BD ni código) — todo este plan se ejecuta y verifica
  contra el Supabase **local** (`http://127.0.0.1:54331`, snapshot de prod ya
  cargado). Nada en este plan escribe hacia `pnhksmojtlcnujrozeny.supabase.co`.
