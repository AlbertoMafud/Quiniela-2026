# Desglose de puntaje por jugador — Diseño

> Fecha: 2026-07-02 · Estado: aprobado (Alberto) · Diseñado y probado en local, cero cambios a prod hasta aprobar despliegue.

## Objetivo

Los jugadores no entienden cómo se ganan los puntos, en particular Clasificados
(+1 por equipo que de verdad pasó de tus 32) y Cuadro (bono 2/3/4/5/6 por ronda,
que se acumula CON Clasificados: 16avos = 1+2 = 3 total, no 2). `/ranking` ya
muestra tu propio pick + puntos por partido de Grupos y Eliminatorias, pero:
- No desglosa Clasificados ni Cuadro (solo el total en la tabla general).
- Solo se puede ver el desglose de uno mismo, no el de otros jugadores.

## Principio de arquitectura

- **Cero cambio a la lógica de puntos ya validada** (`computeTotals`,
  `scoreMatch`, `CUADRO_BONUS`). Solo se agrega una función de detalle que
  reusa las mismas fuentes de verdad, en paralelo.
- **Cero migraciones de esquema.** Todo el detalle se deriva de datos que ya
  existen (`matches`, `predictions`, `third_picks`, `bracket_picks`).
- Riesgo de datos: 🟢 nulo (solo lectura + presentación nueva).
- Extiende `/ranking` (no pestaña nueva en el nav) — decisión de Alberto: la
  tabla general ya compara a todos; el detalle vive debajo, por jugador
  seleccionado.

## Refactor previo (extracción, sin cambiar comportamiento)

`computeTotals` hoy calcula internamente y de forma privada:
`realQualifiers` (los 32 reales de clasificados), `advancerByMatch` (avanzador
real de cada partido KO) y `groupStageComplete`. Se extraen a una función
exportada `computeReality(matches, teams)` que devuelve los tres, y
`computeTotals` pasa a consumirla. Así `computePlayerDetail` (nuevo) usa
exactamente la misma reconstrucción de "qué pasó de verdad", sin duplicar
lógica ni arriesgar que diverja.

```ts
export function computeReality(
  matches: MatchData[],
  teams: TeamInfo[],
): {
  groupStageComplete: boolean;
  realQualifiers: Set<string>;       // 32 equipos que de verdad pasaron a 16avos
  advancerByMatch: Map<string, string>; // match.id (KO) -> team_code que avanzó
};
```

## `src/lib/ranking-calculator.ts` — nueva función `computePlayerDetail`

```ts
export interface ClasificadoPickDetail {
  team_code: string;
  team_name: string;
  flag_emoji: string | null;
  origin: "1" | "2" | "tercero";  // 1°/2° de TU tabla predicha, o tercero elegido
  group_letter: string;
  qualified: boolean;             // ¿pasó de verdad a 16avos?
  points: 0 | 1;
}

export interface CuadroPickDetail {
  round: Round;
  slot_id: string;
  home_name: string;              // display del partido real en ese slot
  away_name: string;
  picked_team_code: string;
  picked_team_name: string;
  status: "hit" | "miss" | "pending"; // pending = el partido de ese slot no se ha jugado
  points: number;                 // 0 o CUADRO_BONUS[round]
}

export interface PlayerDetail {
  clasificados_ready: boolean;    // = groupStageComplete; si false, sección vacía + aviso
  clasificados: ClasificadoPickDetail[]; // tus 32 (hasta 24 de grupo + 8 terceros)
  cuadro: CuadroPickDetail[];     // uno por cada bracket_pick con winner_team_code set
}

export function computePlayerDetail(
  playerId: string,
  matches: MatchData[],
  predictions: PredictionData[],
  thirdPicks: ThirdPickData[],
  bracketPicks: BracketPickData[],
  teams: TeamInfo[],
): PlayerDetail;
```

**Clasificados:** reconstruye `myStandings` del jugador igual que
`computeTotals` (vía `computeStandings` con sus `predictions` de grupo), toma
1°/2° de cada grupo + sus `third_picks`, y por cada uno marca `qualified` con
`realQualifiers.has(code)`. Si `!groupStageComplete`, devuelve
`{ clasificados_ready: false, clasificados: [] }`.

**Cuadro:** por cada `bracketPicks` del jugador con `winner_team_code` no nulo,
busca el match real de ese `slot_id` (mismo id que `matches.id` en las rondas
KO) para mostrar el partido y resolver `status` vía `advancerByMatch`:
sin entrada → `"pending"`; entrada === pick → `"hit"` (+`CUADRO_BONUS[round]`);
si no → `"miss"` (0 pts).

