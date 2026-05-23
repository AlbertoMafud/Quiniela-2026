"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";

const schema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0).max(30),
  awayScore: z.number().int().min(0).max(30),
});

const clearSchema = z.object({ matchId: z.string().min(1) });

export type ResultActionState = { ok?: boolean; error?: string };

export async function saveMatchResult(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
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

  const supabase = adminClient();
  const { error } = await supabase
    .from("matches")
    .update({
      home_score: parsed.data.homeScore,
      away_score: parsed.data.awayScore,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", parsed.data.matchId);

  if (error) return { error: error.message };

  await logAdminAction(actorId, "save_match_result", parsed.data.matchId, {
    home: parsed.data.homeScore,
    away: parsed.data.awayScore,
  });
  revalidatePath("/admin/resultados");
  revalidatePath("/ranking");
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
