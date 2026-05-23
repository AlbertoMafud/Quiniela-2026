-- Quiniela Familia 2026 — schema inicial
-- Custom PIN auth (no Supabase Auth). Sesión por cookie HMAC firmada en server.
-- Las policies RLS se definen en la migración 20260523000002_rls.sql.

create extension if not exists "pgcrypto";

-- ============================================================================
-- JUGADORES
-- ============================================================================
create table players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  pin_hash    text not null,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- CATÁLOGO DE EQUIPOS (48 equipos, 12 grupos A..L)
-- ============================================================================
create table teams (
  code          text primary key,
  name          text not null,
  group_letter  char(1) not null check (group_letter between 'A' and 'L'),
  flag_emoji    text
);

create index idx_teams_group on teams (group_letter);

-- ============================================================================
-- PARTIDOS (grupos y eliminatorias)
-- ============================================================================
create table matches (
  id              text primary key,
  stage           text not null check (stage in ('group','r32','r16','qf','sf','final')),
  group_letter    char(1),
  bracket_slot    text,
  home_team_code  text references teams(code),
  away_team_code  text references teams(code),
  kickoff_at      timestamptz not null,
  home_score      int check (home_score >= 0),
  away_score      int check (away_score >= 0),
  penalty_winner  text references teams(code),
  updated_at      timestamptz not null default now()
);

create index idx_matches_stage on matches (stage);
create index idx_matches_kickoff on matches (kickoff_at);
create index idx_matches_group on matches (group_letter);

-- ============================================================================
-- PRONÓSTICOS DE MARCADOR (grupos y eliminatorias)
-- ============================================================================
create table predictions (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  match_id    text not null references matches(id),
  home_score  int not null check (home_score >= 0),
  away_score  int not null check (away_score >= 0),
  updated_at  timestamptz not null default now(),
  unique (player_id, match_id)
);

create index idx_predictions_player on predictions (player_id);
create index idx_predictions_match on predictions (match_id);

-- ============================================================================
-- MEJORES TERCEROS — cada jugador escoge 8 (pick_order 1..8)
-- ============================================================================
create table third_picks (
  player_id   uuid not null references players(id) on delete cascade,
  team_code   text not null references teams(code),
  pick_order  int not null check (pick_order between 1 and 8),
  primary key (player_id, team_code)
);

create index idx_third_picks_player on third_picks (player_id);

-- ============================================================================
-- BRACKET POST-GRUPOS (equipos reales) y BRACKET DESDE EL INICIO (opcional)
-- ============================================================================
create table bracket_picks (
  player_id          uuid not null references players(id) on delete cascade,
  round              text not null check (round in ('r32','r16','qf','sf','final')),
  slot_id            text not null,
  winner_team_code   text references teams(code),
  primary key (player_id, round, slot_id)
);

create index idx_bracket_picks_player on bracket_picks (player_id, round);

create table early_bracket_picks (
  player_id          uuid not null references players(id) on delete cascade,
  round              text not null check (round in ('r32','r16','qf','sf','final')),
  slot_id            text not null,
  winner_team_code   text references teams(code),
  primary key (player_id, round, slot_id)
);

create index idx_early_bracket_picks_player on early_bracket_picks (player_id, round);

-- ============================================================================
-- PARÁMETROS DE PUNTOS (fila única, id=1, editable por admin)
-- ============================================================================
create table scoring_params (
  id                   int primary key default 1 check (id = 1),
  exact_score_pts      int not null default 3,
  correct_winner_pts   int not null default 2,
  early_r32_bonus      int not null default 1,
  early_r16_bonus      int not null default 2,
  early_qf_bonus       int not null default 3,
  early_sf_bonus       int not null default 4,
  early_final_bonus    int not null default 5,
  updated_at           timestamptz not null default now()
);

insert into scoring_params (id) values (1) on conflict do nothing;

-- ============================================================================
-- DEADLINES POR ETAPA
-- ============================================================================
create table deadlines (
  stage         text primary key,
  deadline_at   timestamptz not null
);

-- ============================================================================
-- CONFIG ADMIN (key-value JSONB)
-- ============================================================================
create table admin_config (
  key     text primary key,
  value   jsonb not null
);

insert into admin_config (key, value) values
  ('early_bracket_enabled', 'false'::jsonb),
  ('auto_ingest_enabled', 'false'::jsonb)
on conflict (key) do nothing;

-- ============================================================================
-- TABLA FIFA DE ASIGNACIÓN DE TERCEROS (seed posterior con tabla oficial)
-- combination: 8 letras alfabéticas ordenadas (ej. 'ABCDEFGH')
-- slots: jsonb {"A": "r32_m17", "B": "r32_m22", ...}
-- ============================================================================
create table thirds_allocation (
  combination   text primary key,
  slots         jsonb not null
);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================
create table audit_log (
  id                bigserial primary key,
  actor_player_id   uuid references players(id),
  action            text not null,
  target            text,
  payload           jsonb,
  created_at        timestamptz not null default now()
);

