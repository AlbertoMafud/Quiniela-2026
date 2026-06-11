"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { utcISOToCdmxInput } from "@/lib/tz";
import {
  saveDeadline,
  saveStageOverride,
  type DeadlineActionState,
} from "../_actions";

type Override = "auto" | "open" | "closed";

interface Item {
  stage: string;
  label: string;
  deadline_at: string | null;
  override: Override;
}

export function DeadlinesForm({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.stage}>
          <DeadlineRow item={item} />
        </li>
      ))}
    </ul>
  );
}

function DeadlineRow({ item }: { item: Item }) {
  const [value, setValue] = useState(utcISOToCdmxInput(item.deadline_at));
  const [state, formAction, pending] = useActionState<DeadlineActionState, FormData>(
    saveDeadline,
    {},
  );

  return (
    <div className="py-3 border-b border-[var(--color-border)] last:border-b-0 space-y-2">
      <form action={formAction} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <input type="hidden" name="stage" value={item.stage} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)]">{item.label}</p>
          <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
            stage = <code className="font-mono">{item.stage}</code> · hora CDMX
          </p>
        </div>
        <Input
          type="datetime-local"
          name="deadline_at"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full sm:w-56"
          required
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
          {state.ok && <Check className="h-4 w-4 text-[var(--color-success)]" />}
          {state.error && (
            <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
          )}
        </div>
      </form>
      <StageOverrideControl stage={item.stage} current={item.override} />
    </div>
  );
}

function StageOverrideControl({ stage, current }: { stage: string; current: Override }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<DeadlineActionState, FormData>(
    saveStageOverride,
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2 pl-0 sm:pl-1">
      <input type="hidden" name="stage" value={stage} />
      <label className="text-xs text-[var(--color-text-muted)]">Estado manual:</label>
      <select
        name="override"
        defaultValue={current}
        onChange={() => formRef.current?.requestSubmit()}
        disabled={pending}
        className="text-xs rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
      >
        <option value="auto">Auto (según fecha)</option>
        <option value="open">Forzar abierto</option>
        <option value="closed">Forzar cerrado</option>
      </select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-text-muted)]" />}
      {state.ok && <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />}
      {state.error && <span className="text-xs text-[var(--color-danger)]">{state.error}</span>}
    </form>
  );
}
