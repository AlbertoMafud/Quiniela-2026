// Test de la resolución de cierres.  Corre:  npx tsx scripts/test-gates.ts
import {
  normalizeOverride,
  resolveStageGate,
  resolveRegistration,
} from "../src/lib/gates";

let failed = 0;
function check(name: string, cond: boolean, got?: unknown) {
  console.log(cond ? `✅ ${name}` : `❌ ${name}`, cond ? "" : got);
  if (!cond) failed++;
}

const now = new Date("2026-06-11T12:00:00Z");
const past = "2026-06-11T11:00:00Z";
const future = "2026-06-11T13:00:00Z";

// normalizeOverride
check("normalize open", normalizeOverride("open") === "open");
check("normalize basura -> auto", normalizeOverride("xx") === "auto");
check("normalize undefined -> auto", normalizeOverride(undefined) === "auto");

// resolveStageGate
check("closed bloquea", resolveStageGate("closed", future, now).editable === false);
check("open permite aun con deadline pasado", resolveStageGate("open", past, now).editable === true);
check("auto antes del deadline permite", resolveStageGate("auto", future, now).editable === true);
check("auto tras deadline bloquea", resolveStageGate("auto", past, now).editable === false);
check("auto sin deadline permite", resolveStageGate("auto", null, now).editable === true);

// resolveRegistration
check("reg closed -> cerrado", resolveRegistration("closed", future, now).open === false);
check("reg open -> abierto", resolveRegistration("open", past, now).open === true);
check("reg auto antes de inicio -> abierto", resolveRegistration("auto", future, now).open === true);
check("reg auto tras inicio -> cerrado", resolveRegistration("auto", past, now).open === false);
check("reg auto sin fecha -> abierto", resolveRegistration("auto", null, now).open === true);

console.log(failed === 0 ? "\n✅ TODO PASA" : `\n❌ ${failed} fallas`);
if (failed > 0) process.exit(1);
