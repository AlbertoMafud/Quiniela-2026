"use client";

import * as React from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn, formatDateMx } from "@/lib/utils";

export interface RoundMatchRow {
  id: string;
  kickoff_at: string;
  home_name: string;
  home_emoji: string | null;
  away_name: string;
  away_emoji: string | null;
  home_score: number | null;
  away_score: number | null;
}

export interface RoundPickRow {
  player_id: string;
  player_name: string;
  pred_home: number;
  pred_away: number;
  points: number;
  exact: boolean;
  winner: boolean;
}

interface Props {
  label: string;
  matches: RoundMatchRow[];
  picksByMatch: Record<string, RoundPickRow[]>;
  playedCount: number;
  totalCount: number;
  defaultOpen?: boolean;
}

export function RoundBreakdown({
  label,
  matches,
  picksByMatch,
  playedCount,
  totalCount,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  if (totalCount === 0) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-5 py-3 text-sm text-[var(--color-text-muted)]">
        <span className="font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)] mr-2">
          {label}
        </span>
        — aún sin partidos cargados.
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
          {label}
        </span>
        <span className="ml-auto inline-flex items-center gap-3 text-sm text-[var(--color-text-muted)] tabular-nums">
          {playedCount}/{totalCount} partidos
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
          {matches.map((m) => {
            const picks = picksByMatch[m.id] ?? [];
            const hasResult = m.home_score !== null && m.away_score !== null;
            return (
              <div key={m.id} className="bg-[var(--color-bg-tint)]">
                <div className="px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-[var(--color-text-muted)] tabular-nums w-full sm:w-auto sm:shrink-0">
                    {formatDateMx(m.kickoff_at)}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium truncate">
                    {m.home_emoji ?? "🏳️"} {m.home_name}
                  </span>
                  <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full bg-[var(--color-primary)]/12 text-[var(--color-primary)] font-bold text-sm tabular-nums">
                    {hasResult ? (
                      <>{m.home_score} - {m.away_score}</>
                    ) : (
                      <span className="text-[var(--color-text-subtle)] font-normal">vs</span>
                    )}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-medium truncate text-right">
                    {m.away_name} {m.away_emoji ?? "🏳️"}
                  </span>
                </div>
                {picks.length > 0 && (
                  <div className="px-4 sm:px-5 pb-3 flex flex-wrap gap-1.5">
                    {picks.map((p) => (
                      <span
                        key={p.player_id}
                        className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs"
                      >
                        <span className="font-medium text-[var(--color-text)]">{p.player_name}</span>
                        <span className="tabular-nums text-[var(--color-text-muted)]">
                          {p.pred_home}-{p.pred_away}
                        </span>
                        <PickBadge points={p.points} exact={p.exact} winner={p.winner} hasResult={hasResult} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PickBadge({
  points,
  exact,
  winner,
  hasResult,
}: {
  points: number;
  exact: boolean;
  winner: boolean;
  hasResult: boolean;
}) {
  if (!hasResult) {
    return (
      <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-subtle)] text-[10px] font-medium">
        —
      </span>
    );
  }
  if (exact) {
    return (
      <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--color-success)] text-white text-[10px] font-bold tabular-nums">
        <Check className="h-2.5 w-2.5" />
        {points}
      </span>
    );
  }
  if (winner) {
    return (
      <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--color-warning)] text-black text-[10px] font-bold tabular-nums">
        <Check className="h-2.5 w-2.5" />
        {points}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold tabular-nums">
      <X className="h-2.5 w-2.5" />
      0
    </span>
  );
}
