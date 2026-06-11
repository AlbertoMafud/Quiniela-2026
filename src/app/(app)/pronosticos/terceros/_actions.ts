"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { computeStandings, pickThirds, type MatchScore } from "@/lib/standings";
import { checkStageEditable } from "@/lib/gates-server";

const schema = z.object({
  teamCodes: z.array(z.string().min(1)).length(8, "Debes seleccionar 8 equipos."),
});

export type SaveThirdsResult = { ok: boolean; error?: string };

interface TeamRow { code: string; name: string; group_letter: string }
interface MatchRow { id: string; home_team_code: string | null; away_team_code: string | null }
interface PredRow { match_id: string; home_score: number; away_score: number }

/**
 * Recalcula los 12 terceros elegibles del jugador a partir de SUS pronósticos
 * actuales (mismo cálculo que la página). Sirve para rechazar picks huérfanos:
 * un equipo que ya no quedaría 3° de su grupo no puede guardarse como tercero.
 */
async function eligibleThirdCodes(playerId: string): Promise<Set<string>> {
  const supabase = adminClient();
  const [{ data: teams }, { data: matches }, { data: preds }] = await Promise.all([
    supabase.from("teams").select("code, name, group_letter"),
    supabase
      .from("matches")
      .select("id, home_team_code, away_team_code")
      .eq("stage", "group"),
    supabase
      .from("predictions")
      .select("match_id, home_score, away_score")
      .eq("player_id", playerId),
  ]);

  const predMap = new Map(((preds ?? []) as PredRow[]).map((p) => [p.match_id, p]));
  const matchScores: MatchScore[] = [];
  for (const m of (matches ?? []) as MatchRow[]) {
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

  const standings = computeStandings((teams ?? []) as TeamRow[], matchScores);
  return new Set(pickThirds(standings).map((r) => r.team_code));
}

export async function saveThirdsAction(
  teamCodes: string[],
): Promise<SaveThirdsResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  const parsed = schema.safeParse({ teamCodes });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const supabase = adminClient();

  const gate = await checkStageEditable("thirds");
  if (!gate.editable) {
    return { ok: false, error: gate.reason ?? "Etapa cerrada." };
  }

  // Validar elegibilidad: cada código debe ser hoy un tercero del jugador.
  // Evita guardar picks huérfanos (equipos que ya no quedarían 3° de su grupo).
  const eligible = await eligibleThirdCodes(session.playerId);
  const invalid = parsed.data.teamCodes.filter((c) => !eligible.has(c));
  if (invalid.length > 0) {
    return {
      ok: false,
      error:
        "Algunos equipos ya no son terceros según tus pronósticos actuales. " +
        "Recarga la página y vuelve a elegir.",
    };
  }

  // Reemplazar selección completa: borrar y reinsertar.
  const { error: delError } = await supabase
    .from("third_picks")
    .delete()
    .eq("player_id", session.playerId);
  if (delError) return { ok: false, error: delError.message };

  const rows = parsed.data.teamCodes.map((code, idx) => ({
    player_id: session.playerId,
    team_code: code,
    pick_order: idx + 1,
  }));
  const { error } = await supabase
    .from("third_picks")
    .insert(rows as never);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/pronosticos/terceros");
  revalidatePath("/ranking");
  return { ok: true };
}
