"use server";

import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";
import { computeStandings, bestThirds, type MatchScore } from "@/lib/standings";
import {
  BRACKET_MATCHES,
  type BracketMatch,
  type SlotSource,
} from "@/lib/bracket-structure";

export type ToolResult = { ok: boolean; error?: string; message?: string };

// Distribución realista de goles por equipo en un partido: ~30%/30%/20%/12%/8% para 0..4
function randScore(): number {
  const r = Math.random();
  if (r < 0.30) return 0;
  if (r < 0.60) return 1;
  if (r < 0.80) return 2;
  if (r < 0.92) return 3;
  return 4;
}

interface PlayerRow { id: string }
interface MatchRow {
  id: string;
  stage: string;
  home_team_code: string | null;
  away_team_code: string | null;
}
interface PredRow { match_id: string }

/**
 * Llena pronósticos ficticios de fase de grupos para el usuario actual.
 * No sobreescribe pronósticos existentes.
 */
export async function fillMyPredictionsAction(): Promise<ToolResult> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { ok: false, error: "No autorizado." };
  }

  const supabase = adminClient();

  const [{ data: matches }, { data: existing }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, stage")
      .eq("stage", "group"),
    supabase
      .from("predictions")
      .select("match_id")
      .eq("player_id", actorId),
  ]);

  const existingIds = new Set(
    ((existing ?? []) as PredRow[]).map((p) => p.match_id),
  );

  const toInsert = ((matches ?? []) as MatchRow[])
    .filter((m) => !existingIds.has(m.id))
    .map((m) => ({
      player_id: actorId,
      match_id: m.id,
      home_score: randScore(),
      away_score: randScore(),
    }));

  if (toInsert.length === 0) {
    return { ok: true, message: "Ya tienes pronósticos en todos los partidos." };
  }

  const { error } = await supabase
    .from("predictions")
    .insert(toInsert as never);
  if (error) return { ok: false, error: error.message };

  await logAdminAction(actorId, "tool_fill_my_predictions", null, {
    inserted: toInsert.length,
  });
  revalidatePath("/pronosticos/grupos");
  revalidatePath("/ranking");
  revalidatePath("/pronosticos/terceros");
  return {
    ok: true,
    message: `Llené ${toInsert.length} pronósticos en blanco.`,
  };
}

/**
 * Llena pronósticos ficticios para TODOS los jugadores. Útil para tener data
 * de prueba en /estadisticas y /ranking sin que cada uno tenga que llenar.
 */
export async function fillEveryonePredictionsAction(): Promise<ToolResult> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { ok: false, error: "No autorizado." };
  }

  const supabase = adminClient();

  const [{ data: players }, { data: matches }, { data: existing }] =
    await Promise.all([
      supabase.from("players").select("id"),
      supabase.from("matches").select("id, stage").eq("stage", "group"),
      supabase.from("predictions").select("player_id, match_id"),
    ]);

  const existingSet = new Set(
    ((existing ?? []) as { player_id: string; match_id: string }[]).map(
      (p) => `${p.player_id}:${p.match_id}`,
    ),
  );

  const toInsert: Array<{
    player_id: string;
    match_id: string;
    home_score: number;
    away_score: number;
  }> = [];
  for (const player of (players ?? []) as PlayerRow[]) {
    for (const match of (matches ?? []) as MatchRow[]) {
      const key = `${player.id}:${match.id}`;
      if (existingSet.has(key)) continue;
      toInsert.push({
        player_id: player.id,
        match_id: match.id,
        home_score: randScore(),
        away_score: randScore(),
      });
    }
  }

  if (toInsert.length === 0) {
    return { ok: true, message: "Ya hay pronósticos en todos los partidos." };
  }

  // Insertar en chunks de 500 para no exceder límites.
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const { error } = await supabase
      .from("predictions")
      .insert(chunk as never);
    if (error) return { ok: false, error: error.message };
  }

  await logAdminAction(actorId, "tool_fill_everyone_predictions", null, {
    inserted: toInsert.length,
  });
  revalidatePath("/ranking");
  revalidatePath("/estadisticas");
  return {
    ok: true,
    message: `Llené ${toInsert.length} pronósticos en blanco para todos.`,
  };
}

/**
 * Asigna resultados ficticios (random) a todos los partidos de grupos.
 */
export async function fillGroupResultsAction(): Promise<ToolResult> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { ok: false, error: "No autorizado." };
  }

  const supabase = adminClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .eq("stage", "group");

  const rows = (matches ?? []) as { id: string }[];
  let updated = 0;
  for (const m of rows) {
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: randScore(),
        away_score: randScore(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", m.id);
    if (!error) updated += 1;
  }

  await logAdminAction(actorId, "tool_fill_group_results", null, { updated });
  revalidatePath("/admin/resultados");
  revalidatePath("/ranking");
  revalidatePath("/bracket");
  return { ok: true, message: `Marcadores ficticios en ${updated} partidos.` };
}

