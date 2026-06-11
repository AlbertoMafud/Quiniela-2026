# Bolsa acumulada + cierres por etapa — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar la bolsa acumulada y su reparto (1°/2°/3° + quién va ganando) en el dashboard, y cerrar registros + edición de pronósticos por etapa con control manual del admin y huso horario de CDMX correcto.

**Architecture:** Toda la config nueva vive en `admin_config` (jsonb), sin migración de esquema. Lógica de cálculo (`pot.ts`), huso horario (`tz.ts`) y resolución de cierres (`gates.ts`) son funciones **puras** testeables con `npx tsx`; un módulo server (`gates-server.ts`) las conecta a la base. Las 4 server actions de pronósticos y la de registro consultan estos gates antes de escribir.

**Tech Stack:** Next.js 16 (App Router, Server Components + server actions), Supabase (service-role server-side), TypeScript, Zod, Tailwind v4. Tests: scripts `tsx` con asserts + `process.exit(1)` (no hay framework de test).

**Convenciones del repo (respetar):**
- Server actions en `_actions.ts` por carpeta de feature; `assertAdmin()` + `logAdminAction()` en acciones de admin.
- Server Components por default; `"use client"` solo con estado/eventos.
- Español en UI, sin pochismos. Commits convencionales + co-author de Claude.
- Verificación por tarea: `pnpm typecheck` y `pnpm lint` deben quedar limpios.

---

## Estructura de archivos

**Nuevos:**
- `src/lib/pot.ts` — cálculo puro de bolsa y reparto con empates.
- `src/lib/tz.ts` — conversión de huso CDMX ↔ UTC para inputs `datetime-local`.
- `src/lib/gates.ts` — resolvers puros de cierres (etapa + registro).
- `src/lib/gates-server.ts` — lectores server que combinan config + deadlines.
- `src/app/admin/bolsa/page.tsx`, `_actions.ts`, `_components/bolsa-form.tsx` — admin de bolsa.
- `scripts/test-pot.ts`, `scripts/test-tz.ts`, `scripts/test-gates.ts` — tests.
- `supabase/migrations/20260610000008_bolsa_gates_config.sql` — seed idempotente de config.

**Modificados:**
- `src/app/(app)/page.tsx` — card de Bolsa.
- `src/app/(app)/pronosticos/grupos/_actions.ts`, `terceros/_actions.ts`,
  `src/app/(app)/bracket/_actions.ts`, `pronosticos/bracket-inicio/_actions.ts` — usar gates.
- `src/app/(auth)/_actions.ts` — bloquear registro cerrado.
- `src/app/(auth)/login/page.tsx` (→ server wrapper) + nuevo `_components/login-client.tsx`.
- `src/app/admin/deadlines/page.tsx`, `_actions.ts`, `_components/deadlines-form.tsx` — tz + override por etapa + card de inicio/registro.
- `src/app/admin/_components/admin-nav.tsx` — link a Bolsa.

---

## Task 1: `src/lib/pot.ts` — cálculo puro de la bolsa

**Files:**
- Create: `src/lib/pot.ts`
- Test: `scripts/test-pot.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `scripts/test-pot.ts`:

```ts
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx tsx scripts/test-pot.ts`
Expected: FALLA con `Cannot find module '../src/lib/pot'`.

- [ ] **Step 3: Implementar `src/lib/pot.ts`**

```ts
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
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx tsx scripts/test-pot.ts`
Expected: `✅ TODO PASA`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pot.ts scripts/test-pot.ts
git commit -m "feat(pot): cálculo puro de bolsa y reparto con empates

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `src/lib/tz.ts` — huso horario CDMX

**Files:**
- Create: `src/lib/tz.ts`
- Test: `scripts/test-tz.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `scripts/test-tz.ts`:

```ts
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx tsx scripts/test-tz.ts`
Expected: FALLA con `Cannot find module '../src/lib/tz'`.

- [ ] **Step 3: Implementar `src/lib/tz.ts`**

```ts
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
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx tsx scripts/test-tz.ts`
Expected: `✅ TODO PASA`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tz.ts scripts/test-tz.ts
git commit -m "feat(tz): conversión datetime-local CDMX <-> UTC

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `src/lib/gates.ts` — resolvers puros de cierres

**Files:**
- Create: `src/lib/gates.ts`
- Test: `scripts/test-gates.ts`

- [ ] **Step 1: Escribir el test que falla**

Create `scripts/test-gates.ts`:

```ts
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
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx tsx scripts/test-gates.ts`
Expected: FALLA con `Cannot find module '../src/lib/gates'`.

- [ ] **Step 3: Implementar `src/lib/gates.ts`**

```ts
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
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx tsx scripts/test-gates.ts`
Expected: `✅ TODO PASA`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gates.ts scripts/test-gates.ts
git commit -m "feat(gates): resolvers puros de cierre por etapa y registro

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `src/lib/gates-server.ts` — lectores server

**Files:**
- Create: `src/lib/gates-server.ts`

> No tiene test tsx (usa `adminClient` + `server-only`). Se verifica con `typecheck` y, en tareas posteriores, en el navegador.

- [ ] **Step 1: Implementar `src/lib/gates-server.ts`**

