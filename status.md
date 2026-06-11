# Quiniela Familia 2026 — Status

> Última actualización: **2026-06-10** (features: bolsa acumulada + cierres por etapa, en prod; previo: cambiar nombre self-service)

## Qué es esto

App familiar para quiniela del Mundial 2026 (48 equipos, 12 grupos, arranca 11-jun). Separada de la app de Adriana. Stack: **Next.js 16 + Supabase + Vercel + Tailwind v4 + shadcn-style components**.

- Repo: https://github.com/AlbertoMafud/Quiniela-2026
- Prod: https://quiniela-mundial-2026-ochre.vercel.app
- Carpeta local: `C:\Users\alber\Claude_AI\proyectos\Quiniela_Mundialista\quiniela-2026-familia\`
- Branch principal: `main` (auto-deploy a Vercel)

## Quién juega

Familia. Auth por **PIN** (sin email, sin password). Admins actuales: **Alberto** y **Adriana**.

## Estado por milestone (plan original ~19 días)

| # | Entregable | Estado |
|---|---|---|
| 1 | Setup repo + Next.js + Supabase + PIN auth + schema + seed | DONE |
| 2 | Pronósticos grupos + ranking básico | DONE |
| 3 | Mejores terceros + reglas + admin (resultados/scoring/deadlines) | DONE |
| 4 | Tabla FIFA + cuadro desde inicio + cuadro post-grupos + eliminatorias | DONE |
| 5 | Vista pública pronósticos + estadísticas | DONE |
| 6 | Auto-ingest API + Vercel Cron + UI polish + responsive QA | DONE |
| 7 | Audit + fix bugs + onboarding familia | **EN PROCESO** |

## Decisiones de producto importantes (no cambiar sin avisar)

- **Idioma**: 100% español, sin pochismos. "Cierre" (no "deadline"), "Cuadro" (no "bracket" en UI; en código sí), "16avos / octavos / cuartos / semifinales / final" (no R32, R16…), "Selecciones" (no "picks") en UI.
- **Empate en eliminatoria**: el selector dice "¿Quién pasa?" (no "por penales") — puede ser tiempos extra.
- **Scoring acumulado del cuadro desde el inicio**: si tu equipo llega a 16avos 1 pt, a octavos suma 2 más (total 3), a cuartos +3 (total 6), a semis +4 (10), a final +5 (15 max).
- **Admin siempre ve todo** (incluyendo pronósticos de otros antes del cierre, para poder auditar).
- **Privacidad de pronósticos**: cada jugador no-admin SOLO ve los suyos hasta que pase el cierre (`deadline_at`) de esa etapa. Después se revelan todos. Aplica a `/ranking`.
- **NO tocar `quiniela-original/` ni `quiniela-2026/`** (son la app real de Adriana en Firebase prod).

## Cambios recientes (sesión 2026-06-10)

**feat: bolsa acumulada + cierres por etapa.** Dos features, flujo completo spec → plan → ejecución por subagentes (implementador + doble review spec/calidad por tarea) → prod. Docs: `docs/superpowers/specs/2026-06-10-bolsa-y-cierres-design.md` y `docs/superpowers/plans/2026-06-10-bolsa-y-cierres.md`. Mergeado a `main` (commit `d580f13`), **en prod** y verificado Ready en Vercel.

**Principio:** cero migración de esquema. Toda la config nueva en `admin_config` (jsonb); lógica en funciones puras testeables (`npx tsx`). Riesgo de datos 🟢 nulo. Los lectores usan defaults cuando la llave falta → prod no necesitó seeding manual.

**1) Bolsa (dashboard, visible a TODOS los jugadores):**
- `src/lib/pot.ts` (puro, `scripts/test-pot.ts`): `computePot` (cuota × #jugadores), `prizeAmounts` (montos 1°/2°/3°), `distributePrizes` (reparto con **empates divididos en partes iguales**: agrupa por total igual, suma los % de las posiciones premiadas que abarca, divide entre los empatados). `±1 peso` de redondeo por diseño.
- `/admin/bolsa` (`page.tsx` + `_actions.ts` + `bolsa-form.tsx`): cuota + split %, valida suma 100. Link "Bolsa" en `admin-nav`.
- Card "Bolsa acumulada" en `(app)/page.tsx`: total + 1°/2°/3° + quién va ganando. Lee de `getRankingTotals()` (ya paginado). Defaults: cuota **400**, split **50/30/20**.

**2) Cierres por etapa + registro + huso horario:**
- `src/lib/tz.ts` (`scripts/test-tz.ts`): `cdmxInputToUtcISO` / `utcISOToCdmxInput`. **Arregla bug latente**: el round-trip de `/admin/deadlines` guardaba el `datetime-local` como hora del servidor (UTC en Vercel) → se corría 6h. Ahora interpreta como CDMX (offset fijo -06:00, sin horario de verano desde 2023).
- `src/lib/gates.ts` (puro, `scripts/test-gates.ts`) + `gates-server.ts` (lector): `resolveStageGate` / `resolveRegistration` + `checkStageEditable` / `isRegistrationOpen` / `getTournamentStart`.
- **Override manual por etapa** (Auto/Abierto/Cerrado), en `admin_config.stage_overrides` (objeto jsonb). `closed` bloquea, `open` reabre aunque pasó el cierre, `auto` respeta el deadline. Cableado en los 4 guardados (`grupos`, `terceros`, `bracket`, `bracket-inicio`).
- **Cierre de registro por `tournament_start_at`** + `registration_override`. `registerAction` rechaza (hard); `/login` oculta "Soy nuevo" (soft) y es `force-dynamic` (refleja el cierre por fecha sin rebuild). En grupos, `tournament_start_at` también bloquea edición (una fecha cierra registro + grupos).
- `/admin/deadlines` reescrito: card "Inicio del torneo y registro" + control 3-estados por etapa + tz correcto.

**Llaves nuevas en `admin_config`:** `pot_cuota`, `pot_split`, `tournament_start_at`, `registration_override`, `stage_overrides`. Migración seed idempotente `20260610000008` (solo para DBs nuevas/locales; prod usa defaults + upsert al guardar).

**Verificación:** 26/26 tests tsx · typecheck · lint (limpio en lo tocado) · `pnpm build`. Review final holístico: ready to merge. **Smoke en navegador de los toggles de admin: PENDIENTE** (no corrido; hacerlo con cuidado en prod o en local).

**Rollback si hace falta:** `vercel rollback https://quiniela-mundial-2026-qygcw72yj-albertomafuds-projects.vercel.app` (prod anterior). Código + config aditiva, sin cambios destructivos.

