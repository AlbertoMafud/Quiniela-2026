"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { saveThirdsAction } from "../_actions";

export interface ThirdOption {
  code: string;
  name: string;
  group_letter: string;
  flag_emoji: string | null;
  pts: number;
  gd: number;
  gf: number;
}

interface ThirdsPickerProps {
  options: ThirdOption[];
  initialSelection: string[];
  locked: boolean;
  lockReason?: string;
}

const MAX = 8;

export function ThirdsPicker({
  options,
  initialSelection,
  locked,
  lockReason,
}: ThirdsPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelection),
  );
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(code: string) {
    if (locked) return;
    setStatus("idle");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else if (next.size < MAX) {
        next.add(code);
      }
      return next;
    });
  }

  function save() {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await saveThirdsAction(Array.from(selected));
      if (res.ok) setStatus("saved");
      else {
        setStatus("error");
        setErrorMsg(res.error ?? "Error");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tus 12 terceros lugares</CardTitle>
          <CardDescription>
            Estos son los equipos que según tus pronósticos quedarían en tercer
            lugar de su grupo. Selecciona 8 que crees que sí pasarán a R32.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {options.map((o) => {
              const isSelected = selected.has(o.code);
              const disabled = !isSelected && selected.size >= MAX;
              return (
                <li key={o.code}>
                  <button
                    type="button"
                    onClick={() => toggle(o.code)}
                    disabled={locked || (disabled && !isSelected)}
                    className={cn(
                      "w-full text-left p-3 sm:p-4 rounded-[var(--radius-md)]",
                      "border transition-all active:scale-[0.98]",
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/8 shadow-[var(--shadow-sm)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]",
                      disabled && !isSelected && "opacity-40 cursor-not-allowed",
                      locked && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-text)] truncate">
                          {o.flag_emoji ?? "🏳️"} {o.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          Grupo {o.group_letter} · {o.pts} pts · DG {o.gd >= 0 ? "+" : ""}
                          {o.gd}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 h-6 w-6 rounded-full flex items-center justify-center",
                          isSelected
                            ? "bg-[var(--color-primary)] text-white"
                            : "border-2 border-[var(--color-border-strong)]",
                        )}
                      >
                        {isSelected && <Check className="h-4 w-4" />}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 md:bottom-6 z-20 flex justify-center">
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-[var(--color-surface)]/95 backdrop-blur-xl border border-[var(--color-border)] shadow-[var(--shadow-md)]">
          <span className="text-sm font-medium tabular-nums">
            {selected.size} / {MAX} seleccionados
          </span>
          <Button
            type="button"
            onClick={save}
            disabled={locked || pending || selected.size !== MAX}
            size="sm"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Guardar"
            )}
          </Button>
          {status === "saved" && !pending && (
            <Check className="h-4 w-4 text-[var(--color-success)]" />
          )}
        </div>
      </div>

      {errorMsg && (
        <p className="text-sm text-[var(--color-danger)] text-center">
          {errorMsg}
        </p>
      )}
      {locked && lockReason && (
        <p className="text-sm text-[var(--color-text-muted)] text-center">
          {lockReason}
        </p>
      )}
    </div>
  );
}
