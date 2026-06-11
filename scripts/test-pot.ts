// Test del cálculo de la bolsa.  Corre:  npx tsx scripts/test-pot.ts
import {
  computePot,
  prizeAmounts,
  distributePrizes,
  isValidSplit,
  DEFAULT_SPLIT,
  type RankedPlayer,
} from "../src/lib/pot";

let failed = 0;
function check(name: string, cond: boolean, got?: unknown) {
  console.log(cond ? `✅ ${name}` : `❌ ${name}`, cond ? "" : got);
  if (!cond) failed++;
}

const r = (id: string, total: number): RankedPlayer => ({
  player_id: id,
  player_name: id,
  total,
});

// computePot
check("pot 400x17 = 6800", computePot(400, 17) === 6800, computePot(400, 17));
check("pot 0 jugadores = 0", computePot(400, 0) === 0);

// prizeAmounts
const amt = prizeAmounts(6800, DEFAULT_SPLIT);
check(
  "amounts 50/30/20 de 6800",
  amt.first === 3400 && amt.second === 2040 && amt.third === 1360,
  amt,
);

// isValidSplit
check("split 50/30/20 válido", isValidSplit({ first: 50, second: 30, third: 20 }));
check("split 50/30/30 inválido", !isValidSplit({ first: 50, second: 30, third: 30 }));

// distribute sin empate
const a1 = distributePrizes(6800, DEFAULT_SPLIT, [r("a", 10), r("b", 8), r("c", 5)]);
check(
  "sin empate: 3 awards de 1 ganador",
  a1.length === 3 &&
    a1[0].winners[0].player_id === "a" && a1[0].amountPerWinner === 3400 &&
    a1[1].winners[0].player_id === "b" && a1[1].amountPerWinner === 2040 &&
    a1[2].winners[0].player_id === "c" && a1[2].amountPerWinner === 1360,
  a1,
);

// empate en 1°
const a2 = distributePrizes(6800, DEFAULT_SPLIT, [r("a", 10), r("b", 10), r("c", 8)]);
check(
  "empate 1°: a,b reparten 80% (2720 c/u); c 3° 1360",
  a2.length === 2 &&
    a2[0].places.join("-") === "1-2" &&
    a2[0].winners.length === 2 && a2[0].amountPerWinner === 2720 &&
    a2[1].places.join("-") === "3" && a2[1].amountPerWinner === 1360,
  a2,
);

// empate en 3°
const a3 = distributePrizes(6800, DEFAULT_SPLIT, [r("a", 10), r("b", 8), r("c", 8)]);
check(
  "empate 3°: a 1° 3400; b,c reparten 50% (1700 c/u)",
  a3.length === 2 &&
    a3[0].amountPerWinner === 3400 &&
    a3[1].places.join("-") === "2-3" &&
    a3[1].winners.length === 2 && a3[1].amountPerWinner === 1700,
  a3,
);

// triple empate en 1°
const a4 = distributePrizes(6800, DEFAULT_SPLIT, [r("a", 10), r("b", 10), r("c", 10), r("d", 5)]);
check(
  "triple empate 1°: a,b,c reparten 100% (2267 c/u); d nada",
  a4.length === 1 &&
    a4[0].places.join("-") === "1-2-3" &&
    a4[0].winners.length === 3 && a4[0].amountPerWinner === 2267,
  a4,
);

// nadie con puntos
check("sin puntos: awards vacío", distributePrizes(6800, DEFAULT_SPLIT, [r("a", 0)]).length === 0);

console.log(failed === 0 ? "\n✅ TODO PASA" : `\n❌ ${failed} fallas`);
if (failed > 0) process.exit(1);
