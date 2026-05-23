-- Equipos definitivos tras el repechaje UEFA (31 marzo 2026):
-- - Ganador UEFA PO A → Bosnia y Herzegovina (Grupo B)
-- - Ganador UEFA PO D → República Checa (Grupo A)
--
-- Los otros 2 ganadores del repechaje UEFA (Suecia y Turquía) ya estaban
-- asignados directo al sorteo (Grupos F y D), no necesitan update.

update teams set name = 'República Checa',     flag_emoji = '🇨🇿' where code = 'EA4';
update teams set name = 'Bosnia y Herzegovina', flag_emoji = '🇧🇦' where code = 'EB2';
