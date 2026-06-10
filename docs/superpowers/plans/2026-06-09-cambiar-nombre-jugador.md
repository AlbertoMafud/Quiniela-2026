# Cambiar nombre de jugador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada jugador cambie su propio nombre desde una página `/perfil`, self-service, sin límites.

**Architecture:** Helpers puros de validación/comparación de nombre (testeables) en `src/lib/profile.ts`; una server action `updatePlayerName` que valida, comprueba unicidad case-insensitive, actualiza `players.name`, audita y revalida; una página `/perfil` con un form cliente (`useActionState`); y un link en la navegación. Sin cambios de base de datos.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19 (`useActionState`), Supabase (`adminClient`, service_role), zod, TypeScript. Tests de lógica pura vía `npx tsx` (patrón existente del repo; el proyecto no tiene framework de tests).

> Spec: [docs/superpowers/specs/2026-06-09-cambiar-nombre-jugador-design.md](../specs/2026-06-09-cambiar-nombre-jugador-design.md)

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `src/lib/profile.ts` | Helpers puros: `nameSchema` (zod) y `namesEqualCI` | Crear |
| `scripts/test-profile.ts` | Test manual de los helpers (`npx tsx`) | Crear |
| `src/app/(app)/perfil/_actions.ts` | Server action `updatePlayerName` | Crear |
| `src/app/(app)/perfil/_components/profile-form.tsx` | Form cliente (`useActionState`) | Crear |
| `src/app/(app)/perfil/page.tsx` | Página servidor: carga nombre actual, renderiza form | Crear |
| `src/components/app/navigation.tsx` | Link a `/perfil` en nav (desktop + móvil) | Modificar |

**Nota sobre tests:** sólo la lógica pura (`src/lib/profile.ts`) se prueba de forma automatizada — es lo que concentra el riesgo (comparación case-insensitive y validación). La server action y la UI dependen de Supabase + cookies + Next; montar mocks de toda esa infra es desproporcionado para esta app, así que se verifican corriendo la app (Task 6). Esto es consciente, no un atajo silencioso.

---

## Task 1: Helpers puros de nombre (TDD)

**Files:**
- Create: `src/lib/profile.ts`
- Test: `scripts/test-profile.ts`

- [ ] **Step 1: Write the failing test**

Crea `scripts/test-profile.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/test-profile.ts`
Expected: FAIL — error de módulo no encontrado / no exporta `nameSchema` ni `namesEqualCI` (porque `src/lib/profile.ts` aún no existe).

- [ ] **Step 3: Write minimal implementation**

Crea `src/lib/profile.ts`:

```ts
import { z } from "zod";

// Reglas de nombre compartidas (mismas que el registro): trim, 3–30 chars.
export const nameSchema = z
  .string()
  .trim()
  .min(3, "El nombre debe tener al menos 3 caracteres.")
  .max(30, "El nombre no puede tener más de 30 caracteres.");

// Compara dos nombres ignorando mayúsculas y espacios al borde.
// Base de la unicidad case-insensitive: "Pedro" choca con "pedro".
export function namesEqualCI(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx scripts/test-profile.ts`
Expected: PASS — "Todas las pruebas pasaron."

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile.ts scripts/test-profile.ts
git commit -m "feat(perfil): helpers de nombre (validacion + comparacion case-insensitive)"
```

---

## Task 2: Server action `updatePlayerName`

**Files:**
- Create: `src/app/(app)/perfil/_actions.ts`

Patrón espejo de [src/app/admin/usuarios/_actions.ts](../../../src/app/admin/usuarios/_actions.ts) (validación zod, `adminClient`, `logAdminAction`, `revalidatePath`) y de [src/app/(auth)/_actions.ts](../../../src/app/(auth)/_actions.ts) (forma `ActionState`).

- [ ] **Step 1: Write the server action**

Crea `src/app/(app)/perfil/_actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin";
import { nameSchema, namesEqualCI } from "@/lib/profile";

