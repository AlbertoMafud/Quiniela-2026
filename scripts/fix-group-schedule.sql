-- Correccion one-time del calendario de fase de grupos (Mundial 2026).
-- Generado por scripts/generate-schedule-fix.py desde el Excel oficial.
-- Idempotente: kickoff/venue absolutos; swaps protegidos por orientacion actual.
--
-- USO (dos pasadas):
--   1) DRY-RUN: psql "$env:SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts\fix-group-schedule.sql
--      (termina en 'rollback;' -> no cambia nada, solo imprime la verificacion)
--   2) Si V1..V4 estan OK: cambiar la ultima linea 'rollback;' por 'commit;' y re-correr.

begin;

-- Snapshots para verificacion (se borran al cerrar la sesion).
create temp table _pred_before on commit drop as select * from predictions;
create temp table _match_before on commit drop as select id, home_team_code, away_team_code from matches;

-- 0) Columnas de sede (aditivo, sin riesgo).
alter table matches add column if not exists stadium text;
alter table matches add column if not exists city    text;

-- ===========================================================================
-- FASE A2: fecha, hora, estadio, ciudad (UPDATE absoluto, no toca pronosticos)
-- ===========================================================================
update matches set kickoff_at='2026-06-11 13:00:00-06', stadium='Estadio Azteca', city='Ciudad de México' where id='g_A_1';
update matches set kickoff_at='2026-06-11 20:00:00-06', stadium='Estadio Akron', city='Zapopan' where id='g_A_2';
update matches set kickoff_at='2026-06-18 19:00:00-06', stadium='Estadio Akron', city='Zapopan' where id='g_A_3';
update matches set kickoff_at='2026-06-18 10:00:00-06', stadium='Mercedes-Benz Stadium', city='Atlanta' where id='g_A_4';
update matches set kickoff_at='2026-06-24 19:00:00-06', stadium='Estadio Azteca', city='Ciudad de México' where id='g_A_5';
update matches set kickoff_at='2026-06-24 19:00:00-06', stadium='Estadio BBVA', city='Monterrey' where id='g_A_6';
update matches set kickoff_at='2026-06-12 13:00:00-06', stadium='BMO Field', city='Toronto' where id='g_B_1';
update matches set kickoff_at='2026-06-13 13:00:00-06', stadium='Levi''s Stadium', city='Santa Clara' where id='g_B_2';
update matches set kickoff_at='2026-06-18 16:00:00-06', stadium='BC Place', city='Vancouver' where id='g_B_3';
update matches set kickoff_at='2026-06-18 13:00:00-06', stadium='SoFi Stadium', city='Inglewood' where id='g_B_4';
update matches set kickoff_at='2026-06-24 13:00:00-06', stadium='BC Place', city='Vancouver' where id='g_B_5';
update matches set kickoff_at='2026-06-24 13:00:00-06', stadium='Lumen Field', city='Seattle' where id='g_B_6';
update matches set kickoff_at='2026-06-13 16:00:00-06', stadium='MetLife Stadium', city='East Rutherford' where id='g_C_1';
update matches set kickoff_at='2026-06-13 19:00:00-06', stadium='Gillette Stadium', city='Foxborough' where id='g_C_2';
update matches set kickoff_at='2026-06-24 16:00:00-06', stadium='Hard Rock Stadium', city='Miami Gardens' where id='g_C_3';
update matches set kickoff_at='2026-06-24 16:00:00-06', stadium='Mercedes-Benz Stadium', city='Atlanta' where id='g_C_4';
update matches set kickoff_at='2026-06-19 18:30:00-06', stadium='Lincoln Financial Field', city='Filadelfia' where id='g_C_5';
update matches set kickoff_at='2026-06-19 16:00:00-06', stadium='Gillette Stadium', city='Foxborough' where id='g_C_6';
update matches set kickoff_at='2026-06-12 19:00:00-06', stadium='SoFi Stadium', city='Inglewood' where id='g_D_1';
update matches set kickoff_at='2026-06-13 22:00:00-06', stadium='BC Place', city='Vancouver' where id='g_D_2';
update matches set kickoff_at='2026-06-25 20:00:00-06', stadium='SoFi Stadium', city='Inglewood' where id='g_D_3';
update matches set kickoff_at='2026-06-25 20:00:00-06', stadium='Levi''s Stadium', city='Santa Clara' where id='g_D_4';
update matches set kickoff_at='2026-06-19 13:00:00-06', stadium='Lumen Field', city='Seattle' where id='g_D_5';
update matches set kickoff_at='2026-06-19 21:00:00-06', stadium='Levi''s Stadium', city='Santa Clara' where id='g_D_6';
update matches set kickoff_at='2026-06-20 14:00:00-06', stadium='BMO Field', city='Toronto' where id='g_E_1';
update matches set kickoff_at='2026-06-20 18:00:00-06', stadium='Arrowhead Stadium', city='Kansas City' where id='g_E_2';
update matches set kickoff_at='2026-06-25 14:00:00-06', stadium='MetLife Stadium', city='East Rutherford' where id='g_E_3';
update matches set kickoff_at='2026-06-25 14:00:00-06', stadium='Lincoln Financial Field', city='Filadelfia' where id='g_E_4';
update matches set kickoff_at='2026-06-14 11:00:00-06', stadium='NRG Stadium', city='Houston' where id='g_E_5';
update matches set kickoff_at='2026-06-14 17:00:00-06', stadium='Lincoln Financial Field', city='Filadelfia' where id='g_E_6';
update matches set kickoff_at='2026-06-20 11:00:00-06', stadium='NRG Stadium', city='Houston' where id='g_F_1';
update matches set kickoff_at='2026-06-20 22:00:00-06', stadium='Estadio BBVA', city='Monterrey' where id='g_F_2';
update matches set kickoff_at='2026-06-25 17:00:00-06', stadium='Arrowhead Stadium', city='Kansas City' where id='g_F_3';
update matches set kickoff_at='2026-06-25 17:00:00-06', stadium='AT&T Stadium', city='Arlington' where id='g_F_4';
update matches set kickoff_at='2026-06-14 14:00:00-06', stadium='AT&T Stadium', city='Arlington' where id='g_F_5';
update matches set kickoff_at='2026-06-14 20:00:00-06', stadium='Estadio BBVA', city='Monterrey' where id='g_F_6';
update matches set kickoff_at='2026-06-15 13:00:00-06', stadium='Lumen Field', city='Seattle' where id='g_G_1';
update matches set kickoff_at='2026-06-15 19:00:00-06', stadium='SoFi Stadium', city='Inglewood' where id='g_G_2';
update matches set kickoff_at='2026-06-21 13:00:00-06', stadium='SoFi Stadium', city='Inglewood' where id='g_G_3';
update matches set kickoff_at='2026-06-21 19:00:00-06', stadium='BC Place', city='Vancouver' where id='g_G_4';
update matches set kickoff_at='2026-06-26 21:00:00-06', stadium='BC Place', city='Vancouver' where id='g_G_5';
update matches set kickoff_at='2026-06-26 21:00:00-06', stadium='Lumen Field', city='Seattle' where id='g_G_6';
update matches set kickoff_at='2026-06-21 10:00:00-06', stadium='Mercedes-Benz Stadium', city='Atlanta' where id='g_H_1';
update matches set kickoff_at='2026-06-21 16:00:00-06', stadium='Hard Rock Stadium', city='Miami Gardens' where id='g_H_2';
update matches set kickoff_at='2026-06-26 18:00:00-06', stadium='Estadio Akron', city='Zapopan' where id='g_H_3';
update matches set kickoff_at='2026-06-26 18:00:00-06', stadium='NRG Stadium', city='Houston' where id='g_H_4';
update matches set kickoff_at='2026-06-15 10:00:00-06', stadium='Mercedes-Benz Stadium', city='Atlanta' where id='g_H_5';
update matches set kickoff_at='2026-06-15 16:00:00-06', stadium='Hard Rock Stadium', city='Miami Gardens' where id='g_H_6';
update matches set kickoff_at='2026-06-16 13:00:00-06', stadium='MetLife Stadium', city='East Rutherford' where id='g_I_1';
update matches set kickoff_at='2026-06-16 16:00:00-06', stadium='Gillette Stadium', city='Foxborough' where id='g_I_2';
update matches set kickoff_at='2026-06-22 15:00:00-06', stadium='Lincoln Financial Field', city='Filadelfia' where id='g_I_3';
update matches set kickoff_at='2026-06-22 18:00:00-06', stadium='MetLife Stadium', city='East Rutherford' where id='g_I_4';
update matches set kickoff_at='2026-06-26 13:00:00-06', stadium='Gillette Stadium', city='Foxborough' where id='g_I_5';
update matches set kickoff_at='2026-06-26 13:00:00-06', stadium='BMO Field', city='Toronto' where id='g_I_6';
update matches set kickoff_at='2026-06-16 19:00:00-06', stadium='Arrowhead Stadium', city='Kansas City' where id='g_J_1';
update matches set kickoff_at='2026-06-16 22:00:00-06', stadium='Levi''s Stadium', city='Santa Clara' where id='g_J_2';
update matches set kickoff_at='2026-06-22 11:00:00-06', stadium='AT&T Stadium', city='Arlington' where id='g_J_3';
update matches set kickoff_at='2026-06-22 21:00:00-06', stadium='Levi''s Stadium', city='Santa Clara' where id='g_J_4';
update matches set kickoff_at='2026-06-27 20:00:00-06', stadium='AT&T Stadium', city='Arlington' where id='g_J_5';
update matches set kickoff_at='2026-06-27 20:00:00-06', stadium='Arrowhead Stadium', city='Kansas City' where id='g_J_6';
update matches set kickoff_at='2026-06-17 11:00:00-06', stadium='NRG Stadium', city='Houston' where id='g_K_1';
update matches set kickoff_at='2026-06-17 20:00:00-06', stadium='Estadio Azteca', city='Ciudad de México' where id='g_K_2';
update matches set kickoff_at='2026-06-23 11:00:00-06', stadium='NRG Stadium', city='Houston' where id='g_K_3';
update matches set kickoff_at='2026-06-23 20:00:00-06', stadium='Estadio Akron', city='Zapopan' where id='g_K_4';
update matches set kickoff_at='2026-06-27 17:30:00-06', stadium='Hard Rock Stadium', city='Miami Gardens' where id='g_K_5';
update matches set kickoff_at='2026-06-27 17:30:00-06', stadium='Mercedes-Benz Stadium', city='Atlanta' where id='g_K_6';
update matches set kickoff_at='2026-06-17 14:00:00-06', stadium='AT&T Stadium', city='Arlington' where id='g_L_1';
update matches set kickoff_at='2026-06-17 17:00:00-06', stadium='BMO Field', city='Toronto' where id='g_L_2';
update matches set kickoff_at='2026-06-23 14:00:00-06', stadium='Gillette Stadium', city='Foxborough' where id='g_L_3';
update matches set kickoff_at='2026-06-23 17:00:00-06', stadium='BMO Field', city='Toronto' where id='g_L_4';
update matches set kickoff_at='2026-06-27 15:00:00-06', stadium='MetLife Stadium', city='East Rutherford' where id='g_L_5';
update matches set kickoff_at='2026-06-27 15:00:00-06', stadium='Lincoln Financial Field', city='Filadelfia' where id='g_L_6';

