# Quiniela Familia 2026

App de quiniela del Mundial 2026 para la familia. Construida con Next.js 16 (App Router) + Supabase + Tailwind v4. Diseño premium tipo Apple, mobile-first.

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion, shadcn-style primitives.
- **Backend:** Supabase (Postgres + RLS).
- **Auth:** PIN custom (sin Supabase Auth). Sesión por cookie HMAC firmada.
- **Hosting:** Vercel.
- **Auto-ingest resultados (M6):** football-data.org vía Vercel Cron.

## Setup local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales de tu proyecto Supabase y un SESSION_SECRET aleatorio.

# 3. Iniciar Supabase local (requiere Docker Desktop)
pnpm exec supabase start
pnpm exec supabase db reset   # aplica migraciones + seed

# 4. Correr Next.js
pnpm dev
# → http://localhost:3000
```

Para generar `SESSION_SECRET` aleatorio:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Crear el proyecto Supabase en la nube (producción)

1. Ir a [supabase.com](https://supabase.com) y crear proyecto nuevo (región: us-east-1 o cercana a México).
2. Copiar `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`.
3. Copiar `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copiar `service_role key` (Settings → API) → `SUPABASE_SERVICE_ROLE_KEY` (¡secreto, nunca al cliente!).
5. Linkear repo local: `pnpm exec supabase link --project-ref <ref>`.
6. Aplicar migraciones a remoto: `pnpm exec supabase db push`.
7. Cargar seed: ejecutar `supabase/seed.sql` desde el SQL editor del dashboard.

## Deploy en Vercel

1. Ir a [vercel.com](https://vercel.com), importar este repo desde GitHub.
2. Framework: Next.js (auto-detectado).
3. Agregar variables de entorno (las mismas de `.env.local`).
4. Deploy.
5. Configurar dominio custom si aplica.

## Estructura

```
src/
  app/
    (auth)/         Login + Registro (públicos)
    (app)/          Páginas que requieren login (dashboard, pronósticos, ranking…)
    admin/          Páginas de administrador (próximo milestone)
    api/            API routes / cron jobs
  components/
    ui/             Primitivos shadcn-style (Button, Input, Card, PinInput, Label)
    app/            Componentes de la app (Navigation, DashboardCards)
  lib/
    supabase/       Clientes server, admin (service role), browser
    data/           Seeds del torneo en TS (mismos datos que supabase/seed.sql)
    auth.ts         PIN hash + sesión HMAC (server)
    auth-edge.ts    Verificación de sesión edge-compatible (middleware)
    scoring.ts      Cálculo de puntos
    utils.ts        cn(), formatDateMx(), slugify()
supabase/
  config.toml
  migrations/       Schema + RLS
  seed.sql          Equipos + 72 partidos placeholder
middleware.ts       Redirección a /login en rutas protegidas
```

## Roadmap de milestones

| # | Estado | Contenido |
|---|---|---|
| M1 | ✅ | Setup, schema, auth PIN, layout, dashboard |
| M2 | ⏳ | Pronósticos fase de grupos + ranking |
| M3 | ⏳ | Mejores terceros + reglas + admin |
| M4 | ⏳ | Tabla FIFA + bracket-desde-inicio + bracket post-grupos + eliminatorias |
| M5 | ⏳ | Vista pública pronósticos + estadísticas |
| M6 | ⏳ | Auto-ingest API + Vercel Cron + UI polish + responsive QA Playwright |
| M7 | ⏳ | Audit Codex + fix bugs + onboarding familia |

## Notas técnicas

- **Tipos de Supabase:** los manuales en `src/lib/supabase/database.types.ts` están como referencia. La actual integración no propaga el generic `<Database>` correctamente (problema conocido con `@supabase/ssr` 0.10 + `@supabase/supabase-js` 2.106); cada query castea su row con la interface local que necesite. Cuando se ejecute `pnpm supabase gen types typescript --local` se regenera el archivo y se puede tipar globalmente.
- **Custom auth + RLS:** las server actions usan service_role para escribir, y antes de cualquier insert/update por cuenta de un jugador llaman `setPlayerContext(playerId)` que ejecuta `select set_config('app.player_id', uuid, true)`. Las policies RLS validan `current_player_id()` para defense-in-depth.
- **Equipos placeholder:** seeds usan `EA1..EL4` con nombres "Equipo A1..L4". Reemplazar cuando se publique el sorteo del Mundial 2026.
