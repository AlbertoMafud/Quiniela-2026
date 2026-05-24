# Quiniela Familia 2026 — Status

> Última actualización: **2026-05-23** (sesión cerrada con fixes de privacidad + nav móvil + backups)

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