export type ProfileActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function updatePlayerName(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return {
      fieldErrors: {
        name: parsed.error.issues[0]?.message ?? "Nombre inválido.",
      },
    };
  }
  const newName = parsed.data;

  const supabase = adminClient();

  // Nombre actual (para no-op y audit log).
  const { data: me } = await supabase
    .from("players")
    .select("id, name")
    .eq("id", session.playerId)
    .maybeSingle<{ id: string; name: string }>();
  if (!me) redirect("/login");

  // No-op: idéntico exacto (un cambio de sólo mayúsculas SÍ se permite).
  if (me.name === newName) return { ok: true };

  // Unicidad case-insensitive contra el resto de jugadores.
  const { data: others } = await supabase
    .from("players")
    .select("id, name")
    .neq("id", session.playerId);
  const clash = (others ?? []).some((p) => namesEqualCI(p.name, newName));
  if (clash) {
    return { error: "Ya existe un jugador con ese nombre. Elige otro." };
  }

  // Update del nombre (se guarda tal cual, preservando mayúsculas).
  const { error } = await supabase
    .from("players")
    .update({ name: newName } as never)
    .eq("id", session.playerId);

  if (error) {
    // Red de seguridad ante carrera contra el constraint unique de la BD.
    if (error.code === "23505") {
      return { error: "Ya existe un jugador con ese nombre. Elige otro." };
    }
    return { error: "No se pudo cambiar el nombre. Intenta de nuevo." };
  }

  await logAdminAction(session.playerId, "rename_self", session.playerId, {
    old: me.name,
    new: newName,
  });

  revalidatePath("/", "layout");
  revalidatePath("/ranking");
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (sin errores). Si marca que `error.code` no existe, confirma que el cliente es `@supabase/supabase-js` (el error es `PostgrestError`, que sí tiene `.code`).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/perfil/_actions.ts"
git commit -m "feat(perfil): server action updatePlayerName"
```

---

## Task 3: Form cliente

**Files:**
- Create: `src/app/(app)/perfil/_components/profile-form.tsx`

Patrón espejo de los forms en [src/app/(auth)/login/page.tsx](../../../src/app/(auth)/login/page.tsx) (`useActionState`, `Input`/`Label`/`Button`).

- [ ] **Step 1: Write the form component**

Crea `src/app/(app)/perfil/_components/profile-form.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updatePlayerName, type ProfileActionState } from "../_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updatePlayerName, {});

  // Al guardar con éxito, refresca para que el nombre nuevo aparezca en la nav.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)] max-w-md">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-1">
        Tu nombre
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">
        Este nombre es también tu usuario para entrar. Si lo cambias, la próxima
        vez entra con el nombre nuevo y tu mismo PIN.
      </p>

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            name="name"
            defaultValue={currentName}
            placeholder="Tu nombre"
            autoComplete="off"
            required
          />
          {state.fieldErrors?.name && (
            <p className="text-sm text-[var(--color-danger)]">
              {state.fieldErrors.name}
            </p>
          )}
        </div>

        {state.error && (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        )}

        {state.ok && (
          <p className="text-sm text-[var(--color-success)]">
            Nombre actualizado. La próxima vez entra con tu nuevo nombre.
          </p>
        )}

        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(app)/perfil/_components/profile-form.tsx"
git commit -m "feat(perfil): form cliente para cambiar nombre"
```

---

## Task 4: Página `/perfil`

**Files:**
- Create: `src/app/(app)/perfil/page.tsx`

Patrón espejo de cómo [src/app/(app)/layout.tsx](../../../src/app/(app)/layout.tsx) obtiene el player (`getSession` + `adminClient`).

- [ ] **Step 1: Write the page**

Crea `src/app/(app)/perfil/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "./_components/profile-form";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = adminClient();
  const { data: player } = await supabase
    .from("players")
    .select("name")
    .eq("id", session.playerId)
    .maybeSingle<{ name: string }>();
  if (!player) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-text)]">
          Perfil
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Administra tu información.
        </p>
      </div>
      <ProfileForm currentName={player.name} />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/perfil/page.tsx"
