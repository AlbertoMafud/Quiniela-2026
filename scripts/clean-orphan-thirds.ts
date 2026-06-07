/**
 * Limpia "mejores terceros" huérfanos: filas de third_picks cuyo equipo ya no
 * sería 3° de su grupo según los pronósticos ACTUALES del jugador (causa del bug
 * que dejaba el selector atorado). Reusa la MISMA lógica que la app
 * (src/lib/standings.ts) para no divergir.
 *
 * Seguridad:
 *   - DRY-RUN por defecto: solo imprime qué borraría. NO toca la BD.
 *   - Con --apply: borra las filas huérfanas (y solo esas).
 *   - Salta jugadores con pronósticos de grupo incompletos (< 72): sin los 72
 *     no se puede determinar de forma confiable quién queda 3°.
 *   - Nunca toca `predictions` ni picks válidos.
 *
 * Uso (desde quiniela-2026-familia/):
 *   pnpm dlx tsx scripts/clean-orphan-thirds.ts            # dry-run
 *   pnpm dlx tsx scripts/clean-orphan-thirds.ts --apply    # aplica
 *
 * Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local.
 * Apunta a la BD que esté en ese .env.local (local para el ensayo, prod para el real).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { computeStandings, pickThirds, type MatchScore } from "../src/lib/standings";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");

// --- cargar .env.local sin dependencias ------------------------------------
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

interface Team { code: string; name: string; group_letter: string }
interface Match { id: string; home_team_code: string | null; away_team_code: string | null }
interface Pred { player_id: string; match_id: string; home_score: number; away_score: number }
interface Player { id: string; name: string }
interface Pick { player_id: string; team_code: string }

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log(`Conectando a: ${url}`);
  console.log(APPLY ? "MODO: --apply (borrará huérfanos)\n" : "MODO: dry-run (no borra nada)\n");

  const [players, teams, matches, preds, picks] = await Promise.all([
    supabase.from("players").select("id, name"),
    supabase.from("teams").select("code, name, group_letter"),
    supabase.from("matches").select("id, home_team_code, away_team_code").eq("stage", "group"),
    supabase.from("predictions").select("player_id, match_id, home_score, away_score"),
    supabase.from("third_picks").select("player_id, team_code"),
  ]);
  for (const [name, r] of Object.entries({ players, teams, matches, preds, picks })) {
    if (r.error) throw new Error(`Error leyendo ${name}: ${r.error.message}`);
  }

  const teamRows = (teams.data ?? []) as Team[];
  const matchRows = (matches.data ?? []) as Match[];
  const groupMatchIds = new Set(matchRows.map((m) => m.id));
  const groupTotal = matchRows.length; // 72

  const predsByPlayer = new Map<string, Pred[]>();
  for (const p of (preds.data ?? []) as Pred[]) {
    if (!groupMatchIds.has(p.match_id)) continue;
    const list = predsByPlayer.get(p.player_id);
    if (list) list.push(p);
    else predsByPlayer.set(p.player_id, [p]);
  }
  const picksByPlayer = new Map<string, string[]>();
  for (const pk of (picks.data ?? []) as Pick[]) {
    const list = picksByPlayer.get(pk.player_id);
    if (list) list.push(pk.team_code);
    else picksByPlayer.set(pk.player_id, [pk.team_code]);
  }
  const teamName = new Map(teamRows.map((t) => [t.code, t.name]));

  let totalOrphans = 0;
  let affectedPlayers = 0;
  let skipped = 0;

  for (const pl of (players.data ?? []) as Player[]) {
    const myPicks = picksByPlayer.get(pl.id) ?? [];
    if (myPicks.length === 0) continue;

    const myPreds = predsByPlayer.get(pl.id) ?? [];
    if (myPreds.length < groupTotal) {
      console.log(`- ${pl.name}: SALTADO (pronósticos ${myPreds.length}/${groupTotal} incompletos)`);
      skipped++;
      continue;
    }

    const predMap = new Map(myPreds.map((p) => [p.match_id, p]));
    const matchScores: MatchScore[] = [];
    for (const m of matchRows) {
      if (!m.home_team_code || !m.away_team_code) continue;
      const p = predMap.get(m.id);
      if (!p) continue;
      matchScores.push({
        home_team_code: m.home_team_code,
        away_team_code: m.away_team_code,
        home_score: p.home_score,
        away_score: p.away_score,
      });
    }
    const eligible = new Set(pickThirds(computeStandings(teamRows, matchScores)).map((r) => r.team_code));
    const orphans = myPicks.filter((c) => !eligible.has(c));
    if (orphans.length === 0) continue;

    affectedPlayers++;
    totalOrphans += orphans.length;
    const labels = orphans.map((c) => `${teamName.get(c) ?? c} (${c})`).join(", ");
    console.log(`- ${pl.name}: ${orphans.length} huérfano(s) -> ${labels}`);

    if (APPLY) {
      const { error } = await supabase
        .from("third_picks")
        .delete()
        .eq("player_id", pl.id)
        .in("team_code", orphans);
      if (error) throw new Error(`Error borrando picks de ${pl.name}: ${error.message}`);
      console.log(`    borrados.`);
    }
  }

  console.log("\n========== RESUMEN ==========");
  console.log(`Jugadores afectados : ${affectedPlayers}`);
  console.log(`Picks huérfanos     : ${totalOrphans}`);
  console.log(`Saltados (incompletos): ${skipped}`);
  console.log(APPLY ? "Estado: APLICADO." : "Estado: dry-run (re-correr con --apply para borrar).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