```ts
import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import {
  normalizeOverride,
  resolveStageGate,
  resolveRegistration,
  type StageOverride,
} from "@/lib/gates";

interface ConfigRow {
  key: string;
  value: unknown;
}

async function readConfig(keys: string[]): Promise<Map<string, unknown>> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("admin_config")
    .select("key, value")
    .in("key", keys);
  return new Map(((data ?? []) as ConfigRow[]).map((r) => [r.key, r.value]));
}

function asStartString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Override manual de una etapa de pronóstico (desde admin_config.stage_overrides). */
export async function getStageOverride(stageKey: string): Promise<StageOverride> {
  const cfg = await readConfig(["stage_overrides"]);
  const raw = cfg.get("stage_overrides");
  const map = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return normalizeOverride(map[stageKey]);
}

/** Fecha de inicio del torneo (ISO) o null si no está configurada. */
export async function getTournamentStart(): Promise<string | null> {
  const cfg = await readConfig(["tournament_start_at"]);
  return asStartString(cfg.get("tournament_start_at"));
}

/** Editabilidad de una etapa: combina override + deadline de esa etapa. */
export async function checkStageEditable(
  stageKey: string,
): Promise<{ editable: boolean; reason?: string; override: StageOverride }> {
  const supabase = adminClient();
  const [{ data: deadline }, override] = await Promise.all([
    supabase
      .from("deadlines")
      .select("deadline_at")
      .eq("stage", stageKey)
      .maybeSingle<{ deadline_at: string }>(),
    getStageOverride(stageKey),
  ]);
  const res = resolveStageGate(override, deadline?.deadline_at ?? null, new Date());
  return { ...res, override };
}

/** ¿Registro abierto ahora? Combina registration_override + tournament_start_at. */
export async function isRegistrationOpen(now: Date = new Date()): Promise<boolean> {
  const cfg = await readConfig(["registration_override", "tournament_start_at"]);
  const override = normalizeOverride(cfg.get("registration_override"));
  const startAt = asStartString(cfg.get("tournament_start_at"));
  return resolveRegistration(override, startAt, now).open;
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gates-server.ts
git commit -m "feat(gates): lectores server de override por etapa y registro

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Migración seed de config

**Files:**
- Create: `supabase/migrations/20260610000008_bolsa_gates_config.sql`

> Idempotente (`on conflict do nothing`). No toca datos. En prod no es estrictamente necesaria: los lectores usan defaults cuando la llave falta y el admin las crea al guardar. Sirve para tener defaults en DBs nuevas/locales.

- [ ] **Step 1: Crear la migración**

```sql
-- Config de bolsa y cierres (idempotente). value es jsonb.
insert into admin_config (key, value) values
  ('pot_cuota', '400'::jsonb),
  ('pot_split', '{"first":50,"second":30,"third":20}'::jsonb),
  ('tournament_start_at', '""'::jsonb),
  ('registration_override', '"auto"'::jsonb),
  ('stage_overrides', '{}'::jsonb)
on conflict (key) do nothing;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260610000008_bolsa_gates_config.sql
git commit -m "feat(db): seed idempotente de config de bolsa y cierres

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Admin `/admin/bolsa`

**Files:**
- Create: `src/app/admin/bolsa/page.tsx`
- Create: `src/app/admin/bolsa/_actions.ts`
- Create: `src/app/admin/bolsa/_components/bolsa-form.tsx`
- Modify: `src/app/admin/_components/admin-nav.tsx`

- [ ] **Step 1: Crear la server action `_actions.ts`**

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";

const schema = z
  .object({
    cuota: z.coerce.number().min(0).max(1_000_000),
    first: z.coerce.number().int().min(0).max(100),
    second: z.coerce.number().int().min(0).max(100),
    third: z.coerce.number().int().min(0).max(100),
  })
  .refine((d) => d.first + d.second + d.third === 100, {
    message: "Los porcentajes deben sumar 100.",
    path: ["first"],
  });

export type BolsaActionState = { ok?: boolean; error?: string };