git commit -m "feat(perfil): pagina /perfil"
```

---

## Task 5: Link en navegación

**Files:**
- Modify: `src/components/app/navigation.tsx`

Agregar `/perfil` a `SECONDARY_LINKS` lo expone tanto en el top nav de escritorio como en el `MoreMenu` móvil con un solo cambio (ambos iteran ese arreglo).

- [ ] **Step 1: Add the `User` icon import**

En `src/components/app/navigation.tsx`, en el bloque de imports de `lucide-react`, agrega `User`:

```tsx
import {
  Home,
  Target,
  Trophy,
  BarChart3,
  Users,
  Settings,
  ChartLine,
  Menu,
  LogOut,
  User,
} from "lucide-react";
```

- [ ] **Step 2: Add the `/perfil` entry to `SECONDARY_LINKS`**

Reemplaza el bloque `SECONDARY_LINKS` existente por:

```tsx
const SECONDARY_LINKS = [
  { href: "/estadisticas", label: "Estadísticas", icon: ChartLine },
  { href: "/pronosticos-publicos", label: "Públicos", icon: Users },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/navigation.tsx
git commit -m "feat(perfil): link a /perfil en la navegacion"
```

---

## Task 6: Verificación end-to-end (correr la app)

**Files:** ninguno (verificación).

La server action y la UI no tienen tests automatizados (ver nota arriba); se validan corriendo la app.

- [ ] **Step 1: Lint + typecheck del proyecto completo**

Run: `pnpm lint && pnpm typecheck`
Expected: ambos PASS, sin errores nuevos.

- [ ] **Step 2: Re-correr el test de helpers**

Run: `npx tsx scripts/test-profile.ts`
Expected: PASS.

- [ ] **Step 3: Arrancar dev y probar el flujo en el navegador**

Run: `pnpm dev` (o vía la herramienta de preview)

Verifica manualmente, ya logueado:
1. Navega a `/perfil` (link "Perfil" en el menú). El input muestra tu nombre actual.
2. **Validación:** escribe "Jo" (2 chars) → Guardar → error "al menos 3 caracteres". Sin cambio.
3. **Colisión case-insensitive:** pon el nombre de OTRO jugador con distinta capitalización (ej. si existe "Adriana", escribe "adriana") → Guardar → error "Ya existe un jugador con ese nombre." Sin cambio.
4. **Éxito:** escribe un nombre nuevo libre → Guardar → mensaje verde "Nombre actualizado…". El nombre en la barra de navegación se actualiza.
5. Ve a `/ranking` → tu nombre aparece actualizado.
6. **Login con el nombre nuevo:** Salir → entra con el nombre NUEVO + mismo PIN → entra bien. (Confirma que el nombre era el usuario de login.)

- [ ] **Step 4: Confirmar el audit log (opcional)**

En Supabase, revisa la tabla `audit_log`: debe haber una fila `action = 'rename_self'` con `payload = { old, new }`.

- [ ] **Step 5: Commit final (si hubo ajustes)**

Si los pasos anteriores requirieron correcciones, commitéalas. Si no, no hay nada que commitear.

---

## Self-Review (hecho)

- **Cobertura del spec:** página `/perfil` (T4), acceso en nav (T5), `updatePlayerName` con validación/no-op/unicidad CI/red de seguridad 23505/audit/revalidate (T2), flujo de error "ya existe" (T6 paso 3), cero cambios de BD (ningún task toca migraciones), pruebas (T1 + T6). ✔
- **Sin placeholders:** todo el código está completo y literal. ✔
- **Consistencia de tipos:** `ProfileActionState` definido en T2 y consumido en T3; `nameSchema`/`namesEqualCI` definidos en T1 y consumidos en T1-test y T2; `SECONDARY_LINKS` con la forma `{href,label,icon}` ya existente. ✔
- **Decisión de no-op:** exacta (`me.name === newName`), por lo que un cambio de sólo mayúsculas se permite — coherente con "preservar mayúsculas" del spec. ✔
