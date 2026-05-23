"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";

const schema = z.object({
  exact_score_pts: z.coerce.number().int().min(0).max(50),
  correct_winner_pts: z.coerce.number().int().min(0).max(50),
  early_r32_bonus: z.coerce.number().int().min(0).max(50),
  early_r16_bonus: z.coerce.number().int().min(0).max(50),
  early_qf_bonus: z.coerce.number().int().min(0).max(50),
  early_sf_bonus: z.coerce.number().int().min(0).max(50),
  early_final_bonus: z.coerce.number().int().min(0).max(50),
});

export type ScoringActionState = { ok?: boolean; error?: string };

export async function saveScoringParams(
  _prev: ScoringActionState,
  formData: FormData,
): Promise<ScoringActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = schema.safeParse({
    exact_score_pts: formData.get("exact_score_pts"),
    correct_winner_pts: formData.get("correct_winner_pts"),
    early_r32_bonus: formData.get("early_r32_bonus"),
    early_r16_bonus: formData.get("early_r16_bonus"),
    early_qf_bonus: formData.get("early_qf_bonus"),
    early_sf_bonus: formData.get("early_sf_bonus"),
    early_final_bonus: formData.get("early_final_bonus"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const supabase = adminClient();
  const { error } = await supabase
    .from("scoring_params")
    .update({ ...parsed.data, updated_at: new Date().toISOString() } as never)
    .eq("id", 1);

  if (error) return { error: error.message };

  await logAdminAction(actorId, "update_scoring_params", null, parsed.data);
  revalidatePath("/admin/scoring");
  revalidatePath("/reglas");
  revalidatePath("/ranking");
  return { ok: true };
}
