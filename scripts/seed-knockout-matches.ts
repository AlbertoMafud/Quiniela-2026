/**
 * Carga los 31 partidos de eliminatorias (16avos→Final) con el cuadro oficial
 * confirmado el 2026-06-28: 16avos con equipos/sede/fecha reales; Octavos en
 * adelante con fecha real pero equipos TBD (se fijan a mano en
 * /admin/resultados conforme avanza el torneo).
 *
 * Reemplaza cualquier fila previa con el mismo id (upsert) — pensado para
 * partir de una BD sin estos partidos aún (no toca `predictions` ni nada que
 * ya exista para otro id).
 *
 * Seguridad:
 *   - DRY-RUN por defecto: solo imprime qué insertaría/actualizaría.
 *   - Con --apply: hace el upsert real.
 *
 * Uso (desde quiniela-2026-familia/):
 *   pnpm dlx tsx scripts/seed-knockout-matches.ts            # dry-run
 *   pnpm dlx tsx scripts/seed-knockout-matches.ts --apply    # aplica
 *
 * Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local.
 * Apunta a la BD que esté en ese .env.local — verificar cuál es ANTES de
 * correr con --apply (local mientras no esté validado; prod solo con visto
 * bueno explícito).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  OFFICIAL_R32_MATCHES,
  OFFICIAL_KICKOFF_BY_MATCH,
} from "../src/lib/official-knockout-schedule";
import { MATCHES_BY_ROUND } from "../src/lib/bracket-structure";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");

function loadEnv() {
  const raw = readFileSync(path.join(ROOT, ".env.local"), "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

interface MatchRow {
  id: string;
  stage: string;
  bracket_slot: string;
  home_team_code: string | null;
  away_team_code: string | null;
  kickoff_at: string;
  stadium: string | null;
  city: string | null;
}

function buildRows(): MatchRow[] {
  const rows: MatchRow[] = [];

  for (const m of OFFICIAL_R32_MATCHES) {
    rows.push({
      id: m.id,
      stage: "r32",
      bracket_slot: m.id,
      home_team_code: m.homeCode,
      away_team_code: m.awayCode,
      kickoff_at: m.kickoffUtc,
      stadium: m.stadium,
      city: m.city,
    });
  }

  for (const round of ["r16", "qf", "sf", "final"] as const) {
    for (const m of MATCHES_BY_ROUND[round]) {
      const kickoff = OFFICIAL_KICKOFF_BY_MATCH[m.id];
      if (!kickoff) throw new Error(`Falta kickoff oficial para ${m.id}`);
      rows.push({
        id: m.id,
        stage: round,
        bracket_slot: m.id,
        home_team_code: null,
        away_team_code: null,
        kickoff_at: kickoff,
        stadium: null,
        city: null,
      });
    }
  }

  return rows;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const rows = buildRows();

  console.log(`Conectando a: ${url}`);
  console.log(APPLY ? "MODO: --apply (escribirá en matches)\n" : "MODO: dry-run (no escribe nada)\n");
  console.log(`Partidos a cargar: ${rows.length} (16 de 16avos con equipos reales, ${rows.length - 16} TBD)\n`);
  for (const r of rows) {
    const teams = r.home_team_code ? `${r.home_team_code} vs ${r.away_team_code}` : "TBD vs TBD";
    console.log(`  ${r.id.padEnd(10)} [${r.stage.padEnd(5)}] ${teams.padEnd(15)} ${r.kickoff_at}`);
  }

  if (!APPLY) {
    console.log("\nDry-run: nada escrito. Re-correr con --apply para aplicar.");
    return;
  }

  const { error } = await supabase.from("matches").upsert(rows as never, { onConflict: "id" });
  if (error) throw new Error(`Error en upsert: ${error.message}`);
  console.log(`\n✅ ${rows.length} partidos cargados/actualizados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