/**
 * Borra TODOS los marcadores de matches (home_score = null, away_score = null).
 */
export async function clearAllResultsAction(): Promise<ToolResult> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { ok: false, error: "No autorizado." };
  }

  const supabase = adminClient();
  const { error } = await supabase
    .from("matches")
    .update({
      home_score: null,
      away_score: null,
      penalty_winner: null,
      updated_at: new Date().toISOString(),
    } as never)
    .not("home_score", "is", null);

  if (error) return { ok: false, error: error.message };

  await logAdminAction(actorId, "tool_clear_all_results", null, {});
  revalidatePath("/admin/resultados");
  revalidatePath("/ranking");
  revalidatePath("/bracket");
  return { ok: true, message: "Marcadores limpiados." };
}

/**
 * Crea los matches de eliminatorias (R32..Final) a partir de standings reales.
 * Útil para abrir /pronosticos/eliminatorias/r32 etc. una vez que terminó la
 * fase de grupos.
 */
export async function createKnockoutMatchesAction(): Promise<ToolResult> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { ok: false, error: "No autorizado." };
  }

  const supabase = adminClient();

  const [{ data: teams }, { data: matches }] = await Promise.all([
    supabase.from("teams").select("code, name, group_letter, flag_emoji"),
    supabase
      .from("matches")
      .select("id, home_team_code, away_team_code, home_score, away_score")
      .eq("stage", "group"),
  ]);

  const teamsList = (teams ?? []) as {
    code: string;
    name: string;
    group_letter: string;
    flag_emoji: string | null;
  }[];

  const completed: MatchScore[] = [];
  for (const m of (matches ?? []) as {
    home_team_code: string | null;
    away_team_code: string | null;
    home_score: number | null;
    away_score: number | null;
  }[]) {
    if (
      !m.home_team_code ||
      !m.away_team_code ||
      m.home_score === null ||
      m.away_score === null
    ) {
      return {
        ok: false,
        error: "Faltan resultados de fase de grupos. Llena todos primero.",
      };
    }
    completed.push({
      home_team_code: m.home_team_code,
      away_team_code: m.away_team_code,
      home_score: m.home_score,
      away_score: m.away_score,
    });
  }

  const standings = computeStandings(teamsList, completed);
  const thirds = bestThirds(standings).map((r) => r.team_code);

  function resolveTeam(src: SlotSource): string | null {
    if (src.type === "group_pos") {
      const row = standings.find(
        (s) => s.group_letter === src.group && s.position === src.position,
      );
      return row?.team_code ?? null;
    }
    if (src.type === "third") {
      return thirds[src.thirdSlot - 1] ?? null;
    }
    return null; // winner_of se resuelve después
  }

  // Base kickoff: día siguiente a último partido de grupos.
  const baseKickoff = new Date("2026-06-30T18:00:00Z").getTime();
  const MS_HOUR = 60 * 60 * 1000;
  const DAYS_OFFSET: Record<string, number> = {
    r32: 0,
    r16: 4,
    qf: 8,
    sf: 12,
    final: 16,
  };

  const rows: Array<{
    id: string;
    stage: string;
    bracket_slot: string;
    home_team_code: string | null;
    away_team_code: string | null;
    kickoff_at: string;
  }> = [];

  for (let i = 0; i < BRACKET_MATCHES.length; i++) {
    const m: BracketMatch = BRACKET_MATCHES[i];
    const home = resolveTeam(m.left);
    const away = resolveTeam(m.right);
    const dayOffset = DAYS_OFFSET[m.round] ?? 0;
    const indexInRound = BRACKET_MATCHES.filter(
      (x) => x.round === m.round,
    ).indexOf(m);
    const kickoff = new Date(
      baseKickoff +
        dayOffset * 24 * MS_HOUR +
        indexInRound * 3 * MS_HOUR,
    );
    rows.push({
      id: m.id,
      stage: m.round,
      bracket_slot: m.id,
      home_team_code: home,
      away_team_code: away,
      kickoff_at: kickoff.toISOString(),
    });
  }

  for (const r of rows) {
    const { error } = await supabase
      .from("matches")
      .upsert(r as never, { onConflict: "id" });
    if (error) return { ok: false, error: error.message };
  }

  await logAdminAction(actorId, "tool_create_knockout_matches", null, {
    count: rows.length,
  });
  revalidatePath("/admin/resultados");
  revalidatePath("/bracket");
  revalidatePath("/pronosticos/eliminatorias/r32");
  return {
    ok: true,
    message: `Creé ${rows.length} matches de eliminatorias (R32 con equipos reales; R16-Final con TBD que se actualizan conforme metes resultados).`,
  };
}
