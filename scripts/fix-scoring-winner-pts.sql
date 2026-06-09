-- Corrige "ganador correcto" a 1 punto (regla oficial: 3 exacto / 1 ganador).
-- El valor estaba en 2 por un default equivocado; afecta grupos y eliminatorias.
--
-- Idempotente y transaccional. Aplicar con la metodología de prod:
--   backup -> restaurar copia en BD local scratch -> correr esto (dry-run) -> commit.
--
-- Uso:  psql "$SUPABASE_DB_URL" -f scripts/fix-scoring-winner-pts.sql

begin;

update scoring_params
set correct_winner_pts = 1, updated_at = now()
where id = 1 and correct_winner_pts <> 1;

-- Verificación (debe mostrar exact=3, winner=1):
select id, exact_score_pts, correct_winner_pts from scoring_params where id = 1;

commit;
