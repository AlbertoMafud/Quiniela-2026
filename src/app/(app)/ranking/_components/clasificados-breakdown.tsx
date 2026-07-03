"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClasificadoRow {
  team_code: string;
  team_name: string;
  flag_emoji: string | null;
  group_letter: string;
  origin: "1" | "2" | "tercero";
  qualified: boolean;
  points: 0 | 1;
}

const ORIGIN_LABEL: Record<ClasificadoRow["origin"], string> = {
  "1": "1° de tu tabla",
  "2": "2° de tu tabla",
  tercero: "Tercero elegido",
};

interface Props {
  ready: boolean;
  rows: ClasificadoRow[];
  defaultOpen?: boolean;
}

export function ClasificadosBreakdown({ ready, rows, defaultOpen = false }: Props) {
  const [open, setOpen] = React.useState(defaultOpen);
  const total = rows.reduce((s, r) => s + r.points, 0);

  if (!ready) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-5 py-4 text-sm text-[var(--color-text-muted)]">
        <span className="font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)] mr-2">
          Clasificados
        </span>
        — se calcula cuando termine la fase de grupos real.
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-2)] transition-colors"
        aria-expanded={open}
      >
        <span className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold text-[var(--color-text)]">
          Clasificados
        </span>
        <span className="ml-auto inline-flex items-center gap-3 text-sm text-[var(--color-text-muted)] tabular-nums">
          {total} pts
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {rows.map((r) => (
            <div key={r.team_code} className="px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap">
              <span className="flex-1 min-w-0 text-sm font-medium truncate">
                {r.flag_emoji ?? "🏳️"} {r.team_name}
                <span className="ml-2 text-xs text-[var(--color-text-subtle)]">
                  Grupo {r.group_letter} · {ORIGIN_LABEL[r.origin]}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center px-1.5 h-5 rounded-full text-[10px] font-bold",
                  r.qualified
                    ? "bg-[var(--color-success)] text-white"
                    : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)]",
                )}
              >
                {r.qualified ? "✓ Pasó" : "✗ No pasó"} · +{r.points}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="px-4 sm:px-5 py-3 text-sm text-[var(--color-text-muted)]">
              Este jugador no eligió terceros ni tiene pronóstico de grupos.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
