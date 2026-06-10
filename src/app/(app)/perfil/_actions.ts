"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin";
import { nameSchema, namesEqualCI } from "@/lib/profile";

export type ProfileActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function updatePlayerName(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return {
      fieldErrors: {
        name: parsed.error.issues[0]?.message ?? "Nombre inválido.",
      },
    };
  }
  const newName = parsed.data;

  const supabase = adminClient();

  // Nombre actual (para no-op y audit log).
  const { data: me } = await supabase
    .from("players")
    .select("id, name")
    .eq("id", session.playerId)
    .maybeSingle<{ id: string; name: string }>();
  if (!me) redirect("/login");

  // No-op: idéntico exacto (un cambio de sólo mayúsculas SÍ se permite).
  if (me.name === newName) return { ok: true };

  // Unicidad case-insensitive contra el resto de jugadores.
  const { data: others } = await supabase
    .from("players")
    .select("id, name")
    .neq("id", session.playerId)
    .returns<{ id: string; name: string }[]>();
  const clash = (others ?? []).some((p) => namesEqualCI(p.name, newName));
  if (clash) {
    return { error: "Ya existe un jugador con ese nombre. Elige otro." };
  }

  // Update del nombre (se guarda tal cual, preservando mayúsculas).
  const { error } = await supabase
    .from("players")
    .update({ name: newName } as never)
    .eq("id", session.playerId);

  if (error) {
    // Red de seguridad ante carrera contra el constraint unique de la BD.
    if (error.code === "23505") {
      return { error: "Ya existe un jugador con ese nombre. Elige otro." };
    }
    return { error: "No se pudo cambiar el nombre. Intenta de nuevo." };
  }

  await logAdminAction(session.playerId, "rename_self", session.playerId, {
    old: me.name,
    new: newName,
  });

  revalidatePath("/", "layout");
  revalidatePath("/ranking");
  return { ok: true };
}
