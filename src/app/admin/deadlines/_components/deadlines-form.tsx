"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveDeadline, type DeadlineActionState } from "../_actions";

interface Item {
  stage: string;
  label: string;
  deadline_at: string | null;
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

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DeadlineRow({ item }: { item: Item }) {
  const [value, setValue] = useState(toLocalInputValue(item.deadline_at));
  const [state, formAction, pending] = useActionState<DeadlineActionState, FormData>(
    saveDeadline,
    {},
  );

  return (
    <form
      action={formAction}
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-3 border-b border-[var(--color-border)] last:border-b-0"
    >
      <input type="hidden" name="stage" value={item.stage} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)]">
          {item.label}
        </p>
        <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
          stage = <code className="font-mono">{item.stage}</code>
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
        {state.ok && (
          <Check className="h-4 w-4 text-[var(--color-success)]" />
        )}
        {state.error && (
          <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}
