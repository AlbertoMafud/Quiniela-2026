// Test manual de helpers de perfil (no es parte del build).
// Corre:  npx tsx scripts/test-profile.ts
import { nameSchema, namesEqualCI } from "../src/lib/profile";

let failed = 0;
function check(label: string, cond: boolean) {
  if (cond) {
    console.log(`  ok  ${label}`);
  } else {
    console.error(`FAIL  ${label}`);
    failed++;
  }
}

// namesEqualCI
check("mismas may/min son iguales", namesEqualCI("Pedro", "pedro"));
check("espacios al borde no cuentan", namesEqualCI("  Ana ", "ana"));
check("nombres distintos no son iguales", !namesEqualCI("Ana", "Anita"));

// nameSchema válido (recorta espacios)
const ok = nameSchema.safeParse("  Juan  ");
check("nombre válido pasa y se recorta", ok.success && ok.data === "Juan");

// nameSchema corto / largo
check("nombre < 3 chars falla", !nameSchema.safeParse("Jo").success);
check("nombre > 30 chars falla", !nameSchema.safeParse("x".repeat(31)).success);

if (failed > 0) {
  console.error(`\n${failed} prueba(s) fallaron.`);
  process.exit(1);
}
console.log("\nTodas las pruebas pasaron.");