create index idx_audit_log_actor on audit_log (actor_player_id);
create index idx_audit_log_created on audit_log (created_at desc);

-- ============================================================================
-- VISTA: TABLA DE POSICIONES POR GRUPO
-- W=victorias, D=empates, L=derrotas, GF=goles a favor, GA=en contra, GD=diferencia, pts=puntos.
-- Solo cuenta partidos finalizados (home_score y away_score not null).
-- ============================================================================
create or replace view group_standings as
with finished as (
  select
    m.group_letter,
    m.home_team_code as team,
    m.home_score as gf,
    m.away_score as ga,
    case
      when m.home_score > m.away_score then 'W'
      when m.home_score = m.away_score then 'D'
      else 'L'
    end as outcome
  from matches m
  where m.stage = 'group'
    and m.home_score is not null
    and m.away_score is not null
  union all
  select
    m.group_letter,
    m.away_team_code as team,
    m.away_score as gf,
    m.home_score as ga,
    case
      when m.away_score > m.home_score then 'W'
      when m.away_score = m.home_score then 'D'
      else 'L'
    end as outcome
  from matches m
  where m.stage = 'group'
    and m.home_score is not null
    and m.away_score is not null
)
select
  t.code as team_code,
  t.name as team_name,
  t.group_letter,
  count(f.*) filter (where f.outcome = 'W') as w,
  count(f.*) filter (where f.outcome = 'D') as d,
  count(f.*) filter (where f.outcome = 'L') as l,
  coalesce(sum(f.gf), 0) as gf,
  coalesce(sum(f.ga), 0) as ga,
  coalesce(sum(f.gf), 0) - coalesce(sum(f.ga), 0) as gd,
  count(f.*) filter (where f.outcome = 'W') * 3
    + count(f.*) filter (where f.outcome = 'D') as pts
from teams t
left join finished f on f.team = t.code
group by t.code, t.name, t.group_letter;

-- ============================================================================
-- VISTA: PUNTOS POR JUGADOR
-- Suma puntos de pronósticos (marcador exacto / ganador correcto) usando scoring_params.
-- Los bonus de bracket (R32..Final) y mejores terceros se calculan en la app
-- al verificar realidad vs picks; aquí solo agregamos el desglose por jugador.
-- ============================================================================
create or replace view player_scores as
with sp as (
  select * from scoring_params where id = 1
),
match_pts as (
  select
    pr.player_id,
    case
      when m.home_score is null or m.away_score is null then 0
      when pr.home_score = m.home_score and pr.away_score = m.away_score
        then (select exact_score_pts from sp)
      when (pr.home_score - pr.away_score = 0 and m.home_score - m.away_score = 0)
        or (sign(pr.home_score - pr.away_score) = sign(m.home_score - m.away_score))
        then (select correct_winner_pts from sp)
      else 0
    end as pts
  from predictions pr
  join matches m on m.id = pr.match_id
)
select
  p.id as player_id,
  p.name as player_name,
  coalesce(sum(mp.pts), 0)::int as total_points
from players p
left join match_pts mp on mp.player_id = p.id
group by p.id, p.name;

-- ============================================================================
-- GUC HELPER — current_player_id() para usar en policies RLS
-- ============================================================================
create or replace function current_player_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.player_id', true), '')::uuid
$$;
-- Quiniela Familia 2026 — Row Level Security
--
-- Estrategia de auth: PIN custom (no Supabase Auth).
-- Server actions usan el cliente service_role (bypass RLS) y previo a query
-- ejecutan `select set_config('app.player_id', '<uuid>', true);` para que
-- las policies sepan quién es el actor. Esto es defense-in-depth: el server
-- ya validó la sesión cookie HMAC, pero las policies impiden que un jugador
-- modifique pronósticos ajenos incluso si hay un bug en server actions.
--
-- Lecturas públicas: matches, teams, scoring_params, deadlines, admin_config,
-- thirds_allocation, players (sólo nombre/admin/created_at — pin_hash bloqueado
-- por una vista o columna privilege).
--
-- Browser usa la anon key únicamente para reads. Mutaciones siempre van por
-- server actions vía service_role + GUC.

-- Bloquear pin_hash en lectura desde el anon: revoke select privileges.
revoke select on players from anon;
grant select (id, name, is_admin, created_at) on players to anon;
grant select (id, name, is_admin, created_at) on players to authenticated;

