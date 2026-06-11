"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { utcISOToCdmxInput } from "@/lib/tz";
import { saveRegistrationGate, type DeadlineActionState } from "../_actions";

type Override = "auto" | "open" | "closed";

export function RegistrationGateForm({
  startAt,
  override,
}: {
  startAt: string | null;
  override: Override;
}) {
  const [value, setValue] = useState(utcISOToCdmxInput(startAt));
  const [state, formAction, pending] = useActionState<DeadlineActionState, FormData>(
    saveRegistrationGate,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)]">
            Inicio del torneo
          </p>
          <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
            Cierra registros y bloquea grupos (hora CDMX). Vacío = sin fecha.
          </p>
        </div>
        <Input
          type="datetime-local"
          name="tournament_start_at"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full sm:w-56"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--color-text-muted)]">Registro:</label>
        <select
          name="registration_override"
          defaultValue={override}
          className="text-xs rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
        >
          <option value="auto">Auto (según fecha de inicio)</option>
          <option value="open">Forzar abierto</option>
          <option value="closed">Forzar cerrado</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
        </Button>
        {state.ok && <Check className="h-4 w-4 text-[var(--color-success)]" />}
        {state.error && (
          <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}
