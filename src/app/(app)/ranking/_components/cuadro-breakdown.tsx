"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUND_LABELS, type Round } from "@/lib/bracket-structure";

export interface CuadroRow {
  slot_id: string;
  home_name: string;
  home_emoji: string | null;
  away_name: string;
  away_emoji: string | null;
  picked_name: string;
  picked_emoji: string | null;
  status: "hit" | "miss" | "pending";
  points: number;
}

interface Props {
  rowsByRound: Record<Round, CuadroRow[]>;
  defaultOpenRound?: Round | null;
}

const ROUNDS_ORDER: Round[] = ["r32", "r16", "qf", "sf", "final"];

export function CuadroBreakdown({ rowsByRound, defaultOpenRound = null }: Props) {
  const hasAny = ROUNDS_ORDER.some((r) => rowsByRound[r].length > 0);

  if (!hasAny) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-5 py-4 text-sm text-[var(--color-text-muted)]">
        <span className="font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)] mr-2">
          Cuadro
        </span>
        — aún no hay picks de cuadro guardados.
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-tint)] px-4 sm:px-5 py-3 text-xs sm:text-sm text-[var(--color-text-muted)]">
        Clasificados te da el primer punto (+1) cuando ese equipo pasa 16avos.
        Cada ronda de Cuadro suma el bono de la ronda <strong>a la que avanzó</strong>:
        16avos +2, octavos +3, cuartos +4, semis +5, campeón +6 — por eso un
        equipo que llega a la final (ganó semis) te da 1+2+3+4+5 = <strong>15
        puntos</strong> en total, no solo el bono de semis.
      </section>

      {ROUNDS_ORDER.map((round) => (
        <CuadroRoundSection
          key={round}
          round={round}
          rows={rowsByRound[round]}
          defaultOpen={defaultOpenRound === round}
        />
      ))}
    </div>
  );
}

function CuadroRoundSection({
  round,
  rows,
  defaultOpen,
}: {
  round: Round;
  rows: CuadroRow[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.points, 0);

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-2)] transition-colors"
        aria-expanded={open}
      >
        <span className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold text-[var(--color-text)]">
          {ROUND_LABELS[round]}
        </span>
        <span className="ml-auto inline-flex items-center gap-3 text-sm text-[var(--color-text-muted)] tabular-nums">
          {total} pts
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {rows.map((r) => (
            <div key={r.slot_id} className="px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap">
              <span className="flex-1 min-w-0 text-xs text-[var(--color-text-subtle)] truncate">
                {r.home_emoji ?? "🏳️"} {r.home_name} vs {r.away_name} {r.away_emoji ?? "🏳️"}
              </span>
              <span className="text-sm font-medium">
                Pick: {r.picked_emoji ?? "🏳️"} {r.picked_name}
              </span>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center px-1.5 h-5 rounded-full text-[10px] font-bold",
                  r.status === "hit"
                    ? "bg-[var(--color-success)] text-white"
                    : r.status === "pending"
                      ? "bg-[var(--color-warning)] text-black"
                      : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)]",
                )}
              >
                {r.status === "hit"
                  ? `✓ Avanzó · +${r.points}`
                  : r.status === "pending"
                    ? "⏳ Pendiente"
                    : "✗ No avanzó · 0"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
