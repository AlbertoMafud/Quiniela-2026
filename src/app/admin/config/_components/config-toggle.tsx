"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleConfig } from "../_actions";

interface ConfigToggleProps {
  keyName: "early_bracket_enabled" | "auto_ingest_enabled";
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
  const [optimistic, setOptimistic] = useState(enabled);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleClick() {
    if (disabled || pending) return;
    const next = !optimistic;
    setOptimistic(next);
    setErrorMsg(null);
    setSaved(false);

    startTransition(async () => {
      const res = await toggleConfig({ key: keyName, enabled: next });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setOptimistic(!next); // revert
        setErrorMsg(res.error ?? "Error al guardar.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || pending}
          onClick={handleClick}
          aria-pressed={optimistic}
          aria-label={`${optimistic ? "Desactivar" : "Activar"} ${label}`}
          className={cn(
            "relative h-7 w-12 rounded-full transition-colors duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            optimistic
              ? "bg-[var(--color-success)]"
              : "bg-[var(--color-border-strong)]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200",
              optimistic ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
        {pending && (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />
        )}
        {saved && !pending && (
          <Check className="h-4 w-4 text-[var(--color-success)]" />
        )}
        {errorMsg && (
          <span className="text-xs text-[var(--color-danger)]">{errorMsg}</span>
        )}
      </div>
    </div>
  );
}
