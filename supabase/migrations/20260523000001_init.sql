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
  correct_winner_pts   int not null default 1,
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
