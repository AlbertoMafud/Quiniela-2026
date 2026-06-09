"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { ScoreInput } from "@/components/ui/score-input";
import { cn, formatMatchDayMx } from "@/lib/utils";
import { saveMatchResult, clearMatchResult, saveMatchTeams } from "../_actions";

export interface ResultMatch {
  id: string;
  stage: string;
  group_letter: string | null;
  kickoff_at: string;
  home: { code: string; name: string; flag_emoji: string | null };
  away: { code: string; name: string; flag_emoji: string | null };
  home_score: number | null;
  away_score: number | null;
  penalty_winner: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  group: "Grupos",
  r32: "16avos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinales",
  final: "Final",
};

interface TeamOption {
  code: string;
  name: string;
  flag_emoji: string | null;
}

export function ResultsList({
  matches,
  teams,
}: {
  matches: ResultMatch[];
  teams: TeamOption[];
}) {
  const stages = useMemo(() => {
    const set = new Set(matches.map((m) => m.stage));
    return Array.from(set);
  }, [matches]);

  const [activeStage, setActiveStage] = useState(stages[0] ?? "group");
  const [activeGroup, setActiveGroup] = useState<string | null>("A");

  const filtered = useMemo(() => {
    let list = matches.filter((m) => m.stage === activeStage);
    if (activeStage === "group" && activeGroup) {
      list = list.filter((m) => m.group_letter === activeGroup);
    }
    return list;
  }, [matches, activeStage, activeGroup]);

  const groupsForStage = useMemo(() => {
    if (activeStage !== "group") return [];
    return Array.from(
      new Set(
        matches
          .filter((m) => m.stage === "group")
          .map((m) => m.group_letter ?? "")
          .filter(Boolean),
      ),
    ).sort();
  }, [matches, activeStage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveStage(s)}
            className={cn(
              "h-9 px-3 rounded-full text-sm font-medium transition-colors",
              activeStage === s
                ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]",
            )}
          >
            {STAGE_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {activeStage === "group" && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {groupsForStage.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setActiveGroup(g)}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-medium transition-colors shrink-0",
                activeGroup === g
                  ? "bg-[var(--color-text)] text-[var(--color-bg)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((m) => (
          <li key={m.id}>
            <ResultRow match={m} teams={teams} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-sm text-[var(--color-text-muted)] text-center py-8">
            No hay partidos en esta vista.
          </li>
        )}
      </ul>
    </div>
  );
}

type Status = "idle" | "dirty" | "saving" | "saved" | "error";