export async function saveBolsaConfig(
  _prev: BolsaActionState,
  formData: FormData,
): Promise<BolsaActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = schema.safeParse({
    cuota: formData.get("cuota"),
    first: formData.get("first"),
    second: formData.get("second"),
    third: formData.get("third"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const supabase = adminClient();
  const { error } = await supabase.from("admin_config").upsert(
    [
      { key: "pot_cuota", value: parsed.data.cuota },
      {
        key: "pot_split",
        value: {
          first: parsed.data.first,
          second: parsed.data.second,
          third: parsed.data.third,
        },
      },
    ] as never,
    { onConflict: "key" },
  );
  if (error) return { error: error.message };

  await logAdminAction(actorId, "update_bolsa", null, {
    cuota: parsed.data.cuota,
    split: { first: parsed.data.first, second: parsed.data.second, third: parsed.data.third },
  });
  revalidatePath("/admin/bolsa");
  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 2: Crear el form cliente `_components/bolsa-form.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBolsaConfig, type BolsaActionState } from "../_actions";
import type { Split } from "@/lib/pot";

export function BolsaForm({ cuota, split }: { cuota: number; split: Split }) {
  const [state, formAction, pending] = useActionState<BolsaActionState, FormData>(
    saveBolsaConfig,
    {},
  );
  const [first, setFirst] = useState(split.first);
  const [second, setSecond] = useState(split.second);
  const [third, setThird] = useState(split.third);
  const sum = first + second + third;

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Label htmlFor="cuota">Cuota por jugador (MXN)</Label>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            La bolsa = cuota × número de jugadores.
          </p>
        </div>
        <Input
          id="cuota"
          name="cuota"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={cuota}
          className="w-28 text-center tabular-nums"
        />
      </div>

      <fieldset className="space-y-4 pt-2 border-t border-[var(--color-border)]">
        <legend className="text-sm font-medium text-[var(--color-text)]">
          Reparto (% de la bolsa)
        </legend>
        <PctRow name="first" label="Primer lugar" value={first} onChange={setFirst} />
        <PctRow name="second" label="Segundo lugar" value={second} onChange={setSecond} />
        <PctRow name="third" label="Tercer lugar" value={third} onChange={setThird} />
        <p
          className={
            sum === 100
              ? "text-xs text-[var(--color-text-muted)]"
              : "text-xs text-[var(--color-danger)]"
          }
        >
          Suma: {sum}% {sum === 100 ? "" : "(debe ser 100%)"}
        </p>
      </fieldset>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending || sum !== 100}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
        {state.ok && (
          <span className="inline-flex items-center gap-1 text-sm text-[var(--color-success)]">
            <Check className="h-4 w-4" /> Guardado
          </span>
        )}
        {state.error && (
          <span className="text-sm text-[var(--color-danger)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}

function PctRow({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-20 text-center tabular-nums"
      />
    </div>
  );
}
```

- [ ] **Step 3: Crear la página `page.tsx`**

```tsx
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_CUOTA, DEFAULT_SPLIT, type Split } from "@/lib/pot";
import { BolsaForm } from "./_components/bolsa-form";

export const metadata = { title: "Bolsa · Admin" };

interface ConfigRow {
  key: string;
  value: unknown;
}

export default async function BolsaPage() {
  const supabase = adminClient();
  const { data } = await supabase
    .from("admin_config")
    .select("key, value")
    .in("key", ["pot_cuota", "pot_split"]);
  const map = new Map(((data ?? []) as ConfigRow[]).map((r) => [r.key, r.value]));

  const cuotaRaw = map.get("pot_cuota");
  const cuota = typeof cuotaRaw === "number" ? cuotaRaw : DEFAULT_CUOTA;

  const splitRaw = map.get("pot_split");
  const split: Split =
    splitRaw && typeof splitRaw === "object"
      ? {
          first: Number((splitRaw as Record<string, unknown>).first ?? DEFAULT_SPLIT.first),
          second: Number((splitRaw as Record<string, unknown>).second ?? DEFAULT_SPLIT.second),
          third: Number((splitRaw as Record<string, unknown>).third ?? DEFAULT_SPLIT.third),
        }
      : DEFAULT_SPLIT;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Bolsa y premios
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Cuota por jugador y reparto a los 3 primeros lugares. Los jugadores ven la
          bolsa en su pantalla de inicio.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Configuración de la bolsa</CardTitle>
          <CardDescription>
            Los porcentajes deben sumar 100. Los cambios aplican de inmediato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BolsaForm cuota={cuota} split={split} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Agregar link en `admin-nav.tsx`**

En `src/app/admin/_components/admin-nav.tsx`, agregar `Coins` al import de `lucide-react` y la entrada al arreglo `LINKS` después de "Puntos":

```tsx
import {
  LayoutDashboard,
  ListChecks,
  Sliders,
  Calendar,
  Users,
  BarChart2,
  Settings2,
  Wrench,
  Coins,
} from "lucide-react";
```

```tsx
  { href: "/admin/scoring", label: "Puntos", icon: Sliders },
  { href: "/admin/bolsa", label: "Bolsa", icon: Coins },
  { href: "/admin/deadlines", label: "Cierres", icon: Calendar },
```

- [ ] **Step 5: Verificar typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 6: Verificar en navegador**

Run: `pnpm dev` y abrir `/admin/bolsa` (logueado como admin). Cambiar split a 60/30/20 → el botón se deshabilita y avisa "(debe ser 100%)"; volver a 50/30/20 → guarda con ✅.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/bolsa src/app/admin/_components/admin-nav.tsx
git commit -m "feat(admin): página de configuración de bolsa y premios

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Card de Bolsa en el dashboard

**Files:**
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Agregar imports**

En `src/app/(app)/page.tsx`, junto a los imports existentes, agregar:

```ts
import {
  computePot,
  prizeAmounts,
  distributePrizes,
  DEFAULT_CUOTA,
  DEFAULT_SPLIT,
  type Split,
  type PrizeAward,
} from "@/lib/pot";
```

- [ ] **Step 2: Leer la config de la bolsa en el `Promise.all`**

Dentro del `Promise.all([...])` de `DashboardPage`, agregar como último elemento una lectura de config (y su destructuring correspondiente al inicio del arreglo de resultados):

```ts
    supabase
      .from("admin_config")
      .select("key, value")
      .in("key", ["pot_cuota", "pot_split"]),
```

Y agregar `{ data: potConfig }` al destructuring de resultados (en la misma posición, al final).

- [ ] **Step 3: Calcular bolsa y reparto (después de `const totals = await getRankingTotals();`)**

```ts
  const potMap = new Map(
    ((potConfig ?? []) as Array<{ key: string; value: unknown }>).map((r) => [r.key, r.value]),
  );
  const cuotaRaw = potMap.get("pot_cuota");
  const cuota = typeof cuotaRaw === "number" ? cuotaRaw : DEFAULT_CUOTA;
  const splitRaw = potMap.get("pot_split");
  const split: Split =
    splitRaw && typeof splitRaw === "object"
      ? {
          first: Number((splitRaw as Record<string, unknown>).first ?? DEFAULT_SPLIT.first),
          second: Number((splitRaw as Record<string, unknown>).second ?? DEFAULT_SPLIT.second),
          third: Number((splitRaw as Record<string, unknown>).third ?? DEFAULT_SPLIT.third),
        }
      : DEFAULT_SPLIT;
  const pot = computePot(cuota, totalPlayers ?? 0);
  const potAmounts = prizeAmounts(pot, split);
  const potAwards = distributePrizes(
    pot,
    split,
    totals.map((t) => ({ player_id: t.player_id, player_name: t.player_name, total: t.total })),
  );
```

- [ ] **Step 4: Renderizar la card tras `<DashboardWelcome ... />`**

Justo después del componente `<DashboardWelcome .../>` dentro del JSX de retorno:

```tsx
      <BolsaCard pot={pot} amounts={potAmounts} awards={potAwards} />
```

- [ ] **Step 5: Definir el componente `BolsaCard` (al final del archivo, junto a los demás)**

```tsx
function BolsaCard({
  pot,
  amounts,
  awards,
}: {
  pot: number;
  amounts: { first: number; second: number; third: number };
  awards: PrizeAward[];
}) {
  const fmt = (n: number) =>
    n.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });
  const placeLabel = (places: number[]) =>
    places.length === 1
      ? `${places[0]}° lugar`
      : `${places[0]}°–${places[places.length - 1]}° (empate)`;
  const medal = ["var(--color-gold)", "var(--color-text-subtle)", "#B87333"];
  const headline = [
    { p: "1° lugar", a: amounts.first },
    { p: "2° lugar", a: amounts.second },
    { p: "3° lugar", a: amounts.third },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[var(--color-gold)]" />
          Bolsa acumulada
        </CardTitle>
        <CardDescription>
          Todos aportan; los 3 primeros lugares se reparten el bote.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-[var(--color-text-muted)]">Bolsa total</p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
            {fmt(pot)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {headline.map((x, i) => (
            <div
              key={x.p}
              className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3 text-center"
            >
              <p className="text-xs font-semibold" style={{ color: medal[i] }}>
                {x.p}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums">{fmt(x.a)}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
            Quién va ganando
          </p>
          {awards.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Nadie tiene puntos todavía.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {awards.map((aw, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{placeLabel(aw.places)}:</span>{" "}
                    {aw.winners.map((w) => w.player_name).join(", ")}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold">
                    {fmt(aw.amountPerWinner)}
                    {aw.winners.length > 1 ? " c/u" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Verificar typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 7: Verificar en navegador**

Run: `pnpm dev`, abrir `/` logueado. Ver la card "Bolsa acumulada" con bolsa total, 3 montos y "Quién va ganando" (o "Nadie tiene puntos todavía." si nadie puntúa). Como no-admin también debe verse.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/page.tsx"
git commit -m "feat(dashboard): card de bolsa con reparto y quién va ganando

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Aplicar gates a las 4 acciones de pronósticos

**Files:**
- Modify: `src/app/(app)/pronosticos/grupos/_actions.ts`
- Modify: `src/app/(app)/pronosticos/terceros/_actions.ts`
- Modify: `src/app/(app)/bracket/_actions.ts`
- Modify: `src/app/(app)/pronosticos/bracket-inicio/_actions.ts`

- [ ] **Step 1: `grupos/_actions.ts` — reemplazar el bloque de deadline/kickoff**

Agregar el import (junto a los demás):

```ts
import { checkStageEditable, getTournamentStart } from "@/lib/gates-server";
```

Reemplazar el bloque actual (desde `const deadlineStage =` hasta el `if (new Date(match.kickoff_at) <= now) { ... }` inclusive) por:

```ts
  const deadlineStage =
    match.stage === "group" ? "group_stage" : `${match.stage}_scores`;

  const gate = await checkStageEditable(deadlineStage);
  if (!gate.editable) {
    return { ok: false, error: gate.reason ?? "Etapa cerrada." };
  }

  const now = new Date();
  if (gate.override !== "open") {
    if (new Date(match.kickoff_at) <= now) {
      return { ok: false, error: "El partido ya empezó." };
    }
    if (match.stage === "group") {
      const start = await getTournamentStart();
      if (start && new Date(start) <= now) {
        return { ok: false, error: "El torneo ya inició: los grupos están cerrados." };
      }
    }
  }
```

> Nota: el resto de la función (cálculo de `penaltyWinner`, `payload`, upsert, revalidate) no cambia. `now` se sigue usando más abajo en `updated_at`.

- [ ] **Step 2: `terceros/_actions.ts` — reemplazar el bloque de deadline**

Agregar import:

```ts
import { checkStageEditable } from "@/lib/gates-server";
```

Reemplazar el bloque actual (la lectura de `deadline` de `"thirds"` y su `if`) por:

```ts
  const gate = await checkStageEditable("thirds");
  if (!gate.editable) {
    return { ok: false, error: gate.reason ?? "Etapa cerrada." };
  }
```

- [ ] **Step 3: `bracket/_actions.ts` — reemplazar el bloque de deadline**

Agregar import:

```ts
import { checkStageEditable } from "@/lib/gates-server";
```

Reemplazar (desde `const stageKey = ...` y la lectura+if de `deadline`) por:

```ts
  const stageKey = `${parsed.data.round}_picks`;
  const gate = await checkStageEditable(stageKey);
  if (!gate.editable) {
    return { ok: false, error: gate.reason ?? "Etapa cerrada." };
  }
```

- [ ] **Step 4: `bracket-inicio/_actions.ts` — reemplazar el bloque de deadline**

Agregar import:

```ts
import { checkStageEditable } from "@/lib/gates-server";
```

Conservar la verificación de feature activa (`early_bracket_enabled`). Reemplazar SOLO el bloque del deadline (`// Deadline guard.` + la lectura de `deadline` + su `if`) por:

```ts
  const gate = await checkStageEditable("early_bracket");
  if (!gate.editable) {
    return { ok: false, error: gate.reason ?? "Etapa cerrada." };
  }
```

- [ ] **Step 5: Verificar typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 6: Verificar comportamiento en navegador**

Run: `pnpm dev`. Con un admin, en `/admin/deadlines` (tras Task 9) probar override "Cerrado" en grupos → editar un marcador en `/pronosticos/grupos` debe rechazar con "El administrador cerró esta etapa." Volver a "Auto".

> Si Task 9 aún no está hecha, verificar de momento solo que `typecheck`/`lint` pasan y que con override ausente el comportamiento es idéntico al actual (respeta deadline).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/pronosticos/grupos/_actions.ts" "src/app/(app)/pronosticos/terceros/_actions.ts" "src/app/(app)/bracket/_actions.ts" "src/app/(app)/pronosticos/bracket-inicio/_actions.ts"
git commit -m "feat(cierres): override por etapa en los 4 guardados de pronósticos

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Bloquear registro cerrado (server action)

**Files:**
- Modify: `src/app/(auth)/_actions.ts`

- [ ] **Step 1: Agregar import y guard en `registerAction`**

Agregar import:

```ts
import { isRegistrationOpen } from "@/lib/gates-server";
```

En `registerAction`, justo después de validar el form (después del bloque `if (!parsed.success) { ... }` y antes de `const { name, pin } = parsed.data;`), agregar:

```ts
  if (!(await isRegistrationOpen())) {
    return { error: "Los registros están cerrados. El torneo ya inició." };
  }
```

- [ ] **Step 2: Verificar typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(auth)/_actions.ts"
git commit -m "feat(registro): rechazar alta cuando el registro está cerrado

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: UI de login cuando el registro está cerrado

**Files:**
- Create: `src/app/(auth)/login/_components/login-client.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

> Hoy `login/page.tsx` es un Client Component que contiene el selector "Soy nuevo / Ya tengo cuenta". Lo convertimos en Server Component que lee el estado de registro y pasa `registrationOpen` a un cliente nuevo.

- [ ] **Step 1: Crear `login/_components/login-client.tsx`**

Mover el contenido actual de `login/page.tsx` a este archivo, con dos cambios: (a) recibe `registrationOpen: boolean`; (b) si está cerrado, oculta el modo "signup" y muestra un aviso.

```tsx
"use client";

import { useState, useEffect, useRef, useActionState } from "react";
import { UserPlus, LogIn, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loginAction, registerAction, type ActionState } from "../../_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { cn } from "@/lib/utils";

type Mode = "signup" | "login";

export function LoginClient({ registrationOpen }: { registrationOpen: boolean }) {
  // Si el registro está cerrado, arrancamos directo en "login".
  const [mode, setMode] = useState<Mode | null>(registrationOpen ? null : "login");

  return (
    <div className="space-y-5">
      {registrationOpen ? (
        <ModeSelector mode={mode} onChange={setMode} />
      ) : (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm text-[var(--color-text-muted)]">
          Los registros están cerrados porque el torneo ya inició. Si ya tienes
          cuenta, entra con tu nombre y PIN.
        </div>
      )}

      <AnimatePresence mode="wait">
        {registrationOpen && mode === "signup" && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <SignupForm />
          </motion.div>
        )}
        {(mode === "login" || !registrationOpen) && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <LoginForm />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeSelector({
  mode,
  onChange,
}: {
  mode: Mode | null;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onChange("signup")}
        className={cn(
          "group relative overflow-hidden rounded-[var(--radius-lg)] p-5 text-left transition-all",
          "border-2 active:scale-[0.98]",
          mode === "signup"
            ? "border-[var(--color-primary)] shadow-[var(--shadow-md)]"
            : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-sm)]",
        )}
        style={{ background: "var(--gradient-card-primary)" }}
      >
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] mb-3 shadow-[var(--shadow-sm)]">
            <UserPlus className="h-5 w-5" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
            Soy nuevo
          </p>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
            Crea tu PIN para empezar a jugar
          </p>
          <span className="mt-3 inline-flex items-center text-xs font-medium text-[var(--color-primary)]">
            Crear cuenta
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onChange("login")}
        className={cn(
          "group relative overflow-hidden rounded-[var(--radius-lg)] p-5 text-left transition-all",
          "border-2 active:scale-[0.98]",
          mode === "login"
            ? "border-[var(--color-info)] shadow-[var(--shadow-md)]"
            : "border-[var(--color-border)] hover:border-[var(--color-info)]/50 hover:shadow-[var(--shadow-sm)]",
        )}
        style={{ background: "var(--gradient-card-info)" }}
      >
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-info)] text-[var(--color-info-fg)] mb-3 shadow-[var(--shadow-sm)]">
            <LogIn className="h-5 w-5" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-text)]">
            Ya tengo cuenta
          </p>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
            Entra con tu nombre y PIN
          </p>
          <span className="mt-3 inline-flex items-center text-xs font-medium text-[var(--color-info)]">
            Iniciar sesión
            <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>
    </div>
  );
}

function SignupForm() {
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    registerAction,
    {},
  );

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)]">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-1">
        Crear cuenta
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">
        Solo necesitas un nombre y un PIN de 4 dígitos.
      </p>

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Tu nombre</Label>
          <Input id="name" name="name" placeholder="Tu nombre" autoComplete="off" required />
          {state.fieldErrors?.name && (
            <p className="text-sm text-[var(--color-danger)]">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">Tu PIN (4 dígitos)</Label>
          <PinInput id="pin" name="pin" value={pin} onChange={setPin} />
          {state.fieldErrors?.pin && (
            <p className="text-sm text-[var(--color-danger)] text-center">
              {state.fieldErrors.pin}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pinConfirm">Confirma tu PIN</Label>
          <PinInput id="pinConfirm" name="pinConfirm" value={pinConfirm} onChange={setPinConfirm} />
          {state.fieldErrors?.pinConfirm && (
            <p className="text-sm text-[var(--color-danger)] text-center">
              {state.fieldErrors.pinConfirm}
            </p>
          )}
        </div>

        {state.error && !state.fieldErrors && (
          <p className="text-sm text-[var(--color-danger)] text-center">{state.error}</p>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={pending || pin.length < 4 || pinConfirm.length < 4}
        >
          {pending ? "Creando..." : "Crear mi cuenta"}
        </Button>
      </form>
    </div>
  );
}

function LoginForm() {
  const [pin, setPin] = useState("");
  const nextRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    {},
  );

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    if (n && n.startsWith("/") && !n.startsWith("//") && nextRef.current) {
      nextRef.current.value = n;
    }
  }, []);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)]">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-1">
        Entrar
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">
        Ingresa tu nombre y PIN de 4 dígitos.
      </p>

      <form action={formAction} className="space-y-5">
        <input ref={nextRef} type="hidden" name="next" defaultValue="" />
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" placeholder="Tu nombre" autoComplete="username" required />
          {state.fieldErrors?.name && (
            <p className="text-sm text-[var(--color-danger)]">{state.fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">PIN</Label>
          <PinInput id="pin" name="pin" value={pin} onChange={setPin} />
          {state.fieldErrors?.pin && (
            <p className="text-sm text-[var(--color-danger)] text-center">
              {state.fieldErrors.pin}
            </p>
          )}
        </div>

        {state.error && !state.fieldErrors && (
          <p className="text-sm text-[var(--color-danger)] text-center">{state.error}</p>
        )}

        <Button type="submit" fullWidth size="lg" disabled={pending || pin.length < 4}>
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
```

> Nota sobre rutas de import: este archivo está en `(auth)/login/_components/`, por eso `_actions` se importa como `"../../_actions"` (sube a `login/` y a `(auth)/`).

- [ ] **Step 2: Reescribir `login/page.tsx` como Server Component**

```tsx
import { isRegistrationOpen } from "@/lib/gates-server";
import { LoginClient } from "./_components/login-client";

export default async function LoginPage() {
  const registrationOpen = await isRegistrationOpen();
  return <LoginClient registrationOpen={registrationOpen} />;
}
```

- [ ] **Step 3: Verificar typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 4: Verificar en navegador**

Run: `pnpm dev`, abrir `/login`. Con registro abierto: aparece el selector "Soy nuevo / Ya tengo cuenta". Tras Task 11, poniendo `registration_override = closed` (o fecha de inicio en el pasado): el selector desaparece, sale el aviso "Los registros están cerrados…" y solo el form de entrar.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/login/page.tsx" "src/app/(auth)/login/_components/login-client.tsx"
git commit -m "feat(login): ocultar alta cuando el registro está cerrado

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: `/admin/deadlines` — huso CDMX + override por etapa + inicio/registro

**Files:**
- Modify: `src/app/admin/deadlines/_actions.ts`
- Modify: `src/app/admin/deadlines/page.tsx`
- Modify: `src/app/admin/deadlines/_components/deadlines-form.tsx`
- Create: `src/app/admin/deadlines/_components/registration-gate-form.tsx`

- [ ] **Step 1: Reescribir `deadlines/_actions.ts`**

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";
import { cdmxInputToUtcISO } from "@/lib/tz";
import { normalizeOverride } from "@/lib/gates";

export type DeadlineActionState = { ok?: boolean; error?: string };

const KNOWN_STAGES = [
  "group_stage",
  "thirds",
  "early_bracket",
  "r32_picks",
  "r32_scores",
  "r16_picks",
  "r16_scores",
  "qf_picks",
  "qf_scores",
  "sf_picks",
  "sf_scores",
  "final_picks",
  "final_scores",
] as const;

const deadlineSchema = z.object({
  stage: z.enum(KNOWN_STAGES),
  deadline_at: z.string().min(1, "Fecha inválida"),
});

export async function saveDeadline(
  _prev: DeadlineActionState,
  formData: FormData,
): Promise<DeadlineActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = deadlineSchema.safeParse({
    stage: formData.get("stage"),
    deadline_at: formData.get("deadline_at"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  // El datetime-local se interpreta como hora CDMX (centro de México).
  const iso = cdmxInputToUtcISO(parsed.data.deadline_at);

  const supabase = adminClient();
  const { error } = await supabase
    .from("deadlines")
    .upsert(
      { stage: parsed.data.stage, deadline_at: iso } as never,
      { onConflict: "stage" },
    );
  if (error) return { error: error.message };

  await logAdminAction(actorId, "update_deadline", parsed.data.stage, { deadline_at: iso });
  revalidatePath("/admin/deadlines");
  revalidatePath("/pronosticos/grupos");
  revalidatePath("/");
  return { ok: true };
}

const overrideSchema = z.object({
  stage: z.enum(KNOWN_STAGES),
  override: z.enum(["auto", "open", "closed"]),
});

export async function saveStageOverride(
  _prev: DeadlineActionState,
  formData: FormData,
): Promise<DeadlineActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = overrideSchema.safeParse({
    stage: formData.get("stage"),
    override: formData.get("override"),
  });
  if (!parsed.success) {
    return { error: "Valor inválido." };
  }

  const supabase = adminClient();
  const { data: row } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "stage_overrides")
    .maybeSingle<{ value: unknown }>();

  const map: Record<string, string> =
    row?.value && typeof row.value === "object"
      ? { ...(row.value as Record<string, string>) }
      : {};

  if (parsed.data.override === "auto") {
    delete map[parsed.data.stage];
  } else {
    map[parsed.data.stage] = parsed.data.override;
  }

  const { error } = await supabase
    .from("admin_config")
    .upsert({ key: "stage_overrides", value: map } as never, { onConflict: "key" });
  if (error) return { error: error.message };

  await logAdminAction(actorId, "update_stage_override", parsed.data.stage, {
    override: parsed.data.override,
  });
  revalidatePath("/admin/deadlines");
  revalidatePath("/pronosticos/grupos");
  return { ok: true };
}

const gateSchema = z.object({
  tournament_start_at: z.string(), // puede venir vacío = sin fecha
  registration_override: z.enum(["auto", "open", "closed"]),
});

export async function saveRegistrationGate(
  _prev: DeadlineActionState,
  formData: FormData,
): Promise<DeadlineActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = gateSchema.safeParse({
    tournament_start_at: formData.get("tournament_start_at") ?? "",
    registration_override: formData.get("registration_override"),
  });
  if (!parsed.success) {
    return { error: "Valor inválido." };
  }

  const startIso = parsed.data.tournament_start_at
    ? cdmxInputToUtcISO(parsed.data.tournament_start_at)
    : ""; // "" = sin fecha (los lectores lo tratan como null)

  const supabase = adminClient();
  const { error } = await supabase.from("admin_config").upsert(
    [
      { key: "tournament_start_at", value: startIso },
      { key: "registration_override", value: normalizeOverride(parsed.data.registration_override) },
    ] as never,
    { onConflict: "key" },
  );
  if (error) return { error: error.message };

  await logAdminAction(actorId, "update_registration_gate", null, {
    tournament_start_at: startIso,
    registration_override: parsed.data.registration_override,
  });
  revalidatePath("/admin/deadlines");
  revalidatePath("/login");
  revalidatePath("/pronosticos/grupos");
  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 2: Reescribir `deadlines-form.tsx` (tz correcto + control de override por fila)**

```tsx
"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { utcISOToCdmxInput } from "@/lib/tz";
import {
  saveDeadline,
  saveStageOverride,
  type DeadlineActionState,
} from "../_actions";

type Override = "auto" | "open" | "closed";

interface Item {
  stage: string;
  label: string;
  deadline_at: string | null;
  override: Override;
}

export function DeadlinesForm({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.stage}>
          <DeadlineRow item={item} />
        </li>
      ))}
    </ul>
  );
}

function DeadlineRow({ item }: { item: Item }) {
  const [value, setValue] = useState(utcISOToCdmxInput(item.deadline_at));
  const [state, formAction, pending] = useActionState<DeadlineActionState, FormData>(
    saveDeadline,
    {},
  );

  return (
    <div className="py-3 border-b border-[var(--color-border)] last:border-b-0 space-y-2">
      <form action={formAction} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <input type="hidden" name="stage" value={item.stage} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)]">{item.label}</p>
          <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
            stage = <code className="font-mono">{item.stage}</code> · hora CDMX
          </p>
        </div>
        <Input
          type="datetime-local"
          name="deadline_at"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full sm:w-56"
          required
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
          {state.ok && <Check className="h-4 w-4 text-[var(--color-success)]" />}
          {state.error && (
            <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
          )}
        </div>
      </form>
      <StageOverrideControl stage={item.stage} current={item.override} />
    </div>
  );
}

