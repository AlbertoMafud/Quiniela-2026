# Bolsa acumulada + cierres por etapa — Diseño

> Fecha: 2026-06-10 · Estado: aprobado (pendiente revisión de Alberto)

## Objetivo

Dos features para la quiniela familiar:

1. **Bolsa acumulada** visible en el dashboard: monto total, cuánto se lleva cada
   uno de los 3 primeros lugares, y **quién** va ganando cada premio ahora mismo.
   Parámetros configurables por el admin.
2. **Cierre del torneo por etapas**: a partir de la fecha de inicio se cierran los
   registros (no entran usuarios nuevos). El bloqueo de edición de pronósticos por
   etapa **ya existe**; se agrega control manual del admin (abrir/cerrar cada etapa
   "por cualquier cosa") y se corrige el manejo de huso horario (centro de México).

## Principio de arquitectura

- **Cero migraciones de esquema.** Toda la config nueva vive en la tabla
  `admin_config` (columna `value jsonb`), que ya almacena objetos/valores arbitrarios.
- Lógica de cálculo y de resolución de cierres en **funciones puras testeables**.
- Riesgo de datos: 🟢 nulo (solo código nuevo + filas de config).

## Estado actual relevante (no se reimplementa)

- El **bloqueo de pronósticos por etapa YA está modelado**. Cada ruta de guardado
  valida el `deadline` de su etapa antes de escribir:
  - Marcadores grupos/eliminatorias → `savePredictionAction`
    (`group_stage` / `{ronda}_scores`) + guarda contra `kickoff_at`.
  - Terceros → `saveThirdsAction` (`thirds`).
  - Cuadro (quién avanza) → `saveBracketPickAction` (`{ronda}_picks`).
  - Cuadro desde inicio → `saveEarlyPickAction` (`early_bracket`).
- El admin configura cada cierre en `/admin/deadlines` (tabla `deadlines`, 13 etapas).
- `getRankingTotals()` (`src/lib/ranking-data.ts`) devuelve los totales por jugador
  **ordenados desc por `total`** (empates resuelven alfabéticamente, sort estable).
  Es la fuente única que ya usan dashboard y `/ranking`.
- `formatDateMx` (`src/lib/utils.ts`) ya formatea en `America/Mexico_City` (display ok).
- **Bug de huso horario (a corregir):** el round-trip de captura está roto.
  `deadlines-form.tsx` → `toLocalInputValue` usa `d.getHours()` (huso del servidor)
  y `saveDeadline` hace `new Date(value).toISOString()` (interpreta el `datetime-local`
  como hora del servidor). En Vercel el servidor es **UTC** → se corre 6h. Afecta la
  corrección de todo el locking.

## Config nueva en `admin_config`

| Llave | Tipo (jsonb) | Default | Qué es |
|---|---|---|---|
| `pot_cuota` | número | `400` | Aporte por jugador (MXN) |
| `pot_split` | objeto `{first,second,third}` | `{first:50,second:30,third:20}` | % de la bolsa para 1°/2°/3° |
| `tournament_start_at` | string ISO \| null | `null` | Inicio del torneo: cierre automático de registros **y** bloqueo de edición de grupos |
| `registration_override` | `"auto"\|"open"\|"closed"` | `"auto"` | Override manual del admin sobre el registro |
| `stage_overrides` | objeto `{ [stage]: "open"\|"closed" }` | `{}` | Override manual por etapa de pronóstico (ausente = auto) |

`stage` usa las mismas 13 claves de `deadlines`: `group_stage`, `thirds`,
`early_bracket`, `r32_picks`, `r32_scores`, `r16_picks`, `r16_scores`, `qf_picks`,
`qf_scores`, `sf_picks`, `sf_scores`, `final_picks`, `final_scores`.

Seed: `INSERT ... ON CONFLICT DO NOTHING` de las 5 llaves con sus defaults, en
`supabase/seed.sql` y `migrations` (idempotente; no toca datos existentes).

---

## Feature 1 — Bolsa

### `src/lib/pot.ts` (puro, testeable)

```ts
export type Split = { first: number; second: number; third: number };
export type RankedPlayer = { player_id: string; player_name: string; total: number };
export type Prize = { player_id: string; player_name: string; amount: number };
export type PrizeTier = { place: 1 | 2 | 3; pct: number; amount: number; winners: Prize[] };

export function computePot(cuota: number, numPlayers: number): number;
export function isValidSplit(split: Split): boolean;        // suma === 100
export function distributePrizes(
  total: number, split: Split, ranked: RankedPlayer[]
): PrizeTier[];
```