function ResultRow({ match, teams }: { match: ResultMatch; teams: TeamOption[] }) {
  const [home, setHome] = useState<number | null>(match.home_score);
  const [away, setAway] = useState<number | null>(match.away_score);
  const [status, setStatus] = useState<Status>(
    match.home_score !== null && match.away_score !== null ? "saved" : "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // B-1: en eliminatorias el admin fija los equipos de cada llave a mano
  // (R16..Final nacen con equipos por confirmar y no se propagan solos).
  const isKnockout = match.stage !== "group";
  const [homeTeam, setHomeTeam] = useState(
    match.home.code === "?" ? "" : match.home.code,
  );
  const [awayTeam, setAwayTeam] = useState(
    match.away.code === "?" ? "" : match.away.code,
  );
  const [teamStatus, setTeamStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // B-3: en empate de eliminatoria el admin registra quién pasó (extra/penales).
  const [penaltyWinner, setPenaltyWinner] = useState<string | null>(
    match.penalty_winner,
  );
  const isDraw = home !== null && away !== null && home === away;

  function handlePenalty(code: string) {
    setPenaltyWinner(code);
    setStatus("saving");
    startTransition(async () => {
      const res = await saveMatchResult({
        matchId: match.id,
        homeScore: home ?? 0,
        awayScore: away ?? 0,
        penaltyWinner: code,
      });
      if (res.ok) setStatus("saved");
      else {
        setStatus("error");
        setErrorMsg(res.error ?? "Error");
      }
    });
  }

  function saveTeams(h: string, a: string) {
    setTeamStatus("saving");
    startTransition(async () => {
      const res = await saveMatchTeams({
        matchId: match.id,
        homeTeamCode: h || null,
        awayTeamCode: a || null,
      });
      setTeamStatus(res.ok ? "saved" : "error");
    });
  }

  function scheduleSave(h: number, a: number) {
    setStatus("dirty");
    setErrorMsg(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSave(h, a), 500);
  }

  function doSave(h: number, a: number) {
    setStatus("saving");
    startTransition(async () => {
      const res = await saveMatchResult({
        matchId: match.id,
        homeScore: h,
        awayScore: a,
        penaltyWinner,
      });
      if (res.ok) setStatus("saved");
      else {
        setStatus("error");
        setErrorMsg(res.error ?? "Error");
      }
    });
  }

  function handleHome(v: number) {
    setHome(v);
    if (away === null) setAway(0);
    scheduleSave(v, away ?? 0);
  }
  function handleAway(v: number) {
    setAway(v);
    if (home === null) setHome(0);
    scheduleSave(home ?? 0, v);
  }

  function handleClear() {
    setStatus("saving");
    startTransition(async () => {
      const res = await clearMatchResult({ matchId: match.id });
      if (res.ok) {
        setHome(null);
        setAway(null);
        setStatus("idle");
      } else {
        setStatus("error");
        setErrorMsg(res.error ?? "Error");
      }
    });
  }

  return (
    <div className="p-3 sm:p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-2">
        <span className="tabular-nums">{formatMatchDayMx(match.kickoff_at)}</span>
        <StatusIndicator status={status} pending={pending} />
      </div>

      {isKnockout && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TeamSelect
            value={homeTeam}
            teams={teams}
            onChange={(v) => {
              setHomeTeam(v);
              saveTeams(v, awayTeam);
            }}
          />
          <span className="text-[var(--color-text-subtle)] text-sm">vs</span>
          <TeamSelect
            value={awayTeam}
            teams={teams}
            onChange={(v) => {
              setAwayTeam(v);
              saveTeams(homeTeam, v);
            }}
          />
          {teamStatus === "saving" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-text-muted)]" />
          )}
          {teamStatus === "saved" && (
            <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
          )}
          {teamStatus === "error" && (
            <span className="text-xs text-[var(--color-danger)]">Error</span>
          )}
        </div>
      )}

      {isKnockout && isDraw && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--color-text-muted)]">
            Empate — ¿quién pasó?
          </span>
          {[match.home, match.away].map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => handlePenalty(t.code)}
              className={cn(
                "h-8 px-3 rounded-full border text-sm",
                penaltyWinner === t.code
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-text)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]",
              )}
            >
              {(t.flag_emoji ?? "🏳") + " " + t.name}
            </button>
          ))}
        </div>
      )}

      {/* Mobile: cada equipo + score en su propia fila. Desktop: horizontal. */}
      <div className="sm:hidden space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium truncate flex-1">
            {match.home.flag_emoji ?? "🏳️"} {match.home.name}
          </span>
          <ScoreInput value={home} onChange={handleHome} ariaLabel={`Marcador de ${match.home.name}`} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium truncate flex-1">
            {match.away.flag_emoji ?? "🏳️"} {match.away.name}
          </span>
          <ScoreInput value={away} onChange={handleAway} ariaLabel={`Marcador de ${match.away.name}`} />
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-3">
        <div className="flex-1 min-w-0 text-right">
          <span className="text-sm font-medium truncate">
            {match.home.flag_emoji ?? "🏳️"} {match.home.name}
          </span>
        </div>

        <ScoreInput value={home} onChange={handleHome} ariaLabel={`Marcador de ${match.home.name}`} />
        <span className="text-[var(--color-text-subtle)]">–</span>
        <ScoreInput value={away} onChange={handleAway} ariaLabel={`Marcador de ${match.away.name}`} />

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate">
            {match.away.name} {match.away.flag_emoji ?? "🏳️"}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        {errorMsg ? (
          <span className="text-xs text-[var(--color-danger)]">{errorMsg}</span>
        ) : (
          <span />
        )}
        {status === "saved" && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>
    </div>
  );
}

function StatusIndicator({ status, pending }: { status: Status; pending: boolean }) {
  if (pending || status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)]">
        <Loader2 className="h-3 w-3 animate-spin" /> Guardando
      </span>
    );
  }
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-[var(--color-success)]">
        <Check className="h-3 w-3" /> Guardado
      </span>
    );
  if (status === "dirty")
    return <span className="text-[var(--color-warning)]">Sin guardar</span>;
  if (status === "error")
    return <span className="text-[var(--color-danger)]">Error</span>;
  return <span className="text-[var(--color-text-subtle)]">Sin marcador</span>;
}

function TeamSelect({
  value,
  teams,
  onChange,
}: {
  value: string;
  teams: TeamOption[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Equipo"
      className="h-9 max-w-[10rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-text)]"
    >
      <option value="">— equipo —</option>
      {teams.map((t) => (
        <option key={t.code} value={t.code}>
          {(t.flag_emoji ?? "🏳") + " " + t.name}
        </option>
      ))}
    </select>
  );
}
