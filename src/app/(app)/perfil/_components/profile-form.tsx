"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updatePlayerName, type ProfileActionState } from "../_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ currentName }: { currentName: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ProfileActionState,
    FormData
  >(updatePlayerName, {});

  // Al guardar con éxito, refresca para que el nombre nuevo aparezca en la nav.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)] max-w-md">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold mb-1">
        Tu nombre
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-5">
        Este nombre es también tu usuario para entrar. Si lo cambias, la próxima
        vez entra con el nombre nuevo y tu mismo PIN.
      </p>

      <form action={formAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            name="name"
            defaultValue={currentName}
            placeholder="Tu nombre"
            autoComplete="off"
            required
          />
          {state.fieldErrors?.name && (
            <p className="text-sm text-[var(--color-danger)]">
              {state.fieldErrors.name}
            </p>
          )}
        </div>

        {state.error && (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        )}

        {state.ok && !pending && (
          <p className="text-sm text-[var(--color-success)]">
            Nombre actualizado. La próxima vez entra con tu nuevo nombre.
          </p>
        )}

        <Button type="submit" fullWidth size="lg" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </div>
  );
}
