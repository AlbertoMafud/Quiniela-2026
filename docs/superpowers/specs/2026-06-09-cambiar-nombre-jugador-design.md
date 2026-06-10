# Diseño — Cambiar nombre de jugador (self-service)

> Fecha: 2026-06-09
> Proyecto: Quiniela Familia 2026 (`quiniela-2026-familia`)
> Estado: aprobado, pendiente plan de implementación

---

## Objetivo

Permitir que cada jugador cambie su propio nombre desde la app, sin
intervención de admin.

## Contexto clave

En esta app el **nombre ES el usuario de login**: se entra con `nombre + PIN`
(ver [_actions.ts](../../../src/app/(auth)/_actions.ts)). No es una etiqueta
puramente cosmética.

Sin embargo, todo lo importante cuelga de `player_id` (uuid), no del nombre:

- `predictions`, `third_picks`, `bracket_picks`, `early_bracket_picks` →
  referencian `player_id` ([init.sql](../../../supabase/migrations/20260523000001_init.sql))
- Ranking / puntos → vistas `player_scores`, `group_standings` que hacen join
  por id; el nombre se lee en vivo
- Sesión → la cookie HMAC guarda `playerId`, no el nombre
  ([auth.ts](../../../src/lib/auth.ts))

**Consecuencia:** cambiar el nombre se refleja solo en todos lados (ranking,
pronósticos públicos, admin). Cero recálculo, cero migración de BD, y la sesión
activa **no** se cae al renombrar.

## Decisiones (acordadas con el usuario)

| Decisión | Elección |
|---|---|
| ¿Quién renombra? | **Self-service** (cada quien el suyo) |
| ¿Límites / cooldown / freeze? | **Ninguno** — libre siempre |
| ¿Unicidad case-insensitive? | **Sí** (bloquear "Pedro" si ya existe "pedro") |

## Alcance

### Incluye

1. **Página nueva `/perfil`** bajo el grupo `(app)` (protegida por el
   middleware existente). Form simple: input con el nombre actual precargado +
   botón "Guardar". Reusa `Input` / `Button` / `Label` de `components/ui`.
2. **Acceso desde navegación**: link a `/perfil` en
   [navigation.tsx](../../../src/components/app/navigation.tsx) — en el
   `MoreMenu` (móvil) y junto al `playerName` en `TopNav` (escritorio).
3. **Server action `updatePlayerName`** en `src/app/(app)/perfil/_actions.ts`.

### NO incluye (YAGNI)

- Historial de nombres anteriores
- Aprobación / moderación de admin
- Límites, cooldown o congelamiento durante el torneo
- Renombrar a otros jugadores (eso ya lo cubriría admin en otra feature)

## Server action `updatePlayerName` — comportamiento

1. Lee la sesión → `playerId`. **No** confía en ningún id que venga del form.
   Si no hay sesión, error "No autenticado".
2. Valida el nombre con zod: `trim`, `min(3)`, `max(30)` — mismas reglas que el
   registro. Reutilizar el mismo schema/regex para consistencia.
3. Carga el nombre actual del jugador (se necesita para el audit log y para el
   no-op).
4. **No-op:** si el nombre nuevo (normalizado) es igual al actual → regresa `ok`
   sin escribir nada.
5. **Check de unicidad (case-insensitive):** busca otro jugador (`id != self`)
   cuyo nombre coincida ignorando mayúsculas (p. ej. `ilike` exacto sin
   comodines, o comparación `lower(name) = lower(nuevo)`). Si existe → error
   `"Ya existe un jugador con ese nombre. Elige otro."` y **no** escribe.
6. `update players set name = <nuevo> where id = playerId`. Se guarda el nombre
   tal cual lo escribió el usuario (preservando mayúsculas); solo la *unicidad*
   es insensible a mayúsculas.
7. **Red de seguridad (carrera):** si la BD rechaza por el constraint `unique`
   (código Postgres `23505`), atrapar el error y devolver el mismo mensaje
   amable del paso 5 en vez de un error crudo.
8. **Audit log:** registrar `actor = playerId`, `action = "rename_self"`,
   `target = playerId`, `payload = { old, new }`. Reutilizar `logAdminAction`
   de [admin.ts](../../../src/lib/admin.ts) (es un insert genérico a
   `audit_log`, pese al nombre).
9. `revalidatePath("/", "layout")` + `revalidatePath("/ranking")` para refrescar
   el nombre en toda la app.
10. Regresa `ok` con aviso para la UI:
    **"La próxima vez entra con tu nuevo nombre."**

### Flujo de error "nombre ya existe" (UX)

No saca al usuario ni cambia nada. El form muestra el error en rojo, el input se
queda con lo escrito, el usuario corrige y vuelve a darle Guardar. Mismo patrón
que ya tiene el registro hoy.

## Cambios de base de datos

**Ninguno.** La columna `players.name` y su constraint `unique` ya existen. La
operación es un `UPDATE` a una celda existente. No se crean columnas ni tablas,
no se tocan las migraciones, no hay recálculo de puntos.

> Nota sobre la unicidad case-insensitive: el constraint `unique` actual de
> Postgres es sensible a mayúsculas. La insensibilidad se implementa en el
> **check de la app** (paso 5). El constraint de BD sigue siendo la red de
> seguridad para carreras exactas. (Endurecer el constraint a nivel BD —p. ej.
> índice único sobre `lower(name)`— queda fuera de alcance; se puede evaluar
> después si se quiere garantía dura en la base.)

## Consideraciones / riesgos

- **El nombre es el login.** Tras renombrar, el siguiente login es con el nombre
  nuevo. Se mitiga con el aviso explícito en la UI y porque la sesión activa
  sobrevive (no hay lockout inmediato).
- **Suplantación / confusión:** sin límites, alguien podría renombrarse para
  parecer otro o cambiar a media justa. Riesgo aceptado para una app familiar;
  el audit log deja rastro.

## Pruebas (para la fase de implementación)

Unit tests de la server action:

- Éxito: nombre válido y libre → actualiza, audit log escrito.
- Colisión case-insensitive: "pedro" existe, intento "Pedro" → error, sin cambio.
- Validación: nombre < 3 o > 30 chars → error.
- No-op: nombre igual al actual → ok sin escritura.
- Sin sesión → error "No autenticado".