function StageOverrideControl({ stage, current }: { stage: string; current: Override }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<DeadlineActionState, FormData>(
    saveStageOverride,
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2 pl-0 sm:pl-1">
      <input type="hidden" name="stage" value={stage} />
      <label className="text-xs text-[var(--color-text-muted)]">Estado manual:</label>
      <select
        name="override"
        defaultValue={current}
        onChange={() => formRef.current?.requestSubmit()}
        disabled={pending}
        className="text-xs rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
      >
        <option value="auto">Auto (según fecha)</option>
        <option value="open">Forzar abierto</option>
        <option value="closed">Forzar cerrado</option>
      </select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-text-muted)]" />}
      {state.ok && <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />}
      {state.error && <span className="text-xs text-[var(--color-danger)]">{state.error}</span>}
    </form>
  );
}
```

- [ ] **Step 3: Crear `registration-gate-form.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { utcISOToCdmxInput } from "@/lib/tz";
import { saveRegistrationGate, type DeadlineActionState } from "../_actions";

type Override = "auto" | "open" | "closed";

export function RegistrationGateForm({
  startAt,
  override,
}: {
  startAt: string | null;
  override: Override;
}) {
  const [value, setValue] = useState(utcISOToCdmxInput(startAt));
  const [state, formAction, pending] = useActionState<DeadlineActionState, FormData>(
    saveRegistrationGate,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)]">
            Inicio del torneo
          </p>
          <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
            Cierra registros y bloquea grupos (hora CDMX). Vacío = sin fecha.
          </p>
        </div>
        <Input
          type="datetime-local"
          name="tournament_start_at"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full sm:w-56"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--color-text-muted)]">Registro:</label>
        <select
          name="registration_override"
          defaultValue={override}
          className="text-xs rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
        >
          <option value="auto">Auto (según fecha de inicio)</option>
          <option value="open">Forzar abierto</option>
          <option value="closed">Forzar cerrado</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
        </Button>
        {state.ok && <Check className="h-4 w-4 text-[var(--color-success)]" />}
        {state.error && (
          <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Reescribir `deadlines/page.tsx` (leer overrides + card de inicio/registro)**

```tsx
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { normalizeOverride, type StageOverride } from "@/lib/gates";
import { DeadlinesForm } from "./_components/deadlines-form";
import { RegistrationGateForm } from "./_components/registration-gate-form";

export const metadata = { title: "Cierres · Admin" };

interface DeadlineRow {
  stage: string;
  deadline_at: string;
}
interface ConfigRow {
  key: string;
  value: unknown;
}

const STAGE_LABELS: Record<string, string> = {
  group_stage: "Fase de grupos (marcadores)",
  thirds: "Selección de 8 mejores terceros",
  early_bracket: "Cuadro desde el inicio",
  r32_picks: "Selecciones de 16avos (cuadro)",
  r32_scores: "Marcadores de 16avos",
  r16_picks: "Selecciones de octavos (cuadro)",
  r16_scores: "Marcadores de octavos",
  qf_picks: "Selecciones de cuartos (cuadro)",
  qf_scores: "Marcadores de cuartos",
  sf_picks: "Selecciones de semifinales (cuadro)",
  sf_scores: "Marcadores de semifinales",
  final_picks: "Selecciones de la final (cuadro)",
  final_scores: "Marcador de la final",
};

const ORDER = Object.keys(STAGE_LABELS);

export default async function DeadlinesPage() {
  const supabase = adminClient();
  const [{ data: deadlines }, { data: config }] = await Promise.all([
    supabase.from("deadlines").select("stage, deadline_at"),
    supabase
      .from("admin_config")
      .select("key, value")
      .in("key", ["stage_overrides", "tournament_start_at", "registration_override"]),
  ]);

  const dlMap = new Map(
    ((deadlines ?? []) as DeadlineRow[]).map((d) => [d.stage, d.deadline_at]),
  );
  const cfgMap = new Map(
    ((config ?? []) as ConfigRow[]).map((r) => [r.key, r.value]),
  );

  const overridesRaw = cfgMap.get("stage_overrides");
  const overrides = (overridesRaw && typeof overridesRaw === "object"
    ? overridesRaw
    : {}) as Record<string, unknown>;

  const items = ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    deadline_at: dlMap.get(stage) ?? null,
    override: normalizeOverride(overrides[stage]),
  }));

  const startRaw = cfgMap.get("tournament_start_at");
  const startAt = typeof startRaw === "string" && startRaw.length > 0 ? startRaw : null;
  const registrationOverride: StageOverride = normalizeOverride(
    cfgMap.get("registration_override"),
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Cierres
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Después de cada fecha (hora CDMX) los jugadores ya no editan esa etapa. El
          estado manual gana sobre la fecha.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Inicio del torneo y registro</CardTitle>
          <CardDescription>
            La fecha de inicio cierra los registros y bloquea la edición de grupos. El
            estado manual de registro gana sobre la fecha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationGateForm startAt={startAt} override={registrationOverride} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cierres por etapa</CardTitle>
          <CardDescription>
            Las horas son CDMX. Guarda cada renglón por separado. &quot;Estado
            manual&quot; permite forzar abierto/cerrado por cualquier contingencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeadlinesForm items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Verificar typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: sin errores.

- [ ] **Step 6: Verificar en navegador**

Run: `pnpm dev`, abrir `/admin/deadlines` como admin:
1. Guardar un cierre con una hora (ej. 11 jun 11:00). Recargar → el input muestra **la misma hora 11:00** (antes se corría 6h). El dashboard "Próximo cierre" debe mostrar esa misma hora.
2. Cambiar "Estado manual" de grupos a **Forzar cerrado** → en otra pestaña, `/pronosticos/grupos` rechaza editar. Volver a **Auto**.
3. En "Inicio del torneo y registro" poner `registration = Forzar cerrado` → `/login` ya no ofrece "Soy nuevo".

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/deadlines
git commit -m "feat(admin/cierres): huso CDMX, override por etapa y gate de registro

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: Verificación final y build

**Files:** (ninguno nuevo)

- [ ] **Step 1: Correr los 3 tests puros**

```bash
npx tsx scripts/test-pot.ts && npx tsx scripts/test-tz.ts && npx tsx scripts/test-gates.ts
```
Expected: los tres imprimen `✅ TODO PASA`.

- [ ] **Step 2: Typecheck + lint + build**

```bash
pnpm typecheck && pnpm lint && pnpm build
```
Expected: sin errores; el build lista las rutas (incluida `/admin/bolsa`).

- [ ] **Step 3: Smoke test manual en navegador**

Run: `pnpm dev`. Verificar de punta a punta:
- `/` muestra la card de Bolsa (como admin y como no-admin).
- `/admin/bolsa` guarda cuota/split (rechaza split ≠ 100%).
- `/admin/deadlines`: hora CDMX correcta en round-trip; override por etapa bloquea/abre; gate de registro.
- Con registro cerrado, `/login` oculta el alta y `registerAction` rechaza.

- [ ] **Step 4: Commit final (si quedó algo suelto) y resumen**

```bash
git add -A
git commit -m "chore: verificación final bolsa + cierres (typecheck/lint/build OK)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" || echo "nada que commitear"
```

---

## Notas de despliegue (para Alberto)

- **No requiere paso manual en prod**: los lectores usan defaults cuando la llave de
  config falta, y el admin las crea al guardar en `/admin/bolsa` y `/admin/deadlines`.
  La migración seed solo aplica a DBs nuevas/locales.
- **Regla de oro del repo**: probar en **Supabase local** (no apuntar `.env.local` a
  prod). Tras verificar, `git push origin main` despliega en Vercel.
- **Huso horario**: en Vercel el servidor es UTC; este cambio guarda los instantes
  correctos interpretando los inputs como CDMX. Verificar el round-trip en
  `/admin/deadlines` después del deploy (poner una hora, recargar, debe coincidir).
