// Lógica pura de la bolsa: monto total y reparto de premios con empates.
// Sin red ni server-only → testeable con `npx tsx scripts/test-pot.ts`.

export type Split = { first: number; second: number; third: number };

export type RankedPlayer = {
  player_id: string;
  player_name: string;
  total: number;
};

export type PrizeAward = {
  places: number[];          // posiciones consecutivas que cubre (1..3)
  pct: number;               // suma de % de esas posiciones
  amountTotal: number;       // monto del bloque (redondeado)
  amountPerWinner: number;   // monto por ganador (empate dividido)
  winners: RankedPlayer[];
};

export const DEFAULT_CUOTA = 400;
export const DEFAULT_SPLIT: Split = { first: 50, second: 30, third: 20 };

/** Bolsa total = cuota * número de jugadores. */
export function computePot(cuota: number, numPlayers: number): number {
  const c = Number.isFinite(cuota) && cuota > 0 ? cuota : 0;
  const n = Number.isFinite(numPlayers) && numPlayers > 0 ? numPlayers : 0;
  return c * n;
}

/** Los 3 porcentajes deben sumar exactamente 100. */
export function isValidSplit(split: Split): boolean {
  const ok = (x: number) => Number.isFinite(x) && x >= 0;
  return (
    ok(split.first) && ok(split.second) && ok(split.third) &&
    split.first + split.second + split.third === 100
  );
}

/** Montos estáticos por posición (sin considerar empates). */
export function prizeAmounts(
  total: number,
  split: Split,
): { first: number; second: number; third: number } {
  return {
    first: Math.round((total * split.first) / 100),
    second: Math.round((total * split.second) / 100),
    third: Math.round((total * split.third) / 100),
  };
}

/**
 * Reparte la bolsa entre 1°/2°/3°, con empates divididos en partes iguales.
 * Agrupa por `total` igual; cada grupo ocupa posiciones consecutivas y se lleva
 * la suma de los % de las posiciones premiadas (1-3) que abarca, dividida en
 * partes iguales. Devuelve solo los bloques que reciben dinero (orden desc).
 */
export function distributePrizes(
  total: number,
  split: Split,
  ranked: RankedPlayer[],
): PrizeAward[] {
  const pctByPlace: Record<number, number> = {
    1: split.first,
    2: split.second,
    3: split.third,
  };

  const contenders = ranked
    .filter((r) => r.total > 0)
    .slice()
    .sort((a, b) => b.total - a.total);
  if (contenders.length === 0) return [];

  // Agrupar por total igual.
  const groups: RankedPlayer[][] = [];
  for (const r of contenders) {
    const last = groups[groups.length - 1];
    if (last && last[0].total === r.total) last.push(r);
    else groups.push([r]);
  }

  const awards: PrizeAward[] = [];
  let position = 1;
  for (const group of groups) {
    if (position > 3) break;
    const places: number[] = [];
    for (let i = 0; i < group.length; i++) {
      const place = position + i;
      if (place <= 3) places.push(place);
    }
    if (places.length > 0) {
      const pct = places.reduce((s, p) => s + (pctByPlace[p] ?? 0), 0);
      const amountTotal = Math.round((total * pct) / 100);
      const amountPerWinner = Math.round(amountTotal / group.length);
      awards.push({ places, pct, amountTotal, amountPerWinner, winners: group });
    }
    position += group.length;
  }

  return awards;
}