**OJO — aún sin configurar (lo hace Alberto como admin en prod):**
- Registros **siguen abiertos** hasta que se fije `tournament_start_at` en `/admin/deadlines`.
- Cuota/split están en defaults (400 · 50/30/20); ajustar en `/admin/bolsa` si cambia.

## Cambios recientes (sesión 2026-06-09)

**feat(perfil): cambiar nombre self-service.** Cada jugador cambia su propio nombre desde `/perfil` (link nuevo en navegación). Sin límites.

- Flujo: spec → plan → ejecución por subagentes (doble review spec+calidad). Docs en `docs/superpowers/specs/` y `docs/superpowers/plans/`.
- `src/lib/profile.ts`: helpers puros `nameSchema` (3–30, trim) + `namesEqualCI` (con test `npx tsx scripts/test-profile.ts`).
- Server action `updatePlayerName` (`src/app/(app)/perfil/_actions.ts`): valida → no-op si idéntico → unicidad **case-insensitive** (`ilike` + `namesEqualCI` + red de seguridad `23505`) → update → audit (`rename_self`) → revalidate.
- **El nombre es el login**: tras renombrar, el siguiente login es con el nombre nuevo + mismo PIN. La sesión activa sobrevive (cookie guarda `playerId`). La UI lo avisa.
- **Cero cambios de BD** — `name` ya existía y es `unique`; puntos/ranking cuelgan de `player_id`. No recálculo.
- Cambio de solo-mayúsculas (pedro→Pedro) SÍ se permite (no-op solo si idéntico exacto).
- Verificado: typecheck ✅, test helpers ✅, archivos nuevos lint-clean. PR #1 mergeado a `main`, **en prod** (`/perfil` redirige a login como esperado).
- Pendiente fuera de alcance: lint pre-existente roto en `theme-toggle.tsx` y `online-players-widget.tsx` (reglas React 19) — no es de esta feature.

