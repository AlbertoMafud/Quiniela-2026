"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { ScoreInput } from "@/components/ui/score-input";
import { Card } from "@/components/ui/card";
import { cn, formatDateMx } from "@/lib/utils";
import { savePredictionAction } from "@/app/(app)/pronosticos/grupos/_actions";

interface Team {
  code: string;
  name: string;
  flag_emoji: string | null;
}

interface MatchPredictionCardProps {
  matchId: string;
  kickoffAt: string;
  home: Team;
  away: Team;
  initialHome: number | null;
  initialAway: number | null;
  locked?: boolean;
  lockReason?: string;
}

type Status = "idle" | "dirty" | "saving" | "saved" | "error";

export function MatchPredictionCard({
  matchId,
  kickoffAt,
  home,
  away,
  initialHome,
  initialAway,
  locked = false,
  lockReason,
}: MatchPredictionCardProps) {
  const [homeScore, setHomeScore] = useState<number | null>(initialHome);
  const [awayScore, setAwayScore] = useState<number | null>(initialAway);
  const [status, setStatus] = useState<Status>(
    initialHome !== null && initialAway !== null ? "saved" : "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSave(h: number, a: number) {
    setStatus("dirty");
    setErrorMsg(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      doSave(h, a);
    }, 500);
  }

  function doSave(h: number, a: number) {
    setStatus("saving");
    startTransition(async () => {
      const res = await savePredictionAction({
        matchId,
        homeScore: h,
        awayScore: a,
      });
      if (res.ok) {
        setStatus("saved");
      } else {
        setStatus("error");
        setErrorMsg(res.error);
      }
    });
  }

  function handleHomeChange(v: number) {
    setHomeScore(v);
    const a = awayScore ?? 0;
    if (awayScore === null) setAwayScore(0);
    scheduleSave(v, a);
  }

  function handleAwayChange(v: number) {
    setAwayScore(v);
    const h = homeScore ?? 0;
    if (homeScore === null) setHomeScore(0);
    scheduleSave(h, v);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
          {formatDateMx(kickoffAt)}
        </p>
        <StatusBadge status={status} locked={locked} />
      </div>

      {/* Mobile: vertical (home arriba, marcadores en línea, away abajo).
          Desktop: horizontal (home | marcadores | away). */}
      <div className="sm:hidden space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-[var(--color-text)] truncate text-sm flex-1">
            <span className="mr-1.5" aria-hidden>
              {home.flag_emoji ?? "🏳️"}
            </span>
            {home.name}
          </p>
          <ScoreInput
            value={homeScore}
            onChange={handleHomeChange}
            disabled={locked}
            ariaLabel={`Marcador de ${home.name}`}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium text-[var(--color-text)] truncate text-sm flex-1">
            <span className="mr-1.5" aria-hidden>
              {away.flag_emoji ?? "🏳️"}
            </span>
            {away.name}
          </p>
          <ScoreInput
            value={awayScore}
            onChange={handleAwayChange}
            disabled={locked}
            ariaLabel={`Marcador de ${away.name}`}
          />
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--color-text)] truncate text-base">
            <span className="mr-2" aria-hidden>
              {home.flag_emoji ?? "🏳️"}
            </span>
            {home.name}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ScoreInput
            value={homeScore}
            onChange={handleHomeChange}
            disabled={locked}
            ariaLabel={`Marcador de ${home.name}`}
          />
          <span className="text-[var(--color-text-subtle)] text-lg font-light">–</span>
          <ScoreInput
            value={awayScore}
            onChange={handleAwayChange}
            disabled={locked}
            ariaLabel={`Marcador de ${away.name}`}
          />
        </div>

        <div className="flex-1 min-w-0 text-right">
          <p className="font-medium text-[var(--color-text)] truncate text-base">
            {away.name}
            <span className="ml-2" aria-hidden>
              {away.flag_emoji ?? "🏳️"}
            </span>
          </p>
        </div>
      </div>

      {locked && lockReason && (
        <p className="mt-3 text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> {lockReason}
        </p>
      )}
      {errorMsg && (
        <p className="mt-3 text-xs text-[var(--color-danger)]">{errorMsg}</p>
      )}
    </Card>
  );
}

function StatusBadge({ status, locked }: { status: Status; locked: boolean }) {
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-subtle)]">
        <Lock className="h-3 w-3" /> Cerrado
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs transition-opacity",
        status === "saved" && "text-[var(--color-success)]",
        status === "saving" && "text-[var(--color-text-muted)]",
        status === "dirty" && "text-[var(--color-warning)]",
        status === "error" && "text-[var(--color-danger)]",
        status === "idle" && "opacity-0",
      )}
    >
      {status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "saved" && <Check className="h-3 w-3" />}
      {status === "saved" && "Guardado"}
      {status === "saving" && "Guardando..."}
      {status === "dirty" && "Sin guardar"}
      {status === "error" && "Error"}
    </span>
  );
}
