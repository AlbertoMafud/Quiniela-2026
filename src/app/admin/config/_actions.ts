"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";

const KNOWN_KEYS = ["early_bracket_enabled", "auto_ingest_enabled"] as const;

const schema = z.object({
  key: z.enum(KNOWN_KEYS),
  enabled: z.coerce.boolean(),
});

export type ConfigActionState = { ok?: boolean; error?: string };

export async function toggleConfig(
  _prev: ConfigActionState,
  formData: FormData,
): Promise<ConfigActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = schema.safeParse({
    key: formData.get("key"),
    enabled: formData.get("enabled") === "true",
  });
  if (!parsed.success) {
    return { error: "Configuración inválida." };
  }

  const supabase = adminClient();
  const { error } = await supabase
    .from("admin_config")
    .upsert(
      { key: parsed.data.key, value: parsed.data.enabled as unknown as object } as never,
      { onConflict: "key" },
    );

  if (error) return { error: error.message };

  await logAdminAction(actorId, "toggle_config", parsed.data.key, {
    enabled: parsed.data.enabled,
  });
  revalidatePath("/admin/config");
  return { ok: true };
}