## Cambios recientes (sesión 2026-06-08)

**fix(conteos): paginar fetches de `predictions` (bug latente del límite 1000 de PostgREST).** Al cruzar las 1000 predicciones (1268), las consultas que traían predicciones de TODOS los jugadores sin paginar se truncaban a 1000 → conteo por jugador del admin (progreso, usuarios) y puntos del ranking calculados sobre datos truncados. Síntoma: dashboard de Alberto 72/72 vs admin 22/72. El dashboard NO se afectaba (cuenta por jugador con `count:"exact"`). **Ningún dato perdido.**

- Nuevo helper `src/lib/supabase/fetch-all.ts` → `fetchAllRows` (paginado con `.range()`; requiere `.order()` estable).
- Aplicado a los 6 lugares vulnerables: `ranking` (puntos — crítico), `admin/progreso`, `admin/usuarios`, `estadisticas`, `pronosticos-publicos`, `admin/herramientas` (tool de relleno).
- Los fetches filtrados por jugador o por partido (`grupos`, `terceros`, `bracket`, dashboard) no se tocaron (≤120 filas).
- Verificado contra prod (solo lectura): el paginado trae 1268; conteo por jugador correcto (17 con 72/72; los 0/parciales son reales).
- Es código puro, sin cambios de datos. Deploy: push → Vercel.

### Auditoría profunda + plan de remediación

Auditoría multi-perspectiva (seguridad / correctitud / UX) con verificación manual en código. **Plan completo y tracker en `../docs/auditoria-remediacion-2026-06-08.md`** (doc compartido para escalar después a Business-quiniela). Cada item etiquetado por riesgo de datos: 🟢 solo código (nulo) · 🟡 lógica · 🔴 esquema/datos (backup→local→dry-run→commit).

**Sospechas iniciales verificadas como NO-bug (no tocar):**
- Scoring de grupos a **3/2 (no 2/1) es intencional** — `rules-content.tsx` dice "aplica a grupos y eliminatorias". El 2/1 era del proyecto viejo `quiniela-2026`.
- El selector **"¿Quién pasa?" en empates SÍ existe y funciona** (`match-prediction-card.tsx:205-254`).
- Paginación 1000 filas ya resuelta con `fetchAllRows` (ver arriba). No tocar.

