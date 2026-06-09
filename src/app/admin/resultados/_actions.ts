"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";

const schema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
  penaltyWinner: z.string().nullable().optional(),
});

const clearSchema = z.object({ matchId: z.string().min(1) });

export type ResultActionState = { ok?: boolean; error?: string };

export async function saveMatchResult(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
  penaltyWinner?: string | null;
}): Promise<ResultActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  // El avanzador (penales/tiempo extra) solo aplica si a 90' fue empate.
  const isDraw = parsed.data.homeScore === parsed.data.awayScore;
  const penaltyWinner = isDraw ? parsed.data.penaltyWinner ?? null : null;

  const supabase = adminClient();
  const { error } = await supabase
    .from("matches")
    .update({
      home_score: parsed.data.homeScore,
      away_score: parsed.data.awayScore,
      penalty_winner: penaltyWinner,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", parsed.data.matchId);

  if (error) return { error: error.message };

  await logAdminAction(actorId, "save_match_result", parsed.data.matchId, {
    home: parsed.data.homeScore,
    away: parsed.data.awayScore,
    penalty_winner: penaltyWinner,
  });
  revalidatePath("/admin/resultados");
  revalidatePath("/ranking");
  revalidatePath("/bracket");
  revalidatePath("/");
  return { ok: true };
}

export async function clearMatchResult(input: { matchId: string }): Promise<ResultActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }
  const parsed = clearSchema.safeParse(input);
  if (!parsed.success) return { error: "ID inválido." };

  const supabase = adminClient();
  const { error } = await supabase
    .from("matches")
    .update({
      home_score: null,
      away_score: null,
      penalty_winner: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", parsed.data.matchId);

  if (error) return { error: error.message };

  await logAdminAction(actorId, "clear_match_result", parsed.data.matchId, {});
  revalidatePath("/admin/resultados");
  revalidatePath("/ranking");
  return { ok: true };
}

// B-1: fijar a mano los equipos de un partido de eliminatoria. Los partidos de
// R16..Final se crean con equipos TBD y no se propagan solos; aquí el admin
// pone el equipo real de cada llave una vez conocido.
const teamsSchema = z.object({
  matchId: z.string().min(1),
  homeTeamCode: z.string().min(1).nullable(),
  awayTeamCode: z.string().min(1).nullable(),
});

export async function saveMatchTeams(input: {
  matchId: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
}): Promise<ResultActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = teamsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const supabase = adminClient();
  const { error } = await supabase
    .from("matches")
    .update({
      home_team_code: parsed.data.homeTeamCode,
      away_team_code: parsed.data.awayTeamCode,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", parsed.data.matchId);

  if (error) return { error: error.message };

  await logAdminAction(actorId, "save_match_teams", parsed.data.matchId, {
    home: parsed.data.homeTeamCode,
    away: parsed.data.awayTeamCode,
  });
  revalidatePath("/admin/resultados");
  revalidatePath("/bracket");
  revalidatePath("/ranking");
  for (const r of ["r32", "r16", "qf", "sf", "final"]) {
    revalidatePath(`/pronosticos/eliminatorias/${r}`);
  }
  return { ok: true };
}
