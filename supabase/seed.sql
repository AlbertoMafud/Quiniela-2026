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
