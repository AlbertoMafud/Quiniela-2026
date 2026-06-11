// Test del huso CDMX.  Corre:  npx tsx scripts/test-tz.ts
import { cdmxInputToUtcISO, utcISOToCdmxInput } from "../src/lib/tz";

let failed = 0;
function check(name: string, cond: boolean, got?: unknown) {
  console.log(cond ? `✅ ${name}` : `❌ ${name}`, cond ? "" : got);
  if (!cond) failed++;
}

// 11:00 CDMX = 17:00 UTC (offset -06:00).
const iso = cdmxInputToUtcISO("2026-06-11T11:00");
check("CDMX 11:00 -> 17:00Z", iso === "2026-06-11T17:00:00.000Z", iso);

// Round-trip de regreso.
const back = utcISOToCdmxInput("2026-06-11T17:00:00.000Z");
check("17:00Z -> CDMX 11:00", back === "2026-06-11T11:00", back);

// Vacío/nulo.
check("null -> ''", utcISOToCdmxInput(null) === "");

console.log(failed === 0 ? "\n✅ TODO PASA" : `\n❌ ${failed} fallas`);
if (failed > 0) process.exit(1);
