import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateMx, formatMatchDayMx, cn } from "@/lib/utils";
import { scoreMatch, type ScoringParams } from "@/lib/scoring";

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

  const session = await getSession();
  const supabase = adminClient();

  const [
    { data: matches },
    { data: players },
    { data: predictions },
    { data: teams },
    { data: deadline },
    { data: mePlayer },
    { data: previewConfig },
    { data: scoringRow },
  ] = await Promise.all([
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
      session
        ? supabase
            .from("players")
            .select("is_admin")
            .eq("id", session.playerId)
            .maybeSingle<{ is_admin: boolean }>()
        : Promise.resolve({ data: null }),
      supabase
        .from("admin_config")
        .select("value")
        .eq("key", "public_picks_admin_preview")
        .maybeSingle<{ value: unknown }>(),
      supabase
        .from("scoring_params")
        .select("exact_score_pts, correct_winner_pts")
        .eq("id", 1)
        .maybeSingle<Pick<ScoringParams, "exact_score_pts" | "correct_winner_pts">>(),
    ]);

  const isAdmin = mePlayer?.is_admin === true;
  const adminPreviewEnabled = Boolean(previewConfig?.value);
  const canPreview = isAdmin && adminPreviewEnabled;
  const scoringParams = scoringRow ?? { exact_score_pts: 3, correct_winner_pts: 2 };

  const matchRows = (matches ?? []) as MatchRow[];
  const playerRows = (players ?? []) as PlayerRow[];
  const predRows = (predictions ?? []) as PredRow[];
  const teamMap = new Map(((teams ?? []) as TeamRow[]).map((t) => [t.code, t]));

  const now = new Date();
  const deadlinePassed = deadline ? new Date(deadline.deadline_at) <= now : false;
  const revealed = canPreview || deadlinePassed;
  const previewBanner = canPreview && !deadlinePassed;

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
          {revealed
            ? `${matchRows.length} partidos · ${playerRows.length} jugadores con pronóstico posible.`
            : "Los pronósticos se mostrarán al pasar el deadline de fase de grupos."}
        </p>
      </header>

      {previewBanner && (
        <Card className="border-[var(--color-info)]/40 bg-[var(--color-info)]/8">
          <CardContent className="py-3 text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-[var(--color-info)] shrink-0" />
            <p className="text-[var(--color-text)]">
              <strong>Vista previa de admin:</strong> el deadline aún no se cumple,
              pero estás viendo los pronósticos porque la previsualización para
              admins está activa.
            </p>
          </CardContent>
        </Card>
      )}

      {!revealed ? (
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
                    {formatMatchDayMx(m.kickoff_at)}
                    {!hasResult && " · resultado pendiente"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {playerRows.map((p) => {
                      const pick = matchPreds.get(p.id);
                      const points = pick && hasResult
                        ? scoreMatch(
                            { home: pick.home, away: pick.away },
                            { home: m.home_score!, away: m.away_score! },
                            scoringParams,
                          )
                        : 0;
                      const exact = points === scoringParams.exact_score_pts && hasResult;
                      const winner = !exact && points === scoringParams.correct_winner_pts && hasResult;
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
                          <span className="shrink-0 inline-flex items-center gap-1.5 tabular-nums text-sm font-semibold">
                            {pick ? (
                              <>
                                <span>{pick.home} - {pick.away}</span>
                                {hasResult && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center px-1.5 h-5 rounded-full text-[10px] font-bold",
                                      exact
                                        ? "bg-[var(--color-success)] text-white"
                                        : winner
                                          ? "bg-[var(--color-warning)] text-black"
                                          : "bg-[var(--color-surface-3)] text-[var(--color-text-muted)]",
                                    )}
                                    title={
                                      exact
                                        ? "Marcador exacto"
                                        : winner
                                          ? "Ganador correcto"
                                          : "Sin puntos"
                                    }
                                  >
                                    +{points} pts
                                  </span>
                                )}
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
