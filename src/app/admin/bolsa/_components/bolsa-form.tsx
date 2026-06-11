"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBolsaConfig, type BolsaActionState } from "../_actions";
import type { Split } from "@/lib/pot";

export function BolsaForm({ cuota, split }: { cuota: number; split: Split }) {
  const [state, formAction, pending] = useActionState<BolsaActionState, FormData>(
    saveBolsaConfig,
    {},
  );
  const [first, setFirst] = useState(split.first);
  const [second, setSecond] = useState(split.second);
  const [third, setThird] = useState(split.third);
  const sum = first + second + third;

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Label htmlFor="cuota">Cuota por jugador (MXN)</Label>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            La bolsa = cuota × número de jugadores.
          </p>
        </div>
        <Input
          id="cuota"
          name="cuota"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={cuota}
          className="w-28 text-center tabular-nums"
        />
      </div>

      <fieldset className="space-y-4 pt-2 border-t border-[var(--color-border)]">
        <legend className="text-sm font-medium text-[var(--color-text)]">
          Reparto (% de la bolsa)
        </legend>
        <PctRow name="first" label="Primer lugar" value={first} onChange={setFirst} />
        <PctRow name="second" label="Segundo lugar" value={second} onChange={setSecond} />
        <PctRow name="third" label="Tercer lugar" value={third} onChange={setThird} />
        <p
          className={
            sum === 100
              ? "text-xs text-[var(--color-text-muted)]"
              : "text-xs text-[var(--color-danger)]"
          }
        >
          Suma: {sum}% {sum === 100 ? "" : "(debe ser 100%)"}
        </p>
      </fieldset>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending || sum !== 100}>
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

function PctRow({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-20 text-center tabular-nums"
      />
    </div>
  );
}
