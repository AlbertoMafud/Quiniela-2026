// Resolución pura de cierres (sin red, sin server-only). Testeable con tsx.

export type StageOverride = "auto" | "open" | "closed";

/** Normaliza un valor de config a un StageOverride válido (default "auto"). */
export function normalizeOverride(v: unknown): StageOverride {
  return v === "open" || v === "closed" ? v : "auto";
}

/**
 * ¿Se puede editar esta etapa de pronóstico?
 * - "closed": no (gana sobre la fecha).
 * - "open": sí, aunque el cierre ya pasó (bypass).
 * - "auto": sí mientras no haya pasado el deadline.
 */
export function resolveStageGate(
  override: StageOverride,
  deadlineAt: string | null,
  now: Date,
): { editable: boolean; reason?: string } {
  if (override === "closed") {
    return { editable: false, reason: "El administrador cerró esta etapa." };
  }
  if (override === "open") {
    return { editable: true };
  }
  if (deadlineAt && new Date(deadlineAt) <= now) {
    return { editable: false, reason: "El cierre de esta etapa ya pasó." };
  }
  return { editable: true };
}

/**
 * ¿Está abierto el registro?
 * - "closed"/"open": fuerzan el estado.
 * - "auto": abierto mientras no llegue la fecha de inicio del torneo.
 */
export function resolveRegistration(
  override: StageOverride,
  startAt: string | null,
  now: Date,
): { open: boolean } {
  if (override === "closed") return { open: false };
  if (override === "open") return { open: true };
  if (startAt && new Date(startAt) <= now) return { open: false };
  return { open: true };
}
