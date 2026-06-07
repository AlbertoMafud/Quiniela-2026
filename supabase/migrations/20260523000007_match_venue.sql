-- Columnas de sede para los partidos (estadio y ciudad).
-- Aditivo y sin riesgo: no toca datos existentes ni pronósticos.
-- Se cargan con datos oficiales vía seed.sql (BD nueva) o
-- scripts/fix-group-schedule.sql (corrección de prod existente).

alter table matches add column if not exists stadium text;
alter table matches add column if not exists city    text;
