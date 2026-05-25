"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";

const KNOWN_KEYS = [
  "early_bracket_enabled",
  "auto_ingest_enabled",
  "public_picks_admin_preview",
] as const;

const schema = z.object({
  key: z.enum(KNOWN_KEYS),
  enabled: z.boolean(),
});

export type ConfigResult = { ok: boolean; error?: string };

export async function toggleConfig(input: {
  key: (typeof KNOWN_KEYS)[number];
  enabled: boolean;
}): Promise<ConfigResult> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { ok: false, error: "No autorizado." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Configuración inválida." };
  }

  const supabase = adminClient();
  const { error } = await supabase
    .from("admin_config")
    .upsert(
      { key: parsed.data.key, value: parsed.data.enabled } as never,
      { onConflict: "key" },
    );

  if (error) return { ok: false, error: error.message };

  await logAdminAction(actorId, "toggle_config", parsed.data.key, {
    enabled: parsed.data.enabled,
  });
  revalidatePath("/admin/config");
  revalidatePath("/pronosticos/bracket-inicio");
  revalidatePath("/pronosticos-publicos");
  return { ok: true };
}
