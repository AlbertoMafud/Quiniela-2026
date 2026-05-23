-- Pronósticos de eliminatoria: si el jugador prevé empate, debe definir quién
-- pasa por penales. Guardamos su pick en predictions.penalty_winner_code.
-- Para partidos de fase de grupos el campo se ignora.

alter table predictions
  add column if not exists penalty_winner_code text
  references teams(code);
