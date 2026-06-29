// Penalización manual (2026-06-28): Rafis, Brian y Rafael M Zarate no llenaron
// a tiempo su marcador de Sudáfrica-Canadá (r32_m3, cerró 28-jun 13:00 CDMX).
// Para cuando lo llenen ya sabrán el resultado real, así que dejarlos elegir
// libremente en 16avos/octavos les daría una ventaja injusta frente a quienes
// sí arriesgaron su pronóstico antes del partido.
//
// Esta rama (r32_m3 + su octavos dependiente, r16_m2) queda "congelada" para
// ellos: no la pueden editar y nunca genera fila en `bracket_picks`, así que
// el bono de Cuadro de esas 2 rondas siempre da 0 (pierden 2+3=5 pts). En
// cuanto el partido real se carga en `matches`, la rama se resuelve sola con
// el resultado real (ver bracket/page.tsx) para que Cuartos en adelante se
// pueda elegir y puntuar normal.
export const CUADRO_FROZEN_BRANCH_PLAYER_IDS = new Set<string>([
  "87d6452d-ea68-41fe-a326-9a6e5a812a4e", // Rafis
  "304a269c-5ac6-41ec-b412-4917d5e035c5", // Brian
  "e6eab6e4-3a61-4fcc-a430-a586e44079d3", // Rafael M Zarate
]);

export const CUADRO_FROZEN_BRANCH_MATCH_IDS = ["r32_m3", "r16_m2"] as const;

export function isCuadroFrozenForPlayer(playerId: string): boolean {
  return CUADRO_FROZEN_BRANCH_PLAYER_IDS.has(playerId);
}