**Reparto con empates (partes iguales):** se recorren los jugadores ordenados desc
por `total`, agrupando por `total` igual. Cada grupo ocupa posiciones consecutivas;
el premio del grupo = suma de los slabs (%) de las posiciones premiadas (1-3) que
abarca, dividido en partes iguales entre sus integrantes. Posiciones > 3 no cargan dinero.

- Sin empate `[10,8,5,..]`: 1°→50%, 2°→30%, 3°→20%.
- Empate en 1° `[10,10,8,..]`: los dos de 10 reparten (50+30)=80% → 40% c/u; el de 8 → 20%.
- Empate en 3° `[10,8,8,..]`: 1°→50%; los dos de 8 reparten (30+20)=50% → 25% c/u.
- Triple empate en 1° `[10,10,10,5]`: reparten 100% → 33.33% c/u; el de 5 → nada.

Montos en pesos, redondeados a entero para mostrar; el cálculo interno mantiene
decimales para que las sumas cuadren lo más posible (se documenta que el redondeo
puede dejar ±1 peso de diferencia con el total).

### Admin — `/admin/bolsa` ("Bolsa y premios")

Página nueva (estética de `/admin/scoring`). Inputs:
- Cuota por jugador (número, ≥ 0).
- Tres porcentajes 1°/2°/3° (validación suave: deben sumar 100; si no, error inline).

Server action `saveBolsaConfig` en `src/app/admin/bolsa/_actions.ts`:
`assertAdmin` → valida → upsert `pot_cuota` y `pot_split` en `admin_config` →
`logAdminAction` → `revalidatePath("/admin/bolsa")` + `revalidatePath("/")`.

Entrada nueva en `admin-nav`.

### Dashboard — card "Bolsa"

**Visible para todos los jugadores** (va en el dashboard autenticado, no en admin).
Solo editar la config (cuota/split) es exclusivo de admin. Consistente con el ranking,
que ya es público; lo privado hasta el cierre son los contenidos de pronósticos, no los puntos.

Card de ancho completo cerca de la cabecera (después de `DashboardWelcome`). Lee
`pot_cuota`, `pot_split`, `totalPlayers` y `getRankingTotals()` (ya disponible en la
página). Muestra:
- **Bolsa total** = cuota × #jugadores.
- Tres bloques (1°/2°/3°) con **monto + nombre(s)** de quién va ganando ese premio
  ahora. Empates: lista los nombres compartiendo el bloque.
- Si nadie tiene puntos aún: montos calculados, nombres en "—".
- Server Component; sin estado cliente.

---

## Feature 2 — Cierres por etapa + registro + huso horario

### `src/lib/tz.ts` (centraliza huso CDMX)

```ts
// CDMX no observa horario de verano desde 2023 → offset fijo -06:00 (válido 2026).
export const MX_TZ = "America/Mexico_City";
export function cdmxInputToUtcISO(localValue: string): string; // "YYYY-MM-DDTHH:mm" CDMX → ISO UTC
export function utcISOToCdmxInput(iso: string | null): string;  // ISO → "YYYY-MM-DDTHH:mm" en CDMX (vía Intl)
```

- `cdmxInputToUtcISO`: interpreta el `datetime-local` como hora CDMX agregando
  `:00-06:00` y normalizando con `new Date(...).toISOString()`.
- `utcISOToCdmxInput`: usa `Intl.DateTimeFormat` con `timeZone: MX_TZ` para reconstruir
  la pared de tiempo CDMX (robusto ante cualquier offset).
- Reemplaza `toLocalInputValue` y el `new Date(value).toISOString()` de `saveDeadline`.
- Las comparaciones `new Date(stored) <= now` quedan correctas porque el instante
  guardado es correcto, sin importar el huso del servidor.

### `src/lib/gates.ts` (server-only) — resolución de cierres

Funciones **puras** (testeables) + un lector de config.

```ts
export type StageOverride = "auto" | "open" | "closed";

export function resolveStageGate(
  override: StageOverride, deadlineAt: string | null, now: Date
): { editable: boolean; reason?: string };

export function resolveRegistration(
  override: StageOverride, startAt: string | null, now: Date
): { open: boolean };

// Lector server: una sola lectura de admin_config + deadlines.
export async function getGates(): Promise<{
  registration: (now: Date) => boolean;
  stage: (stageKey: string, deadlineAt: string | null, now: Date) => { editable: boolean; reason?: string };
}>;
```

**`resolveStageGate`:**
- `"closed"` → no editable (razón: "El admin cerró esta etapa.").
- `"open"` → editable (bypass del deadline; reabre aunque ya pasó).
- `"auto"`/ausente → editable sii `deadlineAt == null || new Date(deadlineAt) > now`.

