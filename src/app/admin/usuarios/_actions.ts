"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { assertAdmin, logAdminAction } from "@/lib/admin";
import { hashPin } from "@/lib/auth";

const resetPinSchema = z.object({
  player_id: z.string().uuid(),
  new_pin: z.string().regex(/^\d{4}$/, "PIN debe ser 4 dígitos."),
});

const toggleAdminSchema = z.object({
  player_id: z.string().uuid(),
  is_admin: z.coerce.boolean(),
});

const deletePlayerSchema = z.object({
  player_id: z.string().uuid(),
});

export type UserActionState = {
  ok?: boolean;
  error?: string;
  newPin?: string;
};

export async function resetPlayerPin(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = resetPinSchema.safeParse({
    player_id: formData.get("player_id"),
    new_pin: formData.get("new_pin"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const supabase = adminClient();
  const hashed = await hashPin(parsed.data.new_pin);
  const { error } = await supabase
    .from("players")
    .update({ pin_hash: hashed } as never)
    .eq("id", parsed.data.player_id);

  if (error) return { error: error.message };

  await logAdminAction(actorId, "reset_pin", parsed.data.player_id, {});
  revalidatePath("/admin/usuarios");
  return { ok: true, newPin: parsed.data.new_pin };
}

export async function togglePlayerAdmin(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = toggleAdminSchema.safeParse({
    player_id: formData.get("player_id"),
    is_admin: formData.get("is_admin") === "true",
  });
  if (!parsed.success) {
    return { error: "Inválido." };
  }

  const supabase = adminClient();
  const { error } = await supabase
    .from("players")
    .update({ is_admin: parsed.data.is_admin } as never)
    .eq("id", parsed.data.player_id);

  if (error) return { error: error.message };

  await logAdminAction(actorId, "toggle_admin", parsed.data.player_id, {
    is_admin: parsed.data.is_admin,
  });
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function deletePlayer(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  let actorId: string;
  try {
    actorId = await assertAdmin();
  } catch {
    return { error: "No autorizado." };
  }

  const parsed = deletePlayerSchema.safeParse({
    player_id: formData.get("player_id"),
  });
  if (!parsed.success) return { error: "ID inválido." };

  if (parsed.data.player_id === actorId) {
    return { error: "No puedes borrarte a ti mismo." };
  }

  const supabase = adminClient();
  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", parsed.data.player_id);

  if (error) return { error: error.message };

  await logAdminAction(actorId, "delete_player", parsed.data.player_id, {});
  revalidatePath("/admin/usuarios");
  revalidatePath("/ranking");
  return { ok: true };
}
