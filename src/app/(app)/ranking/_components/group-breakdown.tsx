"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn, formatMatchDayMx } from "@/lib/utils";

export interface StandingRow {
  team_code: string;
  team_name: string;
  flag_emoji: string | null;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  position: number;
}

export interface MatchRow {
  id: string;
  kickoff_at: string;
  home_name: string;
  home_emoji: string | null;
  away_name: string;
  away_emoji: string | null;
  home_score: number | null;
  away_score: number | null;
}

export interface MyPick {
  pred_home: number;
  pred_away: number;
  points: number;
  exact: boolean;
  winner: boolean;
}

interface Props {
  letter: string;
  standings: StandingRow[];
  matches: MatchRow[];
  myPicksByMatch: Record<string, MyPick | undefined>;
  playedCount: number;
  totalCount: number;
  defaultOpen?: boolean;
  pickLabel?: string;
}

export function GroupBreakdown({
  letter,
  standings,
  matches,
  myPicksByMatch,
  playedCount,
  totalCount,
  defaultOpen = false,
  pickLabel = "Tu pick",
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-2)] transition-colors"
        aria-expanded={open}
      >
        <span className="font-[family-name:var(--font-display)] text-base sm:text-lg font-semibold text-[var(--color-text)]">
          Grupo {letter}
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
          {/* Standings */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                  <th className="text-left py-2 px-4 sm:px-5 font-medium">Equipo</th>
                  <th className="text-center py-2 px-2 font-medium" title="Partidos jugados">PJ</th>
                  <th className="text-center py-2 px-2 font-medium" title="Ganados">G</th>
                  <th className="text-center py-2 px-2 font-medium" title="Empatados">E</th>
                  <th className="text-center py-2 px-2 font-medium" title="Perdidos">P</th>
                  <th className="text-center py-2 px-2 font-medium" title="Diferencia de goles">DG</th>
                  <th className="text-center py-2 px-4 sm:px-5 font-semibold text-[var(--color-warning)]">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => {
                  const passes = s.position <= 2;
                  const third = s.position === 3;
                  return (
                    <tr key={s.team_code} className="border-t border-[var(--color-border)]">
                      <td className="py-2 px-4 sm:px-5">
                        <span className={cn(
                          "inline-flex items-center gap-2",
                          passes && "text-[var(--color-success)] font-medium",
                          third && "text-[var(--color-info)]",
                        )}>
                          <span>{s.flag_emoji ?? "🏳️"}</span>
                          <span className="truncate">{s.team_name}</span>
                        </span>
                      </td>
                      <td className="text-center tabular-nums py-2 px-2">{s.w + s.d + s.l}</td>
                      <td className="text-center tabular-nums py-2 px-2">{s.w}</td>
                      <td className="text-center tabular-nums py-2 px-2">{s.d}</td>
                      <td className="text-center tabular-nums py-2 px-2">{s.l}</td>
                      <td className="text-center tabular-nums py-2 px-2">{s.gd >= 0 ? "+" : ""}{s.gd}</td>
                      <td className="text-center tabular-nums py-2 px-4 sm:px-5 font-bold text-[var(--color-warning)]">{s.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Partidos del grupo (marcador oficial + TU propio pick). Los picks de otros viven en /pronosticos-publicos */}
          {matches.map((m) => {
            const hasResult = m.home_score !== null && m.away_score !== null;
            const myPick = myPicksByMatch[m.id];
            return (
              <div key={m.id} className="bg-[var(--color-bg-tint)]">
                <div className="px-4 sm:px-5 py-3 flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-[var(--color-text-muted)] tabular-nums w-full sm:w-auto sm:shrink-0">
                    {formatMatchDayMx(m.kickoff_at)}
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
                {myPick && (
                  <div className="px-4 sm:px-5 pb-3 -mt-1 flex items-center gap-2 text-xs">
                    <span className="text-[var(--color-text-subtle)] uppercase tracking-wider font-semibold">
                      {pickLabel}
                    </span>
                    <span className="tabular-nums font-semibold text-[var(--color-text)]">
                      {myPick.pred_home} - {myPick.pred_away}
                    </span>
                    {hasResult && (
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 h-5 rounded-full text-[10px] font-bold",
                          myPick.exact
                            ? "bg-[var(--color-success)] text-white"
                            : myPick.winner
                              ? "bg-[var(--color-warning)] text-black"
                              : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)]",
                        )}
                      >
                        +{myPick.points} pts
                      </span>
                    )}
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
