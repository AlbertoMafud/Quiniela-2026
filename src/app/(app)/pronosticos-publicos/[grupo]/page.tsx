import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateMx, cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ grupo: string }>;
}) {
  const { grupo } = await params;
  return { title: `Grupo ${grupo.toUpperCase()} · Pronósticos públicos` };
}

interface MatchRow {
  id: string;
  group_letter: string | null;
  kickoff_at: string;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
}
interface PlayerRow { id: string; name: string }
interface PredRow {
  match_id: string;
  player_id: string;
  home_score: number;
  away_score: number;
}
interface TeamRow { code: string; name: string; flag_emoji: string | null }
interface DeadlineRow { deadline_at: string }

export default async function GrupoPage({
  params,
}: {
  params: Promise<{ grupo: string }>;
}) {
  const { grupo } = await params;
  const letter = grupo.toUpperCase();
  if (!/^[A-L]$/.test(letter)) notFound();

  const supabase = adminClient();

  const [{ data: matches }, { data: players }, { data: predictions }, { data: teams }, { data: deadline }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, group_letter, kickoff_at, home_team_code, away_team_code, home_score, away_score",
        )
        .eq("stage", "group")
        .eq("group_letter", letter)
        .order("kickoff_at", { ascending: true }),
      supabase.from("players").select("id, name").order("name", { ascending: true }),
      supabase
        .from("predictions")
        .select("match_id, player_id, home_score, away_score")
        .in(
          "match_id",
          ((
            await supabase
              .from("matches")
              .select("id")
              .eq("group_letter", letter)
          ).data ?? []).map((m: { id: string }) => m.id),
        ),
      supabase.from("teams").select("code, name, flag_emoji"),
      supabase
        .from("deadlines")
        .select("deadline_at")
        .eq("stage", "group_stage")
        .maybeSingle<DeadlineRow>(),
    ]);

  const matchRows = (matches ?? []) as MatchRow[];
  const playerRows = (players ?? []) as PlayerRow[];
  const predRows = (predictions ?? []) as PredRow[];
  const teamMap = new Map(((teams ?? []) as TeamRow[]).map((t) => [t.code, t]));

  const now = new Date();
  const deadlinePassed = deadline ? new Date(deadline.deadline_at) <= now : false;

  if (matchRows.length === 0) notFound();

  // predictions indexed by match -> player -> {home, away}
  const predsByMatch = new Map<string, Map<string, { home: number; away: number }>>();
  for (const p of predRows) {
    const inner = predsByMatch.get(p.match_id) ?? new Map();
    inner.set(p.player_id, { home: p.home_score, away: p.away_score });
    predsByMatch.set(p.match_id, inner);
  }

  return (
    <div className="space-y-5">
      <header>
        <Link
          href="/pronosticos-publicos"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Todos los grupos
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Grupo {letter}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {deadlinePassed
            ? `${matchRows.length} partidos · ${playerRows.length} jugadores con pronóstico posible.`
            : "Los pronósticos se mostrarán al pasar el deadline de fase de grupos."}
        </p>
      </header>

      {!deadlinePassed ? (
        <Card style={{ background: "var(--color-surface-tint-accent)" }}>
          <CardContent className="py-4 text-sm text-[var(--color-text)]">
            Aún no se pueden ver los pronósticos del grupo. Vuelve después del{" "}
            {deadline ? formatDateMx(deadline.deadline_at) : "deadline de grupos"}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {matchRows.map((m) => {
            const home = teamMap.get(m.home_team_code ?? "");
            const away = teamMap.get(m.away_team_code ?? "");
            const matchPreds = predsByMatch.get(m.id) ?? new Map();
            const hasResult = m.home_score !== null && m.away_score !== null;
            return (
              <Card key={m.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-base sm:text-lg">
                      {home?.flag_emoji ?? "🏳️"} {home?.name ?? "?"} vs{" "}
                      {away?.name ?? "?"} {away?.flag_emoji ?? "🏳️"}
                    </CardTitle>
                    {hasResult && (
                      <span className="shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-sm font-bold tabular-nums">
                        {m.home_score} <span className="opacity-50">-</span> {m.away_score}
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    {formatDateMx(m.kickoff_at)}
                    {!hasResult && " · resultado pendiente"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {playerRows.map((p) => {
                      const pick = matchPreds.get(p.id);
                      const exact =
                        hasResult &&
                        pick &&
                        pick.home === m.home_score &&
                        pick.away === m.away_score;
                      const winner =
                        hasResult &&
                        pick &&
                        Math.sign(pick.home - pick.away) ===
                          Math.sign((m.home_score ?? 0) - (m.away_score ?? 0));
                      return (
                        <li
                          key={p.id}
                          className={cn(
                            "flex items-center justify-between gap-2 py-2 px-3 rounded-[var(--radius-sm)]",
                            exact
                              ? "bg-[var(--color-success)]/15"
                              : winner
                                ? "bg-[var(--color-warning)]/15"
                                : "bg-[var(--color-surface-2)]",
                          )}
                        >
                          <span className="text-sm font-medium truncate">{p.name}</span>
                          <span className="shrink-0 tabular-nums text-sm font-semibold">
                            {pick ? (
                              <>
                                {pick.home} - {pick.away}
                                {exact && <span className="ml-1.5 text-xs text-[var(--color-success)]">✓ exacto</span>}
                                {!exact && winner && <span className="ml-1.5 text-xs text-[var(--color-warning)]">✓ ganador</span>}
                              </>
                            ) : (
                              <span className="text-xs text-[var(--color-text-subtle)] font-normal">
                                sin pronóstico
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
