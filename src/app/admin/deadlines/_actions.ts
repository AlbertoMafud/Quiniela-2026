"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";

const schema = z.object({
  stage: z.string().min(1),
  deadline_at: z.string().min(1).refine(
    (v) => !Number.isNaN(new Date(v).getTime()),
    "Fecha inválida",
  ),
});

export type DeadlineActionState = { ok?: boolean; error?: string };

export async function saveDeadline(
  _prev: DeadlineActionState,
  formData: FormData,
): Promise<DeadlineActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = schema.safeParse({
    stage: formData.get("stage"),
    deadline_at: formData.get("deadline_at"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  // Convertir local datetime-input value a ISO con TZ Mexico_City si no incluye TZ.
  const iso = new Date(parsed.data.deadline_at).toISOString();

  const supabase = adminClient();
  const { error } = await supabase
    .from("deadlines")
    .upsert(
      { stage: parsed.data.stage, deadline_at: iso } as never,
      { onConflict: "stage" },
    );

  if (error) return { error: error.message };

  await logAdminAction(actorId, "update_deadline", parsed.data.stage, { deadline_at: iso });
  revalidatePath("/admin/deadlines");
  revalidatePath("/pronosticos/grupos");
  revalidatePath("/");
  return { ok: true };
}
