"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
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

export function BracketPicker({
  matches,
  locked,
  lockReason,
  saveAction,
  description,
}: BracketPickerProps) {
  const [activeRound, setActiveRound] = useState<Round>("r32");
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

  const current = matchesByRound[activeRound];

  return (
    <div className="space-y-4">
      <RoundTabs
        active={activeRound}
        onChange={setActiveRound}
        progress={progressByRound}
      />

      <Card>
        <CardHeader>
          <CardTitle>{ROUND_LABELS[activeRound]}</CardTitle>
          <CardDescription>
            {description ??
              "Selecciona el ganador de cada partido. Avanzan automáticamente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {current.map((m) => (
            <PickRow
              key={m.id}
              match={m}
              pick={picks[m.id]}
              pending={pendingMatchId === m.id}
              error={errorByMatch[m.id]}
              locked={locked}
              onPick={(code) => handlePick(m.id, m.round, code)}
            />
          ))}
        </CardContent>
      </Card>

      {locked && lockReason && (
        <p className="text-sm text-[var(--color-text-muted)] text-center">
          {lockReason}
        </p>
      )}
    </div>
  );
}

function RoundTabs({
  active,
  onChange,
  progress,
}: {
  active: Round;
  onChange: (r: Round) => void;
  progress: Record<Round, { done: number; total: number }>;
}) {
  return (
    <div className="sticky top-0 md:top-16 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-[var(--color-bg)]/95 backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {ROUNDS.map((r) => {
          const isActive = r === active;
          const { done, total } = progress[r];
          const complete = total > 0 && done === total;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              className={cn(
                "shrink-0 h-11 px-4 rounded-full text-sm font-medium",
                "inline-flex items-center gap-2 transition-all",
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-sm)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]",
              )}
            >
              {ROUND_LABELS[r]}
              <span
                className={cn(
                  "inline-flex items-center justify-center text-xs h-5 min-w-5 px-1.5 rounded-full tabular-nums",
                  isActive
                    ? "bg-white/20 text-[var(--color-primary-fg)]"
                    : complete
                      ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                      : "bg-[var(--color-bg)] text-[var(--color-text-subtle)]",
                )}
              >
                {done}/{total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PickRow({
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
  const leftPicked = pick === match.left.code;
  const rightPicked = pick === match.right.code;
  const leftDisabled = !match.left.code || locked;
  const rightDisabled = !match.right.code || locked;

  return (
    <div className="p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-2">
        <TeamButton
          label={match.left.label}
          selected={leftPicked}
          disabled={leftDisabled}
          onClick={() =>
            onPick(leftPicked ? null : match.left.code ?? null)
          }
        />
        <span className="text-xs text-[var(--color-text-subtle)] px-1">vs</span>
        <TeamButton
          label={match.right.label}
          selected={rightPicked}
          disabled={rightDisabled}
          onClick={() =>
            onPick(rightPicked ? null : match.right.code ?? null)
          }
        />
        <span className="w-5 shrink-0 flex justify-center">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />
          ) : pick ? (
            <Check className="h-4 w-4 text-[var(--color-success)]" />
          ) : null}
        </span>
      </div>
      {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

function TeamButton({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 min-w-0 h-11 px-3 rounded-[var(--radius-sm)] text-sm font-medium",
        "transition-all truncate text-left",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        selected
          ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-sm)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:bg-[var(--color-border)]",
      )}
    >
      {label}
    </button>
  );
}