**Tanda A — APLICADA Y VERIFICADA EN LOCAL (2026-06-08). Falta push a prod tras visto bueno.**
Solo código, riesgo de datos NULO. `typecheck` + `eslint` limpios; `/login` verificado en navegador sin errores de consola.
- [x] A-1 autosave: flush del guardado pendiente al desmontar (`match-prediction-card.tsx`)
- [x] A-2 ya no autollena el otro marcador en 0; guarda solo con ambos puestos
- [x] A-3 `--color-surface-3` definida en `globals.css` (light + dark)
- [x] A-4 `src/app/(app)/loading.tsx` + `error.tsx` agregados
- [x] A-5 `pattern="[0-9]*"` en score-input; PIN `type=text`+`inputMode=numeric`+máscara `-webkit-text-security` (numpad asegurado, sigue enmascarado)
- [x] A-6 copy "deadline" → "Cierre" en todas las pantallas de usuario
- [x] A-7 login respeta `?next=` (input oculto vía DOM) · A-8 contraste dark subido a 0.62 · A-9 aria-labels +/- con nombre de equipo
- [x] **A-10 (NUEVO, ⚠️ cambio de comportamiento): el middleware de auth NO corría.** Estaba en `middleware.ts` (raíz) pero con directorio `src/` Next lo busca en `src/middleware.ts`. **Nunca corrió desde el upgrade a Next 16** → la auth dependía solo de los layouts; por eso A-7 tampoco funcionaba. Movido a `src/middleware.ts`. Verificado: gate activo, `/ranking`→`/login?next=…`, `SESSION_SECRET` presente en el runtime (sin riesgo de lockout). **OJO antes de push: confirma con login real que navegas sin rebotes (activa el gate por primera vez).**

**Tanda B — APLICADA EN LOCAL (2026-06-08). typecheck + lint limpios. Falta verificación autenticada + `pnpm build` antes de push.**
Decisiones tomadas: cuadro inicial NO se usa · equipos de eliminatoria se fijan a mano.
- [x] B-1 panel admin a mano: nueva acción `saveMatchTeams` + selects de equipo por partido KO en `/admin/resultados` (`results-list.tsx`). El admin pone los equipos reales de R16→Final. (Escritura a `matches` cuando lo use, ~28-jun → metodología; el código es 🟢.)
- [~] B-2/B-3 SKIP por decisión: `early_bracket_enabled` se queda **off**; NO se cableó `scoreEarlyBracket`. Si algún día lo activan, implementar el scoring ANTES (si no, da 0 pts). El scoring de eliminatoria por partido ya funciona y no depende de esto.
- [x] B-4 unificado el motor de puntos: nuevo `src/lib/ranking-data.ts` (`getRankingTotals`); el dashboard `/` lo usa en vez de la vista SQL `player_scores` → dashboard y ranking dan el MISMO total. Bonus: el rank del dashboard ya es correcto fuera del top-5. La vista SQL queda sin usar (borrable luego con migración).

**Seguridad (A1-A4 del informe): se SALTAN en la familiar**, anotadas para Business-quiniela en el doc compartido (RLS `using(true)` legible vía anon key + service-role en todo + login sin rate-limit + auto-admin por conteo). Multi-tenant = bloqueantes; familia = tolerables.

### Rediseño del scoring (modelo oficial Adriana) — 2026-06-08

**CORRECCIÓN a un error mío previo:** había dicho que "grupos 3/2 era intencional". **Falso.** La regla real (mensaje de Adriana) es **3 exacto / 1 ganador**, y faltaban 2 componentes enteros. Reescrito el motor (`computeTotals`) a 4 fuentes:

| Fuente | Regla | Campo |
|---|---|---|
| Marcador grupos | 3 exacto / **1** ganador | `group_points` |
| Clasificados | +1 por cada uno de tus 32 (1°+2° de tus standings pronosticados + 8 terceros) que pasó a 16avos | `clasificados_points` |
| Marcador eliminatorias | 3 exacto / 1 ganador | `elim_points` |
| Cuadro (quién avanza) | 16avos→2, octavos→3, cuartos→4, semis→5, campeón→6 | `cuadro_points` |

Archivos: `scoring.ts` (const `CUADRO_BONUS` 2/3/4/5/6), `ranking-calculator.ts` (reescrito), `ranking-data.ts` + `ranking/page.tsx` (traen `bracket_picks` + `penalty_winner`, columnas: Grupos/Clasificados/Eliminatorias), `rules-content.tsx` (reglas reales), `admin/resultados` (**B-3 ahora SÍ**: selector "¿quién pasó?" en empates KO, lo necesita el cuadro). Early bracket sigue off.

