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
  /** true para partidos de eliminatoria: si el marcador es empate, pide quién pasa por penales */
  requirePenaltyWinner?: boolean;
  initialPenaltyWinner?: string | null;
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
  requirePenaltyWinner = false,
  initialPenaltyWinner = null,
}: MatchPredictionCardProps) {
  const [homeScore, setHomeScore] = useState<number | null>(initialHome);
  const [awayScore, setAwayScore] = useState<number | null>(initialAway);
  const [penaltyWinner, setPenaltyWinner] = useState<string | null>(
    initialPenaltyWinner,
  );
  const [status, setStatus] = useState<Status>(
    initialHome !== null && initialAway !== null ? "saved" : "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDraw =
    homeScore !== null && awayScore !== null && homeScore === awayScore;
  const needsPenaltyPick = requirePenaltyWinner && isDraw;

  function scheduleSave(h: number, a: number, pw: string | null) {
    setStatus("dirty");
    setErrorMsg(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      doSave(h, a, pw);
    }, 500);
  }

  function doSave(h: number, a: number, pw: string | null) {
    // Si requiere penalty pero falta, no guardar todavía — el server lo
    // rechazaría con error
    if (requirePenaltyWinner && h === a && !pw) {
      setStatus("dirty");
      return;
    }
    setStatus("saving");
    startTransition(async () => {
      const res = await savePredictionAction({
        matchId,
        homeScore: h,
        awayScore: a,
        penaltyWinnerCode: requirePenaltyWinner && h === a ? pw : null,
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
    // Si deja de ser empate, limpiar penalty
    const drawNow = v === a;
    const pw = drawNow ? penaltyWinner : null;
    if (!drawNow && penaltyWinner) setPenaltyWinner(null);
    scheduleSave(v, a, pw);
  }

  function handleAwayChange(v: number) {
    setAwayScore(v);
    const h = homeScore ?? 0;
    if (homeScore === null) setHomeScore(0);
    const drawNow = h === v;
    const pw = drawNow ? penaltyWinner : null;
    if (!drawNow && penaltyWinner) setPenaltyWinner(null);
    scheduleSave(h, v, pw);
  }

  function handlePenaltyChange(code: string) {
    setPenaltyWinner(code);
    const h = homeScore ?? 0;
    const a = awayScore ?? 0;
    scheduleSave(h, a, code);
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

      {needsPenaltyPick && !locked && (
        <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
          <p className="text-xs sm:text-sm font-medium text-[var(--color-text)] mb-2">
            Empate. ¿Quién pasa?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePenaltyChange(home.code)}
              className={cn(
                "h-11 px-3 rounded-[var(--radius-md)] text-sm font-medium",
                "inline-flex items-center justify-center gap-2 transition-all",
                "border-2 active:scale-[0.98]",
                penaltyWinner === home.code
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-text)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]",
              )}
            >
              <span>{home.flag_emoji ?? "🏳️"}</span>
              <span className="truncate">{home.name}</span>
              {penaltyWinner === home.code && (
                <Check className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handlePenaltyChange(away.code)}
              className={cn(
                "h-11 px-3 rounded-[var(--radius-md)] text-sm font-medium",
                "inline-flex items-center justify-center gap-2 transition-all",
                "border-2 active:scale-[0.98]",
                penaltyWinner === away.code
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-text)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]",
              )}
            >
              <span>{away.flag_emoji ?? "🏳️"}</span>
              <span className="truncate">{away.name}</span>
              {penaltyWinner === away.code && (
                <Check className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              )}
            </button>
          </div>
          {!penaltyWinner && (
            <p className="mt-2 text-xs text-[var(--color-warning)]">
              Selecciona quién pasa para guardar tu pronóstico.
            </p>
          )}
        </div>
      )}

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
