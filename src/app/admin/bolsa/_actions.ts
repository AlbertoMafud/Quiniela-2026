"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";

const schema = z
  .object({
    cuota: z.coerce.number().min(0).max(1_000_000),
    first: z.coerce.number().int().min(0).max(100),
    second: z.coerce.number().int().min(0).max(100),
    third: z.coerce.number().int().min(0).max(100),
  })
  .refine((d) => d.first + d.second + d.third === 100, {
    message: "Los porcentajes deben sumar 100.",
    path: ["first"],
  });

export type BolsaActionState = { ok?: boolean; error?: string };

export async function saveBolsaConfig(
  _prev: BolsaActionState,
  formData: FormData,
): Promise<BolsaActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = schema.safeParse({
    cuota: formData.get("cuota"),
    first: formData.get("first"),
    second: formData.get("second"),
    third: formData.get("third"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const supabase = adminClient();
  const { error } = await supabase.from("admin_config").upsert(
    [
      { key: "pot_cuota", value: parsed.data.cuota },
      {
        key: "pot_split",
        value: {
          first: parsed.data.first,
          second: parsed.data.second,
          third: parsed.data.third,
        },
      },
    ] as never,
    { onConflict: "key" },
  );
  if (error) return { error: error.message };

  await logAdminAction(actorId, "update_bolsa", null, {
    cuota: parsed.data.cuota,
    split: { first: parsed.data.first, second: parsed.data.second, third: parsed.data.third },
  });
  revalidatePath("/admin/bolsa");
  revalidatePath("/");
  return { ok: true };
}