**Verificado:** `scripts/test-scoring.ts` (`npx tsx`) ejecuta el motor con el ejemplo de Adriana → 33 pts (grupos 16 / clasif 3 / elim 6 / cuadro 8). ✅ typecheck + lint limpios.

**`correct_winner_pts = 1`: ✅ aplicado a prod** (Supabase SQL Editor). Verificado: `exact=3, winner=1`. El código lee este valor de la BD.

### Deploy a prod + incidente + red de seguridad (sesión 2026-06-08, cont.)

**Deploy:** commit `282c35b` pusheado a `main` → Vercel. Incluye Tanda A+B + rediseño de scoring + middleware a `src/`. `pnpm build` pasó (el output lista `Proxy (Middleware)` → el middleware en `src/` ya corre).

**Incidente (resuelto, sin pérdida de datos):** al "probar en local", el dev en realidad apuntaba a la **nube (prod)** porque `.env.local` tenía la URL de prod. Las herramientas de Admin → Herramientas ("asignar marcadores ficticios" + "crear matches de eliminatorias") cayeron en **prod** → aparecieron puntos. **Recuperado limpio:**
- Borrado: 1 pronóstico sobre KO + 31 partidos KO ficticios (`delete from predictions where match_id in (select id from matches where stage<>'group')` y `delete from matches where stage<>'group'`).
- **Cero pérdida real:** los 1268 pronósticos, 20 jugadores, 88 terceros intactos. Verificado `1268 / 0 / 1`.
- Clave: el botón "limpiar resultados" y las herramientas de relleno **NO borran pronósticos** (solo tocan/agregan `matches`); el único que sí borra todo es `supabase/reset-test-data.sql` — y **no se corrió**.

**Bug encontrado (dashboard 73/72):** el conteo "Pronósticos de grupos" sumaba TODOS los pronósticos (incluía los de KO). Arreglado en `(app)/page.tsx` (cuenta solo etapa `group` desde `myPredsWithStage`). **⏳ Sin pushear** → va al próximo deploy (no urge; muerde en fase KO real).

**Red de seguridad montada — Supabase LOCAL con Docker:**
- `supabase/config.toml`: puertos a **5433x** (api 54331 / db 54332 / studio 54333 / shadow 54330) para convivir con el stack de "App_Deportistas"; `[analytics] enabled=false` (port conflict); `[auth] enabled=true` (necesario para que la CLI emita las llaves).
- `npx supabase start` corre migraciones + seed → local con 48 equipos, 72 partidos, winner=1. Studio: **http://127.0.0.1:54333**.
- Arreglado el BOM de `.env.local` (rompía la CLI de supabase).
- **FALTA (Alberto):** apuntar `.env.local` al local. Respaldar primero (`copy .env.local .env.local.prod.bak`), luego cambiar 3 líneas:
  ```
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon local, de `npx supabase status -o env`>
  SUPABASE_SERVICE_ROLE_KEY=<service_role local>
  ```
  (Llaves demo, no secretas. Guardar como UTF-8 sin BOM.) Señal de que funcionó: la app muestra equipos "Equipo A1…" (seed), no los reales.
- Regla a futuro: **local dev = Supabase local; prod (Vercel) = su propia BD.** Nunca cruzar. Para datos realistas en local: restaurar un backup de prod (`docker exec -i supabase_db_quiniela-familia-2026 psql -U postgres < backups\...sql`).

### Pendientes abiertos (próxima sesión)
- [ ] Apuntar `.env.local` al Supabase local (3 líneas de arriba) + verificar aislamiento.
- [x] **Push del fix de conteo del dashboard (73/72)** — hecho (commit `9225eee`, en prod desde 2026-06-10).
- [x] **Commitear `supabase/config.toml`** — hecho (commit `d0ad488`, en prod desde 2026-06-10).
- [ ] B-1/B-3 (fijar equipos KO + "quién pasó" a mano) se usan cuando arranquen las eliminatorias (~28-jun).

