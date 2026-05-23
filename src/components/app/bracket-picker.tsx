"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ROUND_LABELS } from "@/lib/bracket-structure";
import type { ResolvedMatch } from "@/lib/derive-bracket";
import type { Round } from "@/lib/bracket-structure";

export interface SavePickInput {
  round: Round;
  slotId: string;
  winnerTeamCode: string | null;
}

export type SavePickFn = (input: SavePickInput) => Promise<{
  ok: boolean;
  error?: string;
}>;

interface BracketPickerProps {
  matches: ResolvedMatch[];
  locked: boolean;
  lockReason?: string;
  saveAction: SavePickFn;
  description?: string;
}

const ROUNDS: Round[] = ["r32", "r16", "qf", "sf", "final"];

// Cada ronda especifica cuántas filas del grid ocupa cada match (en un grid de 16 filas).
// R32: 16 matches, 1 fila cada uno (1-16)
// R16: 8 matches, 2 filas cada uno (1-2, 3-4, ..., 15-16)
// QF: 4 matches, 4 filas cada uno
// SF: 2 matches, 8 filas cada uno
// Final: 1 match, 16 filas
const ROWS_PER_MATCH: Record<Round, number> = {
  r32: 1,
  r16: 2,
  qf: 4,
  sf: 8,
  final: 16,
};