-- ===========================================================================
-- FASE A3: localia volteada -> swap equipos + swap marcadores de pronosticos
-- (pronosticos PRIMERO, luego el partido; ambos con guard de orientacion).
-- ===========================================================================
-- g_A_4: Sudáfrica (local actual) -> República Checa (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_A_4' and m.home_team_code='EA2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_A_4' and home_team_code='EA2';
-- g_A_5: México (local actual) -> República Checa (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_A_5' and m.home_team_code='EA1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_A_5' and home_team_code='EA1';
-- g_B_4: Bosnia y Herzegovina (local actual) -> Suiza (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_B_4' and m.home_team_code='EB2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_B_4' and home_team_code='EB2';
-- g_B_5: Canadá (local actual) -> Suiza (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_B_5' and m.home_team_code='EB1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_B_5' and home_team_code='EB1';
-- g_C_2: Escocia (local actual) -> Haití (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_C_2' and m.home_team_code='EC3';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_C_2' and home_team_code='EC3';
-- g_C_3: Brasil (local actual) -> Escocia (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_C_3' and m.home_team_code='EC1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_C_3' and home_team_code='EC1';
-- g_C_6: Marruecos (local actual) -> Escocia (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_C_6' and m.home_team_code='EC2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_C_6' and home_team_code='EC2';
-- g_D_2: Turquía (local actual) -> Australia (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_D_2' and m.home_team_code='ED3';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_D_2' and home_team_code='ED3';
-- g_D_3: Estados Unidos (local actual) -> Turquía (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_D_3' and m.home_team_code='ED1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_D_3' and home_team_code='ED1';
-- g_D_6: Paraguay (local actual) -> Turquía (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_D_6' and m.home_team_code='ED2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_D_6' and home_team_code='ED2';
-- g_E_3: Alemania (local actual) -> Ecuador (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_E_3' and m.home_team_code='EE1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_E_3' and home_team_code='EE1';
-- g_E_4: Costa de Marfil (local actual) -> Curazao (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_E_4' and m.home_team_code='EE2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_E_4' and home_team_code='EE2';
-- g_F_3: Países Bajos (local actual) -> Túnez (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_F_3' and m.home_team_code='EF1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_F_3' and home_team_code='EF1';
-- g_F_4: Suecia (local actual) -> Japón (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_F_4' and m.home_team_code='EF2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_F_4' and home_team_code='EF2';
-- g_G_4: Egipto (local actual) -> Nueva Zelanda (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_G_4' and m.home_team_code='EG2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_G_4' and home_team_code='EG2';
-- g_G_5: Bélgica (local actual) -> Nueva Zelanda (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_G_5' and m.home_team_code='EG1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_G_5' and home_team_code='EG1';
-- g_H_3: España (local actual) -> Uruguay (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_H_3' and m.home_team_code='EH1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_H_3' and home_team_code='EH1';
-- g_H_4: Arabia Saudita (local actual) -> Cabo Verde (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_H_4' and m.home_team_code='EH2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_H_4' and home_team_code='EH2';
-- g_I_4: Senegal (local actual) -> Noruega (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_I_4' and m.home_team_code='EI2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_I_4' and home_team_code='EI2';
-- g_I_5: Francia (local actual) -> Noruega (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_I_5' and m.home_team_code='EI1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_I_5' and home_team_code='EI1';
-- g_J_4: Argelia (local actual) -> Jordania (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_J_4' and m.home_team_code='EJ2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_J_4' and home_team_code='EJ2';
-- g_J_5: Argentina (local actual) -> Jordania (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_J_5' and m.home_team_code='EJ1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_J_5' and home_team_code='EJ1';
-- g_K_4: RD del Congo (local actual) -> Colombia (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_K_4' and m.home_team_code='EK2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_K_4' and home_team_code='EK2';
-- g_K_5: Portugal (local actual) -> Colombia (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_K_5' and m.home_team_code='EK1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_K_5' and home_team_code='EK1';
-- g_L_4: Croacia (local actual) -> Panamá (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_L_4' and m.home_team_code='EL2';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_L_4' and home_team_code='EL2';
-- g_L_5: Inglaterra (local actual) -> Panamá (local oficial)
update predictions p set home_score=p.away_score, away_score=p.home_score from matches m where p.match_id=m.id and m.id='g_L_5' and m.home_team_code='EL1';
update matches set home_team_code=away_team_code, away_team_code=home_team_code, home_score=away_score, away_score=home_score where id='g_L_5' and home_team_code='EL1';

-- ===========================================================================
-- VERIFICACION (se imprime ANTES del rollback/commit).
-- ===========================================================================

-- (V1) Conteo de pronosticos intacto. Esperado: antes = despues.
select (select count(*) from _pred_before) as antes,
       (select count(*) from predictions)  as despues;

-- (V2) Significado por identidad preservado. Esperado: filas = 0.
--      Cada (jugador, partido, equipo, goles) de antes existe despues y viceversa.
with before_unpivot as (
  select b.player_id, b.match_id, mb.home_team_code as team, b.home_score as goals
  from _pred_before b join _match_before mb on mb.id=b.match_id
  union all
  select b.player_id, b.match_id, mb.away_team_code, b.away_score
  from _pred_before b join _match_before mb on mb.id=b.match_id),
after_unpivot as (
  select p.player_id, p.match_id, m.home_team_code as team, p.home_score as goals
  from predictions p join matches m on m.id=p.match_id
  union all
  select p.player_id, p.match_id, m.away_team_code, p.away_score
  from predictions p join matches m on m.id=p.match_id)
select 'meaning_changed' as problema, count(*) as filas from (
  (select * from before_unpivot except select * from after_unpivot)
  union all
  (select * from after_unpivot except select * from before_unpivot)) d;

-- (V3) Estado final == oficial (localia, kickoff, sede). Esperado: 0 filas.
with official(match_id, home_code, away_code, kickoff_at, stadium, city) as (values
  ('g_A_1','EA1','EA2',timestamptz '2026-06-11 13:00:00-06','Estadio Azteca','Ciudad de México'),
  ('g_A_2','EA3','EA4',timestamptz '2026-06-11 20:00:00-06','Estadio Akron','Zapopan'),
  ('g_A_3','EA1','EA3',timestamptz '2026-06-18 19:00:00-06','Estadio Akron','Zapopan'),
  ('g_A_4','EA4','EA2',timestamptz '2026-06-18 10:00:00-06','Mercedes-Benz Stadium','Atlanta'),
  ('g_A_5','EA4','EA1',timestamptz '2026-06-24 19:00:00-06','Estadio Azteca','Ciudad de México'),
  ('g_A_6','EA2','EA3',timestamptz '2026-06-24 19:00:00-06','Estadio BBVA','Monterrey'),
  ('g_B_1','EB1','EB2',timestamptz '2026-06-12 13:00:00-06','BMO Field','Toronto'),
  ('g_B_2','EB3','EB4',timestamptz '2026-06-13 13:00:00-06','Levi''s Stadium','Santa Clara'),
  ('g_B_3','EB1','EB3',timestamptz '2026-06-18 16:00:00-06','BC Place','Vancouver'),
  ('g_B_4','EB4','EB2',timestamptz '2026-06-18 13:00:00-06','SoFi Stadium','Inglewood'),
  ('g_B_5','EB4','EB1',timestamptz '2026-06-24 13:00:00-06','BC Place','Vancouver'),
  ('g_B_6','EB2','EB3',timestamptz '2026-06-24 13:00:00-06','Lumen Field','Seattle'),
  ('g_C_1','EC1','EC2',timestamptz '2026-06-13 16:00:00-06','MetLife Stadium','East Rutherford'),
  ('g_C_2','EC4','EC3',timestamptz '2026-06-13 19:00:00-06','Gillette Stadium','Foxborough'),
  ('g_C_3','EC3','EC1',timestamptz '2026-06-24 16:00:00-06','Hard Rock Stadium','Miami Gardens'),
  ('g_C_4','EC2','EC4',timestamptz '2026-06-24 16:00:00-06','Mercedes-Benz Stadium','Atlanta'),
  ('g_C_5','EC1','EC4',timestamptz '2026-06-19 18:30:00-06','Lincoln Financial Field','Filadelfia'),
  ('g_C_6','EC3','EC2',timestamptz '2026-06-19 16:00:00-06','Gillette Stadium','Foxborough'),
  ('g_D_1','ED1','ED2',timestamptz '2026-06-12 19:00:00-06','SoFi Stadium','Inglewood'),
  ('g_D_2','ED4','ED3',timestamptz '2026-06-13 22:00:00-06','BC Place','Vancouver'),
  ('g_D_3','ED3','ED1',timestamptz '2026-06-25 20:00:00-06','SoFi Stadium','Inglewood'),
  ('g_D_4','ED2','ED4',timestamptz '2026-06-25 20:00:00-06','Levi''s Stadium','Santa Clara'),
  ('g_D_5','ED1','ED4',timestamptz '2026-06-19 13:00:00-06','Lumen Field','Seattle'),
  ('g_D_6','ED3','ED2',timestamptz '2026-06-19 21:00:00-06','Levi''s Stadium','Santa Clara'),
  ('g_E_1','EE1','EE2',timestamptz '2026-06-20 14:00:00-06','BMO Field','Toronto'),
  ('g_E_2','EE3','EE4',timestamptz '2026-06-20 18:00:00-06','Arrowhead Stadium','Kansas City'),
  ('g_E_3','EE3','EE1',timestamptz '2026-06-25 14:00:00-06','MetLife Stadium','East Rutherford'),
  ('g_E_4','EE4','EE2',timestamptz '2026-06-25 14:00:00-06','Lincoln Financial Field','Filadelfia'),
  ('g_E_5','EE1','EE4',timestamptz '2026-06-14 11:00:00-06','NRG Stadium','Houston'),
  ('g_E_6','EE2','EE3',timestamptz '2026-06-14 17:00:00-06','Lincoln Financial Field','Filadelfia'),
  ('g_F_1','EF1','EF2',timestamptz '2026-06-20 11:00:00-06','NRG Stadium','Houston'),
  ('g_F_2','EF3','EF4',timestamptz '2026-06-20 22:00:00-06','Estadio BBVA','Monterrey'),
  ('g_F_3','EF3','EF1',timestamptz '2026-06-25 17:00:00-06','Arrowhead Stadium','Kansas City'),
  ('g_F_4','EF4','EF2',timestamptz '2026-06-25 17:00:00-06','AT&T Stadium','Arlington'),
  ('g_F_5','EF1','EF4',timestamptz '2026-06-14 14:00:00-06','AT&T Stadium','Arlington'),
  ('g_F_6','EF2','EF3',timestamptz '2026-06-14 20:00:00-06','Estadio BBVA','Monterrey'),
  ('g_G_1','EG1','EG2',timestamptz '2026-06-15 13:00:00-06','Lumen Field','Seattle'),
  ('g_G_2','EG3','EG4',timestamptz '2026-06-15 19:00:00-06','SoFi Stadium','Inglewood'),
  ('g_G_3','EG1','EG3',timestamptz '2026-06-21 13:00:00-06','SoFi Stadium','Inglewood'),
  ('g_G_4','EG4','EG2',timestamptz '2026-06-21 19:00:00-06','BC Place','Vancouver'),
  ('g_G_5','EG4','EG1',timestamptz '2026-06-26 21:00:00-06','BC Place','Vancouver'),
  ('g_G_6','EG2','EG3',timestamptz '2026-06-26 21:00:00-06','Lumen Field','Seattle'),
  ('g_H_1','EH1','EH2',timestamptz '2026-06-21 10:00:00-06','Mercedes-Benz Stadium','Atlanta'),
  ('g_H_2','EH3','EH4',timestamptz '2026-06-21 16:00:00-06','Hard Rock Stadium','Miami Gardens'),
  ('g_H_3','EH3','EH1',timestamptz '2026-06-26 18:00:00-06','Estadio Akron','Zapopan'),
  ('g_H_4','EH4','EH2',timestamptz '2026-06-26 18:00:00-06','NRG Stadium','Houston'),
  ('g_H_5','EH1','EH4',timestamptz '2026-06-15 10:00:00-06','Mercedes-Benz Stadium','Atlanta'),
  ('g_H_6','EH2','EH3',timestamptz '2026-06-15 16:00:00-06','Hard Rock Stadium','Miami Gardens'),
  ('g_I_1','EI1','EI2',timestamptz '2026-06-16 13:00:00-06','MetLife Stadium','East Rutherford'),
  ('g_I_2','EI3','EI4',timestamptz '2026-06-16 16:00:00-06','Gillette Stadium','Foxborough'),
  ('g_I_3','EI1','EI3',timestamptz '2026-06-22 15:00:00-06','Lincoln Financial Field','Filadelfia'),
  ('g_I_4','EI4','EI2',timestamptz '2026-06-22 18:00:00-06','MetLife Stadium','East Rutherford'),
  ('g_I_5','EI4','EI1',timestamptz '2026-06-26 13:00:00-06','Gillette Stadium','Foxborough'),
  ('g_I_6','EI2','EI3',timestamptz '2026-06-26 13:00:00-06','BMO Field','Toronto'),
  ('g_J_1','EJ1','EJ2',timestamptz '2026-06-16 19:00:00-06','Arrowhead Stadium','Kansas City'),
  ('g_J_2','EJ3','EJ4',timestamptz '2026-06-16 22:00:00-06','Levi''s Stadium','Santa Clara'),
  ('g_J_3','EJ1','EJ3',timestamptz '2026-06-22 11:00:00-06','AT&T Stadium','Arlington'),
  ('g_J_4','EJ4','EJ2',timestamptz '2026-06-22 21:00:00-06','Levi''s Stadium','Santa Clara'),
  ('g_J_5','EJ4','EJ1',timestamptz '2026-06-27 20:00:00-06','AT&T Stadium','Arlington'),
  ('g_J_6','EJ2','EJ3',timestamptz '2026-06-27 20:00:00-06','Arrowhead Stadium','Kansas City'),
  ('g_K_1','EK1','EK2',timestamptz '2026-06-17 11:00:00-06','NRG Stadium','Houston'),
  ('g_K_2','EK3','EK4',timestamptz '2026-06-17 20:00:00-06','Estadio Azteca','Ciudad de México'),
  ('g_K_3','EK1','EK3',timestamptz '2026-06-23 11:00:00-06','NRG Stadium','Houston'),
  ('g_K_4','EK4','EK2',timestamptz '2026-06-23 20:00:00-06','Estadio Akron','Zapopan'),
  ('g_K_5','EK4','EK1',timestamptz '2026-06-27 17:30:00-06','Hard Rock Stadium','Miami Gardens'),
  ('g_K_6','EK2','EK3',timestamptz '2026-06-27 17:30:00-06','Mercedes-Benz Stadium','Atlanta'),
  ('g_L_1','EL1','EL2',timestamptz '2026-06-17 14:00:00-06','AT&T Stadium','Arlington'),
  ('g_L_2','EL3','EL4',timestamptz '2026-06-17 17:00:00-06','BMO Field','Toronto'),
  ('g_L_3','EL1','EL3',timestamptz '2026-06-23 14:00:00-06','Gillette Stadium','Foxborough'),
  ('g_L_4','EL4','EL2',timestamptz '2026-06-23 17:00:00-06','BMO Field','Toronto'),
  ('g_L_5','EL4','EL1',timestamptz '2026-06-27 15:00:00-06','MetLife Stadium','East Rutherford'),
  ('g_L_6','EL2','EL3',timestamptz '2026-06-27 15:00:00-06','Lincoln Financial Field','Filadelfia')
)
select m.id, m.home_team_code, o.home_code, m.away_team_code, o.away_code, m.kickoff_at
from matches m join official o on o.match_id=m.id
where m.home_team_code<>o.home_code or m.away_team_code<>o.away_code
   or m.kickoff_at<>o.kickoff_at
   or m.stadium is distinct from o.stadium or m.city is distinct from o.city;

-- (V4) Total de partidos de grupo. Esperado: 72.
select count(*) as total_group from matches where stage='group';

-- ---------------------------------------------------------------------------
-- Si V1 (antes=despues), V2 (0), V3 (0) y V4 (72) -> cambiar la ultima linea a
-- 'commit;' y re-correr. Mientras diga 'rollback;' es dry-run (no cambia nada).
-- ---------------------------------------------------------------------------
rollback;  -- <<< DRY-RUN. Cambiar a 'commit;' para aplicar de verdad.