## Cambios recientes (sesión 2026-06-07)

Calendario de fase de grupos estaba **sintético** (seed placeholder): fechas, horas y localía equivocadas. Se corrigió con los datos OFICIALES (Excel del Mundial), **sin alterar los pronósticos ya cargados**. Además se arregló un bug de "mejores terceros".

1. **fix(calendario)**: 72 partidos con localía, fecha/hora (CDMX, UTC-6), estadio y ciudad oficiales.
   - `supabase/seed.sql` reescrito (BD nueva nace bien); migración `007_match_venue` agrega columnas `stadium`/`city`.
   - `scripts/generate-schedule-fix.py` genera todo desde el Excel: el reporte comparativo, el seed y `scripts/fix-group-schedule.sql`.
   - **Aplicado a prod** con `scripts/fix-group-schedule.sql` (transaccional, idempotente, dry-run→commit). Verificación: 981 pronósticos intactos, 0 cambios de significado por equipo, 72 partidos == oficial.
   - Regla clave: localía volteada → se intercambian equipos **y** marcadores del pronóstico juntos (los pronósticos son posicionales), preservando el significado por equipo.
   - Eliminado `src/lib/data/schedule.ts` (calendario sintético muerto).
2. **fix(terceros huérfanos)**: si un jugador cambiaba un pronóstico y un equipo dejaba de ser 3°, su `third_pick` quedaba huérfano y atoraba el selector (caso Rosa María/Sudáfrica, también Gaby/Escocia).
   - `terceros/page.tsx` (B1): filtra picks no elegibles al cargar. `terceros/_actions.ts` (B2): valida elegibilidad en servidor.
   - `scripts/clean-orphan-thirds.ts`: limpieza one-time (reusa `src/lib/standings.ts`). **Aplicado a prod** (borró solo los 2 huérfanos reales).
3. **ui(fechas)**: revertido el ocultamiento de la hora (`b8c6add`); ahora `formatMatchDayMx` muestra día + hora CDMX.
4. **infra(backup)**: `scripts/backup-db.ps1` arreglado — usa `pg_dump --file` (UTF-8) y `--schema=public`. Antes el `>` de PowerShell 5.1 lo guardaba en UTF-16 y corrompía acentos/emojis. **Nota: prod es Postgres 17 → requiere pg_dump 17.**

Commits: `04cfae2` (calendario+terceros) y `bb1a37b` (hora en UI). Backup de prod previo en `backups/` (gitignored).

**Metodología (para futuros cambios de datos en prod):** backup → restaurar copia en BD local scratch → dry-run + verificación → commit; el ensayo local atrapó un bug de SQL (ambigüedad de columna) antes de tocar prod.

## Cambios recientes (sesión 2026-05-23)

1. **fix(privacy)**: `/ranking` ya no expone pronósticos de otros antes del cierre por etapa.
2. **fix(scoring)**: terceros ya no dan puntos fantasma con torneo sin empezar (`bestThirds()` devolvía 8 equipos alfabéticos con 0 pts).
3. **ui(eliminatorias)**: banner azul con "3 marcador exacto · 2 ganador correcto" arriba de cada ronda de eliminatorias.
4. **ui(nav-móvil)**: quitada la tab "Yo" (era 404). Nueva tab "Más" (hamburguesa) con Estadísticas, Públicos, Admin (si admin), Salir.
5. **infra(backup)**: agregado `scripts/backup-db.ps1` (local) y `.github/workflows/backup-supabase.yml` (diario automático). Falta configurar secret `SUPABASE_DB_URL` en GitHub.

Commit: `a3e2351 fix(privacy+nav): pronósticos privados hasta cierre, hamburguesa móvil, puntos visibles en eliminatorias`

**OJO:** está pusheado solo localmente — falta `git push origin main` para que Vercel lo despliegue. (El push se bloqueó por auto-mode de Claude Code; Alberto lo tiene que correr.)

