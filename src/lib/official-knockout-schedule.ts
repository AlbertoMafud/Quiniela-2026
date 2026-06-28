// Cuadro oficial de eliminatorias confirmado el 2026-06-28 (sorteo + calendario
// real FIFA, fuente: Excel "eliminatorias_mundial_2026_cdmx" — hojas "Cruces
// definidos" y "Bracket completo"). Reemplaza el emparejamiento placeholder de
// `bracket-structure.ts` para 16avos en adelante.
//
// Los 16 cruces de 16avos están reordenados (ids r32_m1..r32_m16) de forma que
// el pareo adyacente genérico que ya usa `bracket-structure.ts`
// (r32_m(2k-1) vs r32_m(2k) -> r16_mk, etc.) reproduce el árbol real de
// Octavos/Cuartos/Semis/Final. Verificado a mano contra las 8 llaves de
// Octavos, 4 de Cuartos y 2 de Semis del Excel — no tocar el orden sin
// re-verificar contra la fuente oficial.

// OJO equipos: `teams.code` NUNCA se renombró a códigos FIFA (GER/RSA/...) —
// las migraciones 003/004 solo actualizaron name/flag_emoji y dejaron los
// codes placeholder originales (EA1..EL4) para no romper el FK de `matches`.
// Por eso aquí usamos esos mismos codes; el comentario trae el país real.

export interface OfficialR32Match {
  id: string;
  homeCode: string;
  homeName: string;
  awayCode: string;
  awayName: string;
  kickoffUtc: string; // ISO, ya convertido de CDMX (+6h, sin horario de verano)
  stadium: string;
  city: string;
}

export const OFFICIAL_R32_MATCHES: OfficialR32Match[] = [
  { id: "r32_m1", homeCode: "EE1", homeName: "Alemania", awayCode: "ED2", awayName: "Paraguay", kickoffUtc: "2026-06-29T20:30:00Z", stadium: "Gillette Stadium", city: "Boston, EE. UU." },
  { id: "r32_m2", homeCode: "EI1", homeName: "Francia", awayCode: "EF2", awayName: "Suecia", kickoffUtc: "2026-06-30T21:00:00Z", stadium: "MetLife Stadium", city: "Nueva York/Nueva Jersey, EE. UU." },
  { id: "r32_m3", homeCode: "EA2", homeName: "Sudáfrica", awayCode: "EB1", awayName: "Canadá", kickoffUtc: "2026-06-28T19:00:00Z", stadium: "SoFi Stadium", city: "Los Ángeles, EE. UU." },
  { id: "r32_m4", homeCode: "EF1", homeName: "Países Bajos", awayCode: "EC2", awayName: "Marruecos", kickoffUtc: "2026-06-30T01:00:00Z", stadium: "Estadio BBVA", city: "Monterrey, México" },
  { id: "r32_m5", homeCode: "EK1", homeName: "Portugal", awayCode: "EL2", awayName: "Croacia", kickoffUtc: "2026-07-02T23:00:00Z", stadium: "BMO Field", city: "Toronto, Canadá" },
  { id: "r32_m6", homeCode: "EH1", homeName: "España", awayCode: "EJ3", awayName: "Austria", kickoffUtc: "2026-07-02T19:00:00Z", stadium: "SoFi Stadium", city: "Los Ángeles, EE. UU." },
  { id: "r32_m7", homeCode: "ED1", homeName: "Estados Unidos", awayCode: "EB2", awayName: "Bosnia y Herzegovina", kickoffUtc: "2026-07-02T00:00:00Z", stadium: "Levi's Stadium", city: "San Francisco Bay Area, EE. UU." },
  { id: "r32_m8", homeCode: "EG1", homeName: "Bélgica", awayCode: "EI2", awayName: "Senegal", kickoffUtc: "2026-07-01T20:00:00Z", stadium: "Lumen Field", city: "Seattle, EE. UU." },
  { id: "r32_m9", homeCode: "EC1", homeName: "Brasil", awayCode: "EF4", awayName: "Japón", kickoffUtc: "2026-06-29T17:00:00Z", stadium: "NRG Stadium", city: "Houston, EE. UU." },
  { id: "r32_m10", homeCode: "EE2", homeName: "Costa de Marfil", awayCode: "EI4", awayName: "Noruega", kickoffUtc: "2026-06-30T17:00:00Z", stadium: "AT&T Stadium", city: "Dallas, EE. UU." },
  { id: "r32_m11", homeCode: "EA1", homeName: "México", awayCode: "EE3", awayName: "Ecuador", kickoffUtc: "2026-07-01T01:00:00Z", stadium: "Estadio Azteca", city: "Ciudad de México, México" },
  { id: "r32_m12", homeCode: "EL1", homeName: "Inglaterra", awayCode: "EK2", awayName: "RD del Congo", kickoffUtc: "2026-07-01T16:00:00Z", stadium: "Mercedes-Benz Stadium", city: "Atlanta, EE. UU." },
  { id: "r32_m13", homeCode: "EJ1", homeName: "Argentina", awayCode: "EH4", awayName: "Cabo Verde", kickoffUtc: "2026-07-03T22:00:00Z", stadium: "Hard Rock Stadium", city: "Miami, EE. UU." },
  { id: "r32_m14", homeCode: "ED4", homeName: "Australia", awayCode: "EG2", awayName: "Egipto", kickoffUtc: "2026-07-03T18:00:00Z", stadium: "AT&T Stadium", city: "Dallas, EE. UU." },
  { id: "r32_m15", homeCode: "EB4", homeName: "Suiza", awayCode: "EJ2", awayName: "Argelia", kickoffUtc: "2026-07-03T03:00:00Z", stadium: "BC Place Vancouver", city: "Vancouver, Canadá" },
  { id: "r32_m16", homeCode: "EK4", homeName: "Colombia", awayCode: "EL3", awayName: "Ghana", kickoffUtc: "2026-07-04T01:30:00Z", stadium: "Arrowhead Stadium", city: "Kansas City, EE. UU." },
];

// Kickoff oficial de Octavos en adelante. Sin sede/ciudad: FIFA todavía no las
// anuncia para estas rondas (dependen de qué equipos avanzan).
export const OFFICIAL_KICKOFF_BY_MATCH: Record<string, string> = {
  r16_m1: "2026-07-04T21:00:00Z",
  r16_m2: "2026-07-04T17:00:00Z",
  r16_m3: "2026-07-06T19:00:00Z",
  r16_m4: "2026-07-07T00:00:00Z",
  r16_m5: "2026-07-05T20:00:00Z",
  r16_m6: "2026-07-06T00:00:00Z",
  r16_m7: "2026-07-07T16:00:00Z",
  r16_m8: "2026-07-07T20:00:00Z",
  qf_m1: "2026-07-09T20:00:00Z",
  qf_m2: "2026-07-10T19:00:00Z",
  qf_m3: "2026-07-11T21:00:00Z",
  qf_m4: "2026-07-12T01:00:00Z",
  sf_m1: "2026-07-14T19:00:00Z",
  sf_m2: "2026-07-15T19:00:00Z",
  final_m1: "2026-07-19T19:00:00Z",
};
