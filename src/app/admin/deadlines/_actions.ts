"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";
import { cdmxInputToUtcISO } from "@/lib/tz";
import { normalizeOverride } from "@/lib/gates";

export type DeadlineActionState = { ok?: boolean; error?: string };

const KNOWN_STAGES = [
  "group_stage",
  "thirds",
  "early_bracket",
  "r32_picks",
  "r32_scores",
  "r16_picks",
  "r16_scores",
  "qf_picks",
  "qf_scores",
  "sf_picks",
  "sf_scores",
  "final_picks",
  "final_scores",
] as const;

const deadlineSchema = z.object({
  stage: z.enum(KNOWN_STAGES),
  deadline_at: z
    .string()
    .min(1, "Fecha inválida")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Fecha inválida"),
});

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

  const parsed = deadlineSchema.safeParse({
    stage: formData.get("stage"),
    deadline_at: formData.get("deadline_at"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  // El datetime-local se interpreta como hora CDMX (centro de México).
  const iso = cdmxInputToUtcISO(parsed.data.deadline_at);

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

const overrideSchema = z.object({
  stage: z.enum(KNOWN_STAGES),
  override: z.enum(["auto", "open", "closed"]),
});

export async function saveStageOverride(
  _prev: DeadlineActionState,
  formData: FormData,
): Promise<DeadlineActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = overrideSchema.safeParse({
    stage: formData.get("stage"),
    override: formData.get("override"),
  });
  if (!parsed.success) {
    return { error: "Valor inválido." };
  }

  const supabase = adminClient();
  const { data: row } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "stage_overrides")
    .maybeSingle<{ value: unknown }>();

  const map: Record<string, string> =
    row?.value && typeof row.value === "object"
      ? { ...(row.value as Record<string, string>) }
      : {};

  if (parsed.data.override === "auto") {
    delete map[parsed.data.stage];
  } else {
    map[parsed.data.stage] = parsed.data.override;
  }

  const { error } = await supabase
    .from("admin_config")
    .upsert({ key: "stage_overrides", value: map } as never, { onConflict: "key" });
  if (error) return { error: error.message };

  await logAdminAction(actorId, "update_stage_override", parsed.data.stage, {
    override: parsed.data.override,
  });
  revalidatePath("/admin/deadlines");
  revalidatePath("/pronosticos/grupos");
  return { ok: true };
}

const gateSchema = z.object({
  tournament_start_at: z.string(), // puede venir vacío = sin fecha
  registration_override: z.enum(["auto", "open", "closed"]),
});

export async function saveRegistrationGate(
  _prev: DeadlineActionState,
  formData: FormData,
): Promise<DeadlineActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = gateSchema.safeParse({
    tournament_start_at: formData.get("tournament_start_at") ?? "",
    registration_override: formData.get("registration_override"),
  });
  if (!parsed.success) {
    return { error: "Valor inválido." };
  }

  const startIso = parsed.data.tournament_start_at
    ? cdmxInputToUtcISO(parsed.data.tournament_start_at)
    : ""; // "" = sin fecha (los lectores lo tratan como null)

  const supabase = adminClient();
  const { error } = await supabase.from("admin_config").upsert(
    [
      { key: "tournament_start_at", value: startIso },
      { key: "registration_override", value: normalizeOverride(parsed.data.registration_override) },
    ] as never,
    { onConflict: "key" },
  );
  if (error) return { error: error.message };

  await logAdminAction(actorId, "update_registration_gate", null, {
    tournament_start_at: startIso,
    registration_override: parsed.data.registration_override,
  });
  revalidatePath("/admin/deadlines");
  revalidatePath("/login");
  revalidatePath("/pronosticos/grupos");
  revalidatePath("/");
  return { ok: true };
}
