"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleConfig, type ConfigActionState } from "../_actions";

interface ConfigToggleProps {
  keyName: string;
  label: string;
  enabled: boolean;
  disabled?: boolean;
}

export function ConfigToggle({
  keyName,
  label,
  enabled,
  disabled = false,
}: ConfigToggleProps) {
  const [state, formAction, pending] = useActionState<ConfigActionState, FormData>(
    toggleConfig,
    {},
  );
  const [localEnabled, setLocalEnabled] = useState(enabled);

  return (
    <form action={formAction} className="flex items-center justify-between gap-3">
      <input type="hidden" name="key" value={keyName} />
      <input type="hidden" name="enabled" value={(!localEnabled).toString()} />
      <label className="text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={disabled || pending}
          onClick={() => setLocalEnabled((v) => !v)}
          aria-pressed={localEnabled}
          aria-label={`${localEnabled ? "Desactivar" : "Activar"} ${label}`}
          className={cn(
            "relative h-7 w-12 rounded-full transition-colors duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            localEnabled
              ? "bg-[var(--color-success)]"
              : "bg-[var(--color-border-strong)]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200",
              localEnabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
        {pending && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />}
        {state.ok && <Check className="h-4 w-4 text-[var(--color-success)]" />}
        {state.error && (
          <span className="text-xs text-[var(--color-danger)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}
