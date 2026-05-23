// Estructura del bracket FIFA 2026 (placeholder).
//
// 48 equipos, 12 grupos A..L. Avanzan top-2 de cada grupo (24) + 8 mejores
// terceros = 32 equipos a R32 → R16 (8) → QF (4) → SF (2) → Final (1).
//
// Las llaves específicas (qué slot va contra qué slot) deberían venir de la
// tabla oficial FIFA, pero la asignación de cada uno de los 8 terceros a los
// 8 huecos T1..T8 depende de cuáles grupos aporten terceros (495 combinaciones).
//
// Para v1 usamos un emparejamiento mecánico estable que mantiene la simetría
// del cuadro y permite al usuario llenar el bracket. Cuando FIFA publique la
// asignación oficial reemplazamos sin tocar la UI.

export type Round = "r32" | "r16" | "qf" | "sf" | "final";

export type SlotSource =
  | { type: "group_pos"; group: string; position: 1 | 2 } // ej. "1A", "2C"
  | { type: "third"; thirdSlot: number } // T1..T8 (orden en la lista del jugador)
  | { type: "winner_of"; matchId: string };

export interface BracketMatch {
  id: string;
  round: Round;
  left: SlotSource;
  right: SlotSource;
  next: string | null; // id del partido siguiente al que avanza el ganador
}

// ------ R32 ------
// 16 partidos. Pareo placeholder; ajustable luego sin tocar UI.
//
// Bloque A (m1..m8): 1A..1H vs T1..T8
// Bloque B (m9..m12): 1I..1L vs 2L..2I (cruzado)
// Bloque C (m13..m16): 2A..2D vs 2H..2E (cruzado)

const R32_MATCHUPS: Array<{ id: string; left: SlotSource; right: SlotSource }> = [
  { id: "r32_m1", left: { type: "group_pos", group: "A", position: 1 }, right: { type: "third", thirdSlot: 1 } },
  { id: "r32_m2", left: { type: "group_pos", group: "B", position: 1 }, right: { type: "third", thirdSlot: 2 } },
  { id: "r32_m3", left: { type: "group_pos", group: "C", position: 1 }, right: { type: "third", thirdSlot: 3 } },
  { id: "r32_m4", left: { type: "group_pos", group: "D", position: 1 }, right: { type: "third", thirdSlot: 4 } },
  { id: "r32_m5", left: { type: "group_pos", group: "E", position: 1 }, right: { type: "third", thirdSlot: 5 } },
  { id: "r32_m6", left: { type: "group_pos", group: "F", position: 1 }, right: { type: "third", thirdSlot: 6 } },
  { id: "r32_m7", left: { type: "group_pos", group: "G", position: 1 }, right: { type: "third", thirdSlot: 7 } },
  { id: "r32_m8", left: { type: "group_pos", group: "H", position: 1 }, right: { type: "third", thirdSlot: 8 } },
  { id: "r32_m9", left: { type: "group_pos", group: "I", position: 1 }, right: { type: "group_pos", group: "L", position: 2 } },
  { id: "r32_m10", left: { type: "group_pos", group: "J", position: 1 }, right: { type: "group_pos", group: "K", position: 2 } },
  { id: "r32_m11", left: { type: "group_pos", group: "K", position: 1 }, right: { type: "group_pos", group: "J", position: 2 } },
  { id: "r32_m12", left: { type: "group_pos", group: "L", position: 1 }, right: { type: "group_pos", group: "I", position: 2 } },
  { id: "r32_m13", left: { type: "group_pos", group: "A", position: 2 }, right: { type: "group_pos", group: "H", position: 2 } },
  { id: "r32_m14", left: { type: "group_pos", group: "B", position: 2 }, right: { type: "group_pos", group: "G", position: 2 } },
  { id: "r32_m15", left: { type: "group_pos", group: "C", position: 2 }, right: { type: "group_pos", group: "F", position: 2 } },
  { id: "r32_m16", left: { type: "group_pos", group: "D", position: 2 }, right: { type: "group_pos", group: "E", position: 2 } },
];

// ------ R16 ------ Empareja r32_m(2k-1) con r32_m(2k).
const R16_MATCHUPS = Array.from({ length: 8 }, (_, i) => ({
  id: `r16_m${i + 1}`,
  left: { type: "winner_of" as const, matchId: `r32_m${2 * i + 1}` },
  right: { type: "winner_of" as const, matchId: `r32_m${2 * i + 2}` },
}));

// ------ QF ------
const QF_MATCHUPS = Array.from({ length: 4 }, (_, i) => ({
  id: `qf_m${i + 1}`,
  left: { type: "winner_of" as const, matchId: `r16_m${2 * i + 1}` },
  right: { type: "winner_of" as const, matchId: `r16_m${2 * i + 2}` },
}));

// ------ SF ------
const SF_MATCHUPS = Array.from({ length: 2 }, (_, i) => ({
  id: `sf_m${i + 1}`,
  left: { type: "winner_of" as const, matchId: `qf_m${2 * i + 1}` },
  right: { type: "winner_of" as const, matchId: `qf_m${2 * i + 2}` },
}));

// ------ Final ------
const FINAL_MATCHUPS = [
  {
    id: "final_m1",
    left: { type: "winner_of" as const, matchId: "sf_m1" },
    right: { type: "winner_of" as const, matchId: "sf_m2" },
  },
];

function nextOf(round: Round, idx: number): string | null {
  if (round === "r32") return `r16_m${Math.floor(idx / 2) + 1}`;
  if (round === "r16") return `qf_m${Math.floor(idx / 2) + 1}`;
  if (round === "qf") return `sf_m${Math.floor(idx / 2) + 1}`;
  if (round === "sf") return `final_m1`;
  return null;
}

export const BRACKET_MATCHES: BracketMatch[] = [
  ...R32_MATCHUPS.map((m, i) => ({
    ...m,
    round: "r32" as const,
    next: nextOf("r32", i),
  })),
  ...R16_MATCHUPS.map((m, i) => ({
    ...m,
    round: "r16" as const,
    next: nextOf("r16", i),
  })),
  ...QF_MATCHUPS.map((m, i) => ({
    ...m,
    round: "qf" as const,
    next: nextOf("qf", i),
  })),
  ...SF_MATCHUPS.map((m, i) => ({
    ...m,
    round: "sf" as const,
    next: nextOf("sf", i),
  })),
  ...FINAL_MATCHUPS.map((m) => ({
    ...m,
    round: "final" as const,
    next: null,
  })),
];

export const MATCHES_BY_ROUND: Record<Round, BracketMatch[]> = {
  r32: BRACKET_MATCHES.filter((m) => m.round === "r32"),
  r16: BRACKET_MATCHES.filter((m) => m.round === "r16"),
  qf: BRACKET_MATCHES.filter((m) => m.round === "qf"),
  sf: BRACKET_MATCHES.filter((m) => m.round === "sf"),
  final: BRACKET_MATCHES.filter((m) => m.round === "final"),
};

export const ROUND_LABELS: Record<Round, string> = {
  r32: "16avos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  final: "Final",
};
