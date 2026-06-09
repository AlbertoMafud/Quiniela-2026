"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreInputProps {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  ariaLabel?: string;
}

export function ScoreInput({
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 30,
  ariaLabel,
}: ScoreInputProps) {
  const display = value ?? 0;

  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }

  function dec() {
    if (disabled) return;
    onChange(clamp(display - 1));
  }

  function inc() {
    if (disabled) return;
    onChange(clamp(display + 1));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") {
      onChange(0);
      return;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    onChange(clamp(n));
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || display <= min}
        aria-label={ariaLabel ? `Reducir ${ariaLabel}` : "Reducir marcador"}
        className={cn(
          "h-11 w-11 rounded-full inline-flex items-center justify-center",
          "bg-[var(--color-surface-2)] text-[var(--color-text)]",
          "hover:bg-[var(--color-border)] active:scale-95",
          "transition-all duration-150",
          "disabled:opacity-40 disabled:pointer-events-none",
        )}
      >
        <Minus className="h-4 w-4" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value === null ? "" : String(value)}
        onChange={handleInputChange}
        onFocus={(e) => e.currentTarget.select()}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "h-14 w-14 sm:w-16 text-center text-2xl sm:text-3xl font-semibold",
          "rounded-[var(--radius-md)] border border-[var(--color-border-strong)]",
          "bg-[var(--color-surface)] text-[var(--color-text)]",
          "tabular-nums focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      />

      <button
        type="button"
        onClick={inc}
        disabled={disabled || display >= max}
        aria-label={ariaLabel ? `Aumentar ${ariaLabel}` : "Aumentar marcador"}
        className={cn(
          "h-11 w-11 rounded-full inline-flex items-center justify-center",
          "bg-[var(--color-surface-2)] text-[var(--color-text)]",
          "hover:bg-[var(--color-border)] active:scale-95",
          "transition-all duration-150",
          "disabled:opacity-40 disabled:pointer-events-none",
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