**Invariante de prueba:** `sum(clasificados[].points) === clasificados_points`
y `sum(cuadro[].points) === cuadro_points` de `computeTotals` para el mismo
jugador — garantiza que el detalle y el total nunca se desincronizan.

## UI — `/ranking`

### Selector de jugador

Nuevo client component `_components/player-select.tsx`: `<select>` nativo con
todos los jugadores (ordenados igual que la tabla general), navega vía
`router.push(`/ranking?jugador=${id}`)` al cambiar. Default: `session.playerId`
si no hay `?jugador=` en la URL, o si el id no existe entre los jugadores.

`SummaryTable`: cada fila de jugador se vuelve un link a `/ranking?jugador=<id>`
(además del selector — ambos escriben el mismo query param, decisión de
Alberto de dar las dos formas de elegir).

### Tabla general

Sin cambios de cálculo. Solo se agrega el link por fila mencionado arriba.

### Sección "Detalle de {nombre}"

Nueva sección con 4 sub-bloques, en este orden: Grupos, Eliminatorias,
Clasificados, Cuadro.

- **Grupos / Eliminatorias:** reusan `GroupBreakdown` / `RoundBreakdown` tal
  cual existen hoy. Único cambio: la página ya no construye
  `myPicksByMatch` fijo a `session.playerId`, sino a `selectedPlayerId`
  (viene de `computeTotals`/predicciones filtradas por ese jugador en vez de
  la sesión). El label interno "Tu pick" pasa a "Pick de {nombre}" cuando
  `selectedPlayerId !== session.playerId`.
- **Clasificados (nuevo)** `_components/clasificados-breakdown.tsx`: lista los
  picks del jugador agrupados por grupo (A..L), cada fila con bandera, nombre,
  origen ("1° de tu tabla" / "2° de tu tabla" / "Tercero elegido"), badge
  ✓ Pasó +1 / ✗ No pasó · 0. Si `!clasificados_ready`: card con aviso "Se
  calcula cuando termine la fase de grupos real."
- **Cuadro (nuevo)** `_components/cuadro-breakdown.tsx`: acordeón por ronda
  (mismo patrón visual que `RoundBreakdown`, `ROUND_LABELS`), cada fila:
  partido real del slot, equipo picked, badge según `status`
  (✓ Avanzó +N / ✗ No avanzó · 0 / ⏳ Pendiente), pts de ESA ronda. Nota fija
  arriba de la sección (no por ronda): *"Clasificados te da el primer punto
  (+1) cuando ese equipo pasa 16avos. Cada ronda de Cuadro suma el bono de la
  ronda A LA QUE AVANZÓ: 16avos +2, octavos +3, cuartos +4, semis +5, campeón
  +6 — por eso un equipo que llega a semis te da 1+2+3+4+5 = 15 puntos en
  total, no solo el bono de semis."*

## Fuera de alcance

- Cambiar la fórmula de puntos (ya validada, [[project_scoring_model]]).
- Notificaciones o resúmenes fuera de `/ranking`.
- Exportar el desglose (PDF/imagen) — puede pedirse después.

## Pruebas

- `scripts/test-player-detail.ts` (`npx tsx`): reusa el fixture de
  `test-scoring.ts` (mismo `players/matches/predictions/thirdPicks/bracketPicks`)
  y valida: (a) `sum(clasificados[].points) === clasificados_points`,
  (b) `sum(cuadro[].points) === cuadro_points`, (c) casos concretos del
  fixture (A3 aparece con `origin: "tercero"`, `qualified: true`; pick
  `r32_m1`→A1 con `status: "hit", points: 2`; pick `final_m1`→A1 con
  `status: "hit", points: 6`).
- Manual en local (Supabase local con snapshot de prod ya copiado): abrir
  `/ranking`, cambiar selector a 3-4 jugadores distintos, confirmar que
  Clasificados/Cuadro suman igual que las columnas de la tabla general.
- `typecheck` + `eslint` limpios.

## Archivos tocados (resumen)

**Nuevos:** `src/app/(app)/ranking/_components/player-select.tsx`,
`src/app/(app)/ranking/_components/clasificados-breakdown.tsx`,
`src/app/(app)/ranking/_components/cuadro-breakdown.tsx`,
`scripts/test-player-detail.ts`.

**Modificados:** `src/lib/ranking-calculator.ts` (extrae `computeReality`,
agrega `computePlayerDetail`), `src/app/(app)/ranking/page.tsx` (lee
`?jugador=`, arma detalle del jugador seleccionado, renderiza las 4
subsecciones, agrega links en `SummaryTable`).
