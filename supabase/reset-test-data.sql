-- ============================================================================
-- RESET DE DATOS DE PRUEBA
-- ============================================================================
-- Limpia todo lo que metieron usuarios + admin durante las pruebas, pero
-- conserva la estructura del torneo, los jugadores registrados, los deadlines
-- y la configuración.
--
-- Lo que se BORRA:
--   - predictions (todos los marcadores que pronosticaron los jugadores)
--   - third_picks (selección de 8 mejores terceros)
--   - bracket_picks (cuadro de eliminatorias post-grupos)
--   - early_bracket_picks (bracket desde el inicio)
--   - audit_log (historial de acciones admin)
--
-- Lo que se MANTIENE:
--   - players (cuentas registradas + PIN + is_admin)
--   - teams (los 48 equipos del Mundial)
--   - matches estructura
--   - deadlines
--   - scoring_params
--   - admin_config (toggles)
--   - thirds_allocation
--
-- Adicionalmente:
--   - UPDATE matches → vuelve home_score, away_score y penalty_winner a NULL
--     (limpia los resultados ficticios que el admin asignó como prueba)
--   - DELETE de matches con stage != 'group' (los matches de eliminatorias
--     que se generaron desde herramientas → los regenera el admin cuando
--     termine la fase de grupos real)
-- ============================================================================

begin;

-- Picks y pronósticos de jugadores
delete from predictions;
delete from third_picks;
delete from bracket_picks;
delete from early_bracket_picks;

-- Limpia logs
delete from audit_log;

-- Borra matches de eliminatorias generados con la herramienta admin.
-- Los matches de fase de grupos (stage='group') se mantienen.
delete from matches where stage <> 'group';

-- Resetea resultados oficiales de fase de grupos
update matches
set home_score = null,
    away_score = null,
    penalty_winner = null,
    updated_at = now()
where stage = 'group';

commit;

-- Verifica el estado final
select 'predictions' as tabla, count(*)::text as filas from predictions
union all select 'third_picks',            count(*)::text from third_picks
union all select 'bracket_picks',          count(*)::text from bracket_picks
union all select 'early_bracket_picks',    count(*)::text from early_bracket_picks
union all select 'audit_log',              count(*)::text from audit_log
union all select 'players (conservados)',  count(*)::text from players
union all select 'teams (conservados)',    count(*)::text from teams
union all select 'matches grupo (sin score)', count(*)::text from matches where stage='group'
union all select 'matches eliminatorias',  count(*)::text from matches where stage<>'group';