alter table players enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table third_picks enable row level security;
alter table bracket_picks enable row level security;
alter table early_bracket_picks enable row level security;
alter table scoring_params enable row level security;
alter table deadlines enable row level security;
alter table admin_config enable row level security;
alter table thirds_allocation enable row level security;
alter table audit_log enable row level security;

-- ============================================================================
-- PLAYERS — todos pueden leer (sin pin_hash). Mutaciones via service_role.
-- ============================================================================
create policy "players select all" on players
  for select using (true);

-- ============================================================================
-- TEAMS / MATCHES / SCORING_PARAMS / DEADLINES / ADMIN_CONFIG / THIRDS_ALLOCATION
-- Lectura pública; mutaciones service_role only (sin policies de insert/update).
-- ============================================================================
create policy "teams select all" on teams for select using (true);
create policy "matches select all" on matches for select using (true);
create policy "scoring_params select all" on scoring_params for select using (true);
create policy "deadlines select all" on deadlines for select using (true);
create policy "admin_config select all" on admin_config for select using (true);
create policy "thirds_allocation select all" on thirds_allocation for select using (true);

-- ============================================================================
-- PREDICTIONS — todos leen (la app esconde post-deadline); jugador escribe propio.
-- ============================================================================
create policy "predictions select all" on predictions
  for select using (true);

create policy "predictions insert own" on predictions
  for insert with check (player_id = current_player_id());

create policy "predictions update own" on predictions
  for update using (player_id = current_player_id())
  with check (player_id = current_player_id());

-- ============================================================================
-- THIRD_PICKS / BRACKET_PICKS / EARLY_BRACKET_PICKS — misma lógica
-- ============================================================================
create policy "third_picks select all" on third_picks for select using (true);
create policy "third_picks insert own" on third_picks
  for insert with check (player_id = current_player_id());
create policy "third_picks update own" on third_picks
  for update using (player_id = current_player_id())
  with check (player_id = current_player_id());
create policy "third_picks delete own" on third_picks
  for delete using (player_id = current_player_id());

create policy "bracket_picks select all" on bracket_picks for select using (true);
create policy "bracket_picks insert own" on bracket_picks
  for insert with check (player_id = current_player_id());
create policy "bracket_picks update own" on bracket_picks
  for update using (player_id = current_player_id())
  with check (player_id = current_player_id());

create policy "early_bracket_picks select all" on early_bracket_picks for select using (true);
create policy "early_bracket_picks insert own" on early_bracket_picks
  for insert with check (player_id = current_player_id());
create policy "early_bracket_picks update own" on early_bracket_picks
  for update using (player_id = current_player_id())
  with check (player_id = current_player_id());

-- ============================================================================
-- AUDIT_LOG — solo service_role escribe; admins leen
-- ============================================================================
create policy "audit_log select admin" on audit_log
  for select using (
    exists (select 1 from players where id = current_player_id() and is_admin)
  );
-- Quiniela Familia 2026 — seed data
-- Datos placeholder: 48 equipos (12 grupos × 4) y 72 partidos de fase de grupos.
-- Reemplazar con datos reales del Mundial cuando esté el sorteo confirmado.

-- ============================================================================
-- EQUIPOS — 48 placeholders (12 grupos A..L × 4 equipos)
-- ============================================================================
insert into teams (code, name, group_letter, flag_emoji) values
  ('EA1','Equipo A1','A','🏳️'),('EA2','Equipo A2','A','🏳️'),('EA3','Equipo A3','A','🏳️'),('EA4','Equipo A4','A','🏳️'),
  ('EB1','Equipo B1','B','🏳️'),('EB2','Equipo B2','B','🏳️'),('EB3','Equipo B3','B','🏳️'),('EB4','Equipo B4','B','🏳️'),
  ('EC1','Equipo C1','C','🏳️'),('EC2','Equipo C2','C','🏳️'),('EC3','Equipo C3','C','🏳️'),('EC4','Equipo C4','C','🏳️'),
  ('ED1','Equipo D1','D','🏳️'),('ED2','Equipo D2','D','🏳️'),('ED3','Equipo D3','D','🏳️'),('ED4','Equipo D4','D','🏳️'),
  ('EE1','Equipo E1','E','🏳️'),('EE2','Equipo E2','E','🏳️'),('EE3','Equipo E3','E','🏳️'),('EE4','Equipo E4','E','🏳️'),
  ('EF1','Equipo F1','F','🏳️'),('EF2','Equipo F2','F','🏳️'),('EF3','Equipo F3','F','🏳️'),('EF4','Equipo F4','F','🏳️'),
  ('EG1','Equipo G1','G','🏳️'),('EG2','Equipo G2','G','🏳️'),('EG3','Equipo G3','G','🏳️'),('EG4','Equipo G4','G','🏳️'),
  ('EH1','Equipo H1','H','🏳️'),('EH2','Equipo H2','H','🏳️'),('EH3','Equipo H3','H','🏳️'),('EH4','Equipo H4','H','🏳️'),
  ('EI1','Equipo I1','I','🏳️'),('EI2','Equipo I2','I','🏳️'),('EI3','Equipo I3','I','🏳️'),('EI4','Equipo I4','I','🏳️'),
  ('EJ1','Equipo J1','J','🏳️'),('EJ2','Equipo J2','J','🏳️'),('EJ3','Equipo J3','J','🏳️'),('EJ4','Equipo J4','J','🏳️'),
  ('EK1','Equipo K1','K','🏳️'),('EK2','Equipo K2','K','🏳️'),('EK3','Equipo K3','K','🏳️'),('EK4','Equipo K4','K','🏳️'),
  ('EL1','Equipo L1','L','🏳️'),('EL2','Equipo L2','L','🏳️'),('EL3','Equipo L3','L','🏳️'),('EL4','Equipo L4','L','🏳️')