## Pendientes / TODO conocidos

- [ ] **Push del commit `a3e2351`** → `git push origin main`. Vercel despliega solo después.
- [ ] **Configurar GitHub secret `SUPABASE_DB_URL`** para que el workflow de backup funcione (Settings → Secrets → Actions).
  - Connection string: Supabase Dashboard → Project Settings → Database → URI mode, port 5432 (no pooling 6543), con password real.
- [ ] **Verificar tras deploy** que Adriana NO ve pronósticos de los demás en `/ranking` (login con su PIN).
- [ ] **Onboarding familia**: mensaje WhatsApp con link de prod y cómo registrarse.
- [ ] **Tabla FIFA terceros**: por ahora fallback simple (ordenado pts → GD → GF → code). Si FIFA publica la tabla oficial, sustituir en `src/lib/thirds-allocation.ts`.
- [ ] **Auto-ingest resultados** (football-data.org cron diario 6am Mexico) — implementado; validar el día que arranque el Mundial.

## Backups

- **Manual local**: `pwsh ./scripts/backup-db.ps1` (necesita `pg_dump` + env `SUPABASE_DB_URL`).
- **Automático**: GitHub Actions `.github/workflows/backup-supabase.yml` corre diario 5am Mexico. Artifacts retenidos 90 días.
- **Restore**: `psql "$SUPABASE_DB_URL" < backups/quiniela-YYYY-MM-DD_HHmm.sql`

## Variables de entorno (Vercel + local)

Las que importan (en `.env.local` para dev, en Vercel para prod):

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — key anon
- `SUPABASE_SERVICE_ROLE_KEY` — service role (server only, NUNCA al cliente)
- `SESSION_SECRET` — string ≥32 chars para firmar cookies HMAC
- `CRON_SECRET` — token bearer para `/api/cron/sync-results`
- `FOOTBALL_DATA_TOKEN` — token de football-data.org (opcional, fallback a manual)

**Alberto las guarda él. Claude NO debe verlas ni intentar leerlas.**

## Convenciones de código

- Server actions en `_actions.ts` por carpeta de feature.
- Server Components por default; `"use client"` solo cuando hace falta state/event handler.
- Tipos de tablas Supabase: en cada query con `<TipoEsperado>` (no se usan tipos generados).
- Commits convencionales (`feat:`, `fix:`, `ui:`, `chore:`) + co-author de Claude.
- Sin emojis en código a menos que el usuario los pida.

## Estructura clave

```
src/
├── app/
│   ├── (app)/              # rutas autenticadas (layout con TopNav/BottomNav/RulesFab)
│   │   ├── ranking/
│   │   ├── pronosticos/
│   │   ├── bracket/        # Cuadro (en UI) — URL queda como /bracket
│   │   ├── estadisticas/
│   │   └── pronosticos-publicos/
│   ├── (auth)/             # login/registro
│   ├── admin/              # solo is_admin=true
│   └── api/cron/sync-results/
├── components/
│   ├── app/                # nav, rules-fab, heartbeat, etc.
│   └── ui/                 # button, card, input, sheet, etc.
└── lib/
    ├── supabase/
    ├── auth.ts             # PIN bcrypt + cookie HMAC firmada
    ├── scoring.ts          # cálculo de puntos
    ├── ranking-calculator.ts
    ├── standings.ts        # tabla de posiciones
    ├── bracket-structure.ts
    ├── derive-bracket.ts   # arma cuadro desde predictions
    └── thirds-allocation.ts # tabla FIFA terceros
```

## Cómo arrancar una sesión nueva con Claude

Pegale esto al inicio:

> Lee `status.md` en `C:\Users\alber\Claude_AI\proyectos\Quiniela_Mundialista\quiniela-2026-familia\`. Continuamos ahí.

Eso le da todo el contexto sin que tenga que reexplorar.