export function BracketPicker({
  matches,
  locked,
  lockReason,
  saveAction,
  description,
}: BracketPickerProps) {
  const [picks, setPicks] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    for (const m of matches) init[m.id] = m.pick;
    return init;
  });
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [errorByMatch, setErrorByMatch] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  const matchesByRound = useMemo(() => {
    const map: Record<Round, ResolvedMatch[]> = {
      r32: [],
      r16: [],
      qf: [],
      sf: [],
      final: [],
    };
    for (const m of matches) map[m.round].push(m);
    return map;
  }, [matches]);

  const progressByRound = useMemo(() => {
    const p: Record<Round, { done: number; total: number }> = {
      r32: { done: 0, total: 0 },
      r16: { done: 0, total: 0 },
      qf: { done: 0, total: 0 },
      sf: { done: 0, total: 0 },
      final: { done: 0, total: 0 },
    };
    for (const m of matches) {
      p[m.round].total += 1;
      if (picks[m.id]) p[m.round].done += 1;
    }
    return p;
  }, [matches, picks]);

  function handlePick(matchId: string, round: Round, teamCode: string | null) {
    if (locked) return;
    setErrorByMatch((prev) => {
      const next = { ...prev };
      delete next[matchId];
      return next;
    });
    setPicks((prev) => ({ ...prev, [matchId]: teamCode }));
    setPendingMatchId(matchId);
    startTransition(async () => {
      const res = await saveAction({
        round,
        slotId: matchId,
        winnerTeamCode: teamCode,
      });
      setPendingMatchId(null);
      if (!res.ok) {
        setErrorByMatch((prev) => ({
          ...prev,
          [matchId]: res.error ?? "Error",
        }));
        setPicks((prev) => ({ ...prev, [matchId]: null }));
      }
    });
  }

  const champion = picks["final_m1"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span>Cuadro de eliminatorias</span>
            <ProgressSummary progress={progressByRound} />
          </CardTitle>
          <CardDescription>
            {description ??
              "Selecciona el ganador de cada partido. Los ganadores avanzan a la siguiente ronda automáticamente."}
            {" "}En mobile arrastra horizontal para ver todo el cuadro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6 pb-2">
            <div className="min-w-[1100px]">
              {/* Headers de columna fuera del grid para no chocar con la primera fila */}
              <div
                className="grid gap-x-3 sm:gap-x-4 mb-3 sticky top-0 z-10 bg-[var(--color-surface)] py-2"
                style={{
                  gridTemplateColumns: "repeat(5, minmax(180px, 1fr))",
                }}
              >
                {ROUNDS.map((round) => (
                  <div
                    key={round}
                    className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold text-center"
                  >
                    {ROUND_LABELS[round]}
                  </div>
                ))}
              </div>

              {/* Grid del bracket con alturas de fila fijas para que las parejas alineen */}
              <div
                className="grid gap-x-3 sm:gap-x-4"
                style={{
                  gridTemplateColumns: "repeat(5, minmax(180px, 1fr))",
                  gridTemplateRows: "repeat(16, 84px)",
                }}
              >
                {ROUNDS.map((round, colIdx) =>
                  matchesByRound[round].map((m, idx) => {
                    const rowsPer = ROWS_PER_MATCH[round];
                    const startRow = idx * rowsPer + 1;
                    const endRow = startRow + rowsPer;
                    return (
                      <div
                        key={m.id}
                        style={{
                          gridColumn: colIdx + 1,
                          gridRow: `${startRow} / ${endRow}`,
                        }}
                        className="flex items-center justify-center min-w-0"
                      >
                        <MatchCell
                          match={m}
                          pick={picks[m.id]}
                          pending={pendingMatchId === m.id}
                          error={errorByMatch[m.id]}
                          locked={locked}
                          onPick={(code) => handlePick(m.id, m.round, code)}
                        />
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {champion && (
        <Card className="bg-gradient-to-r from-[var(--color-gold)]/10 to-transparent border-[var(--color-gold)]/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="h-6 w-6 text-[var(--color-gold)]" />
            <div>
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                Tu campeón
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl font-semibold">
                {matches.find((m) => m.id === "final_m1" &&
                  (m.left.code === champion || m.right.code === champion))
                  ?.left.code === champion
                  ? matches.find((m) => m.id === "final_m1")?.left.label
                  : matches.find((m) => m.id === "final_m1")?.right.label}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {locked && lockReason && (
        <p className="text-sm text-[var(--color-text-muted)] text-center">
          {lockReason}
        </p>
      )}
    </div>
  );
}

function ProgressSummary({
  progress,
}: {
  progress: Record<Round, { done: number; total: number }>;
}) {
  const total = ROUNDS.reduce((acc, r) => acc + progress[r].total, 0);
  const done = ROUNDS.reduce((acc, r) => acc + progress[r].done, 0);
  return (
    <span className="text-sm font-normal text-[var(--color-text-muted)] tabular-nums">
      {done} / {total}
    </span>
  );
}

function MatchCell({
  match,
  pick,
  pending,
  error,
  locked,
  onPick,
}: {
  match: ResolvedMatch;
  pick: string | null | undefined;
  pending: boolean;
  error?: string;
  locked: boolean;
  onPick: (code: string | null) => void;
}) {
  const leftPicked = pick === match.left.code && pick !== null;
  const rightPicked = pick === match.right.code && pick !== null;
  const leftDisabled = !match.left.code || locked;
  const rightDisabled = !match.right.code || locked;

  return (
    <div className="w-full">
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden text-xs sm:text-[13px]">
        <TeamSlot
          label={match.left.label}
          selected={leftPicked}
          disabled={leftDisabled}
          onClick={() => onPick(leftPicked ? null : match.left.code ?? null)}
          pending={pending && leftPicked}
        />
        <div className="border-t border-[var(--color-border)]" />
        <TeamSlot
          label={match.right.label}
          selected={rightPicked}
          disabled={rightDisabled}
          onClick={() => onPick(rightPicked ? null : match.right.code ?? null)}
          pending={pending && rightPicked}
        />
      </div>
      {error && (
        <p className="mt-1 text-[10px] text-[var(--color-danger)] truncate">
          {error}
        </p>
      )}
    </div>
  );
}

function TeamSlot({
  label,
  selected,
  disabled,
  onClick,
  pending,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full px-2 sm:px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2",
        "transition-colors text-left",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        selected
          ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
          : "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
      )}
    >
      <span className="truncate font-medium">{label}</span>
      <span className="shrink-0 w-4 flex justify-end">
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin opacity-70" />
        ) : selected ? (
          <Check className="h-3 w-3" />
        ) : null}
      </span>
    </button>
  );
}