**`resolveRegistration`:**
- `"closed"` → cerrado · `"open"` → abierto.
- `"auto"` → abierto sii `startAt == null || new Date(startAt) > now`.

### Aplicación en los 4 guardados de pronósticos

Cada acción ya calcula su `stageKey`. Se inserta, **antes** del check de deadline
existente, la consulta del override y se delega a `resolveStageGate`:
- `savePredictionAction`: `stageKey = group→"group_stage", else "{stage}_scores"`.
  El guard de `kickoff_at` se mantiene **solo cuando el override no es `"open"`**
  (si el admin reabre, también ignora kickoff). **Para `group`, el modo `auto`
  exige además `now < tournament_start_at`** (una sola fecha bloquea registro y
  grupos); `"open"` lo bypassa, `"closed"` lo cierra.
- `saveThirdsAction`: `"thirds"`.
- `saveBracketPickAction`: `"{round}_picks"`.
- `saveEarlyPickAction`: `"early_bracket"` (además del check de feature activa).

`"closed"` rechaza con mensaje claro; `"open"` salta el rechazo por deadline/kickoff.

### Registro

- `registerAction` (`src/app/(auth)/_actions.ts`): tras validar el form, consulta
  `getGates().registration(now)`; si cerrado → `{ error: "Los registros están cerrados." }`.
- `/registro` (`page.tsx`): si los registros están cerrados, renderiza un estado
  "Registros cerrados" en lugar del formulario.
- `/login`: ocultar el enlace a "crear cuenta" cuando los registros estén cerrados.

### Admin — UI en `/admin/deadlines`

- Card nueva **"Inicio del torneo y registro"**: input `datetime-local` para
  `tournament_start_at` (vía `tz.ts`) + select `registration_override`
  (`auto`/`open`/`closed`). Action `saveRegistrationGate`.
- En cada renglón de etapa existente (`deadlines-form.tsx`): junto a la fecha, un
  control 3-estados **Auto / Abierto / Cerrado** que escribe en `stage_overrides`.
  Action `saveStageOverride(stage, value)`.
- `saveDeadline` se mantiene pero usa `cdmxInputToUtcISO`.

Todas las acciones admin: `assertAdmin` + `logAdminAction` + `revalidatePath` de las
rutas afectadas (`/admin/deadlines`, `/`, y las de pronósticos relevantes).

---

## Pruebas

- `scripts/test-pot.ts` (`npx tsx`): sin empate, empate en 1°, empate en 3°, triple
  empate en 1°, validación de split, redondeo.
- `scripts/test-gates.ts`: `resolveStageGate` (closed/open/auto pre y post deadline) y
  `resolveRegistration` (los 3 estados, con y sin fecha).
- `scripts/test-tz.ts`: round-trip `cdmxInputToUtcISO` ↔ `utcISOToCdmxInput`
  (ej. "2026-06-11T11:00" CDMX ↔ "2026-06-11T17:00:00Z").
- Verificación final: `typecheck` + `eslint` limpios; `/admin/bolsa`, `/admin/deadlines`
  y dashboard cargan sin errores de consola.

## Fuera de alcance

- Tracking de quién pagó (decisión: "todos los registrados pagan").
- Más de 3 posiciones premiadas.
- Switch global de "congelar todos los pronósticos" (cubierto por overrides por etapa).
- Cambios de moneda/i18n de montos (peso fijo, formato `es-MX`).

## Archivos tocados (resumen)

**Nuevos:** `src/lib/pot.ts`, `src/lib/tz.ts`, `src/lib/gates.ts`,
`src/app/admin/bolsa/page.tsx` (+ `_actions.ts`, `_components/`),
`scripts/test-pot.ts`, `scripts/test-gates.ts`, `scripts/test-tz.ts`.

**Modificados:** `src/app/(app)/page.tsx` (card Bolsa),
`src/app/(app)/pronosticos/grupos/_actions.ts`,
`src/app/(app)/pronosticos/terceros/_actions.ts`,
`src/app/(app)/bracket/_actions.ts`,
`src/app/(app)/pronosticos/bracket-inicio/_actions.ts`,
`src/app/(auth)/_actions.ts`, `src/app/(auth)/registro/page.tsx`,
`src/app/(auth)/login/page.tsx`,
`src/app/admin/deadlines/page.tsx` + `_actions.ts` + `_components/deadlines-form.tsx`,
`src/app/admin/_components/admin-nav.tsx`,
`supabase/seed.sql` + `supabase/migrations/<nueva>.sql` (seed de config, idempotente).
