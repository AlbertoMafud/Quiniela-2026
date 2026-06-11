// Manejo de huso horario del centro de México (CDMX) para inputs datetime-local.
// CDMX no observa horario de verano desde 2023 → offset fijo -06:00 (válido 2026).

export const MX_TZ = "America/Mexico_City";
const MX_OFFSET = "-06:00";

/** "YYYY-MM-DDTHH:mm" (pared de tiempo CDMX) -> ISO UTC del instante. */
export function cdmxInputToUtcISO(localValue: string): string {
  const withSeconds = localValue.length === 16 ? `${localValue}:00` : localValue;
  return new Date(`${withSeconds}${MX_OFFSET}`).toISOString();
}

/** ISO (instante) -> "YYYY-MM-DDTHH:mm" en hora CDMX, para poblar datetime-local. */
export function utcISOToCdmxInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MX_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  let hour = get("hour");
  if (hour === "24") hour = "00"; // algunos runtimes devuelven "24" para medianoche
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}