on conflict (code) do nothing;

-- ============================================================================
-- PARTIDOS DE FASE DE GRUPOS — 72 partidos (6 por grupo)
-- Round-robin: 1v2, 1v3, 1v4, 2v3, 2v4, 3v4
-- kickoff espaciados 3h, 4 partidos por día, comenzando 2026-06-11 12:00 UTC.
-- Orden: jornada 1 (m1, m2) en días 1-6, jornada 2 (m3, m4) días 7-12, jornada 3 (m5, m6) días 13-18.
-- ============================================================================

-- Helper: generamos las 6 combinaciones round-robin por grupo
-- pattern per group X:
--   m1: EX1 vs EX2
--   m2: EX3 vs EX4
--   m3: EX1 vs EX3
--   m4: EX2 vs EX4
--   m5: EX1 vs EX4
--   m6: EX2 vs EX3

with rounds as (
  select * from (values
    (1, 1, 2), (2, 3, 4),
    (3, 1, 3), (4, 2, 4),
    (5, 1, 4), (6, 2, 3)
  ) as r(match_num, home_idx, away_idx)
),
groups as (
  select unnest(array['A','B','C','D','E','F','G','H','I','J','K','L']) as g_letter,
         generate_series(0, 11) as g_idx
),
pairings as (
  select
    'g_' || g.g_letter || '_' || r.match_num as match_id,
    g.g_letter,
    g.g_idx,
    r.match_num,
    'E' || g.g_letter || r.home_idx as home_code,
    'E' || g.g_letter || r.away_idx as away_code,
    -- Distribución: jornadas 1 (m1,m2) → días 1-6, j2 (m3,m4) → días 7-12, j3 (m5,m6) → días 13-18
    -- Dentro de cada jornada, 12 grupos × 2 partidos = 24 partidos en 6 días × 4 slots
    case
      when r.match_num in (1, 2) then 0
      when r.match_num in (3, 4) then 6
      else 12
    end
    + (g.g_idx / 2)
    as day_offset,
    -- Slot dentro del día (0..3): par (g_idx % 2 = 0) toma slots 0,1; impar toma 2,3
    case
      when r.match_num % 2 = 1 then 0
      else 1
    end
    + (g.g_idx % 2) * 2
    as slot_in_day
  from groups g
  cross join rounds r
)
insert into matches (id, stage, group_letter, home_team_code, away_team_code, kickoff_at)
select
  p.match_id,
  'group',
  p.g_letter,
  p.home_code,
  p.away_code,
  (timestamp '2026-06-11 12:00:00' at time zone 'UTC')
    + (p.day_offset || ' days')::interval
    + (p.slot_in_day * 3 || ' hours')::interval
from pairings p
on conflict (id) do nothing;

-- ============================================================================
-- DEADLINES iniciales (placeholder, ajustar en /admin/deadlines)
-- ============================================================================
insert into deadlines (stage, deadline_at) values
  ('group_stage',  '2026-06-11 11:00:00+00'),
  ('thirds',       '2026-06-29 11:00:00+00'),
  ('early_bracket','2026-06-11 11:00:00+00'),
  ('r32_picks',    '2026-07-01 11:00:00+00'),
  ('r32_scores',   '2026-07-01 11:00:00+00'),
  ('r16_picks',    '2026-07-05 11:00:00+00'),
  ('r16_scores',   '2026-07-05 11:00:00+00'),
  ('qf_picks',     '2026-07-09 11:00:00+00'),
  ('qf_scores',    '2026-07-09 11:00:00+00'),
  ('sf_picks',     '2026-07-13 11:00:00+00'),
  ('sf_scores',    '2026-07-13 11:00:00+00'),
  ('final_picks',  '2026-07-19 16:00:00+00'),
  ('final_scores', '2026-07-19 16:00:00+00')
on conflict (stage) do nothing;
