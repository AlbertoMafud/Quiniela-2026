"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveScoringParams, type ScoringActionState } from "../_actions";

interface Params {
  exact_score_pts: number;
  correct_winner_pts: number;
  early_r32_bonus: number;
  early_r16_bonus: number;
  early_qf_bonus: number;
  early_sf_bonus: number;
  early_final_bonus: number;
}

export function ScoringForm({ initial }: { initial: Params }) {
  const [state, formAction, pending] = useActionState<ScoringActionState, FormData>(
    saveScoringParams,
    {},
  );

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-[var(--color-text)]">
          Por partido pronosticado
        </legend>
        <FieldRow
          name="exact_score_pts"
          label="Marcador exacto"
          help="Le atinas al resultado exacto."
          defaultValue={initial.exact_score_pts}
        />
        <FieldRow
          name="correct_winner_pts"
          label="Ganador correcto"
          help="Le atinas a quién gana (o empate)."
          defaultValue={initial.correct_winner_pts}
        />
      </fieldset>

      <fieldset className="space-y-4 pt-2 border-t border-[var(--color-border)]">
        <legend className="text-sm font-medium text-[var(--color-text)]">
          Bonus del cuadro desde el inicio
        </legend>
        <FieldRow name="early_r32_bonus" label="Equipo llega a R32" defaultValue={initial.early_r32_bonus} />
        <FieldRow name="early_r16_bonus" label="Equipo llega a R16" defaultValue={initial.early_r16_bonus} />
        <FieldRow name="early_qf_bonus" label="Equipo llega a cuartos" defaultValue={initial.early_qf_bonus} />
        <FieldRow name="early_sf_bonus" label="Equipo llega a semis" defaultValue={initial.early_sf_bonus} />
        <FieldRow name="early_final_bonus" label="Equipo llega a la final" defaultValue={initial.early_final_bonus} />
      </fieldset>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
        {state.ok && (
          <span className="inline-flex items-center gap-1 text-sm text-[var(--color-success)]">
            <Check className="h-4 w-4" /> Guardado
          </span>
        )}
        {state.error && (
          <span className="text-sm text-[var(--color-danger)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}

function FieldRow({
  name,
  label,
  help,
  defaultValue,
}: {
  name: string;
  label: string;
  help?: string;
  defaultValue: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Label htmlFor={name}>{label}</Label>
        {help && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{help}</p>
        )}
      </div>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={50}
        defaultValue={defaultValue}
        className="w-20 text-center tabular-nums"
      />
    </div>
  );
}
