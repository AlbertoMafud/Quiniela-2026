-- Equipos reales del Mundial 2026 (sorteo del 5 de diciembre de 2025).
-- Mantenemos los codes placeholder EA1..EL4 para no romper FK en matches,
-- pero actualizamos name y flag_emoji con los datos reales.
-- Los 2 spots faltantes son ganadores de UEFA Play-off A y D (se conocen
-- entre marzo-junio 2026, antes del kick-off).

update teams set name = 'México',            flag_emoji = '🇲🇽' where code = 'EA1';
update teams set name = 'Sudáfrica',         flag_emoji = '🇿🇦' where code = 'EA2';
update teams set name = 'Corea del Sur',     flag_emoji = '🇰🇷' where code = 'EA3';
update teams set name = 'Ganador UEFA PO D', flag_emoji = '🏳️' where code = 'EA4';

update teams set name = 'Canadá',            flag_emoji = '🇨🇦' where code = 'EB1';
update teams set name = 'Ganador UEFA PO A', flag_emoji = '🏳️' where code = 'EB2';
update teams set name = 'Qatar',             flag_emoji = '🇶🇦' where code = 'EB3';
update teams set name = 'Suiza',             flag_emoji = '🇨🇭' where code = 'EB4';

update teams set name = 'Brasil',            flag_emoji = '🇧🇷' where code = 'EC1';
update teams set name = 'Marruecos',         flag_emoji = '🇲🇦' where code = 'EC2';
update teams set name = 'Escocia',           flag_emoji = '🏴󠁧󠁢󠁳󠁣󠁴󠁿' where code = 'EC3';
update teams set name = 'Haití',             flag_emoji = '🇭🇹' where code = 'EC4';

update teams set name = 'Estados Unidos',    flag_emoji = '🇺🇸' where code = 'ED1';
update teams set name = 'Paraguay',          flag_emoji = '🇵🇾' where code = 'ED2';
update teams set name = 'Turquía',           flag_emoji = '🇹🇷' where code = 'ED3';
update teams set name = 'Australia',         flag_emoji = '🇦🇺' where code = 'ED4';

update teams set name = 'Alemania',          flag_emoji = '🇩🇪' where code = 'EE1';
update teams set name = 'Costa de Marfil',   flag_emoji = '🇨🇮' where code = 'EE2';
update teams set name = 'Ecuador',           flag_emoji = '🇪🇨' where code = 'EE3';
update teams set name = 'Curazao',           flag_emoji = '🇨🇼' where code = 'EE4';

update teams set name = 'Países Bajos',      flag_emoji = '🇳🇱' where code = 'EF1';
update teams set name = 'Suecia',            flag_emoji = '🇸🇪' where code = 'EF2';
update teams set name = 'Túnez',             flag_emoji = '🇹🇳' where code = 'EF3';
update teams set name = 'Japón',             flag_emoji = '🇯🇵' where code = 'EF4';

update teams set name = 'Bélgica',           flag_emoji = '🇧🇪' where code = 'EG1';
update teams set name = 'Egipto',            flag_emoji = '🇪🇬' where code = 'EG2';
update teams set name = 'Irán',              flag_emoji = '🇮🇷' where code = 'EG3';
update teams set name = 'Nueva Zelanda',     flag_emoji = '🇳🇿' where code = 'EG4';

update teams set name = 'España',            flag_emoji = '🇪🇸' where code = 'EH1';
update teams set name = 'Arabia Saudita',    flag_emoji = '🇸🇦' where code = 'EH2';
update teams set name = 'Uruguay',           flag_emoji = '🇺🇾' where code = 'EH3';
update teams set name = 'Cabo Verde',        flag_emoji = '🇨🇻' where code = 'EH4';

update teams set name = 'Francia',           flag_emoji = '🇫🇷' where code = 'EI1';
update teams set name = 'Senegal',           flag_emoji = '🇸🇳' where code = 'EI2';
update teams set name = 'Irak',              flag_emoji = '🇮🇶' where code = 'EI3';
update teams set name = 'Noruega',           flag_emoji = '🇳🇴' where code = 'EI4';

update teams set name = 'Argentina',         flag_emoji = '🇦🇷' where code = 'EJ1';
update teams set name = 'Argelia',           flag_emoji = '🇩🇿' where code = 'EJ2';
update teams set name = 'Austria',           flag_emoji = '🇦🇹' where code = 'EJ3';
update teams set name = 'Jordania',          flag_emoji = '🇯🇴' where code = 'EJ4';

update teams set name = 'Portugal',          flag_emoji = '🇵🇹' where code = 'EK1';
update teams set name = 'RD del Congo',      flag_emoji = '🇨🇩' where code = 'EK2';
update teams set name = 'Uzbekistán',        flag_emoji = '🇺🇿' where code = 'EK3';
update teams set name = 'Colombia',          flag_emoji = '🇨🇴' where code = 'EK4';

update teams set name = 'Inglaterra',        flag_emoji = '🏴󠁧󠁢󠁥󠁮󠁧󠁿' where code = 'EL1';
update teams set name = 'Croacia',           flag_emoji = '🇭🇷' where code = 'EL2';
update teams set name = 'Ghana',             flag_emoji = '🇬🇭' where code = 'EL3';
update teams set name = 'Panamá',            flag_emoji = '🇵🇦' where code = 'EL4';
