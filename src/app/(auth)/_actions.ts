"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { createSession, clearSession, hashPin, verifyPin } from "@/lib/auth";

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "El nombre debe tener al menos 3 caracteres.")
      .max(30, "El nombre no puede tener más de 30 caracteres."),
    pin: z.string().regex(/^\d{4}$/, "El PIN debe ser de 4 dígitos."),
    pinConfirm: z.string(),
  })
  .refine((d) => d.pin === d.pinConfirm, {
    message: "Los PIN no coinciden.",
    path: ["pinConfirm"],
  });

const loginSchema = z.object({
  name: z.string().trim().min(1, "Ingresa tu nombre."),
  pin: z.string().regex(/^\d{4}$/, "PIN inválido."),
});

export type ActionState = { error?: string; fieldErrors?: Record<string, string> };

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    pin: formData.get("pin"),
    pinConfirm: formData.get("pinConfirm"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString() ?? "_";
      fieldErrors[k] = issue.message;
    }
    return { error: parsed.error.issues[0]?.message, fieldErrors };
  }
  const { name, pin } = parsed.data;

  const supabase = adminClient();
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("name", name)
    .maybeSingle<{ id: string }>();
  if (existing) {
    return { error: "Ya existe un jugador con ese nombre. Elige otro." };
  }

  // Auto-promote primer jugador a admin para arrancar la quiniela.
  const { count } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true });
  const shouldBeAdmin = (count ?? 0) === 0;

  const pin_hash = await hashPin(pin);
  const { data: player, error } = await supabase
    .from("players")
    .insert({ name, pin_hash, is_admin: shouldBeAdmin } as never)
    .select("id")
    .single<{ id: string }>();
  if (error || !player) {
    return { error: error?.message ?? "No se pudo crear el jugador." };
  }

  await createSession(player.id);
  redirect("/");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    name: formData.get("name"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString() ?? "_";
      fieldErrors[k] = issue.message;
    }
    return { error: parsed.error.issues[0]?.message, fieldErrors };
  }
  const { name, pin } = parsed.data;

  const supabase = adminClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, pin_hash")
    .eq("name", name)
    .maybeSingle<{ id: string; pin_hash: string }>();
  if (!player) {
    return { error: "Nombre o PIN incorrecto." };
  }

  const ok = await verifyPin(pin, player.pin_hash);
  if (!ok) {
    return { error: "Nombre o PIN incorrecto." };
  }

  await createSession(player.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
