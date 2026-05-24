import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MatchPredictionCard } from "@/components/app/match-prediction-card";
import { ROUND_LABELS, type Round } from "@/lib/bracket-structure";
import { formatDateMx } from "@/lib/utils";

const VALID_ROUNDS: Round[] = ["r32", "r16", "qf", "sf", "final"];

interface TeamRow { code: string; name: string; flag_emoji: string | null }
interface MatchRow {
  id: string;
  stage: string;
  kickoff_at: string;
  home_team_code: string | null;
  away_team_code: string | null;
}
interface PredRow {
  match_id: string;
  home_score: number;
  away_score: number;
  penalty_winner_code: string | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ronda: string }>;
}) {
  const { ronda } = await params;
  const label = ROUND_LABELS[ronda as Round] ?? ronda;
  return { title: `${label} · Pronósticos` };
}

export default async function EliminatoriasRondaPage({
  params,
}: {
  params: Promise<{ ronda: string }>;
}) {
  const { ronda } = await params;
  if (!VALID_ROUNDS.includes(ronda as Round)) notFound();
  const round = ronda as Round;

  const session = await getSession();
  if (!session) return null;

  const supabase = adminClient();

  const [
    { data: matches },
    { data: teams },
    { data: preds },
    { data: deadline },
    { data: scoringRow },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, stage, kickoff_at, home_team_code, away_team_code")
      .eq("stage", round)
      .order("kickoff_at", { ascending: true }),
    supabase.from("teams").select("code, name, flag_emoji"),
    supabase
      .from("predictions")
      .select("match_id, home_score, away_score, penalty_winner_code")
      .eq("player_id", session.playerId),
    supabase
      .from("deadlines")
      .select("deadline_at")
      .eq("stage", `${round}_scores`)
      .maybeSingle<{ deadline_at: string }>(),
    supabase
      .from("scoring_params")
      .select("exact_score_pts, correct_winner_pts")
      .eq("id", 1)
      .maybeSingle<{ exact_score_pts: number; correct_winner_pts: number }>(),
  ]);

  const exactPts = scoringRow?.exact_score_pts ?? 3;
  const winnerPts = scoringRow?.correct_winner_pts ?? 2;

  const matchRows = (matches ?? []) as MatchRow[];
  const teamMap = new Map(
    ((teams ?? []) as TeamRow[]).map((t) => [t.code, t]),
  );
  const predMap = new Map(
    ((preds ?? []) as PredRow[]).map((p) => [p.match_id, p]),
  );

  const now = new Date();
  const deadlineDate = deadline ? new Date(deadline.deadline_at) : null;
  const locked = deadlineDate ? now >= deadlineDate : false;

  const label = ROUND_LABELS[round];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
            Pronósticos · {label}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
            Mete tus marcadores para los partidos de {label.toLowerCase()}.
            {deadlineDate && ` Cierre: ${formatDateMx(deadlineDate.toISOString())}.`}
          </p>
        </div>
        <RoundsSwitcher current={round} />
      </header>

      <Card className="bg-[var(--color-info)]/8 border-[var(--color-info)]/30">
        <CardContent className="py-3 px-4 sm:px-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <span className="text-[var(--color-text-muted)]">Puntos por partido:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-[var(--color-success)] text-white text-xs font-bold tabular-nums">
              {exactPts}
            </span>
            <span className="text-[var(--color-text)]">marcador exacto</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-[var(--color-warning)] text-black text-xs font-bold tabular-nums">
              {winnerPts}
            </span>
            <span className="text-[var(--color-text)]">ganador correcto</span>
          </span>
        </CardContent>
      </Card>

      {matchRows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aún no hay partidos</CardTitle>
            <CardDescription>
              El administrador todavía no ha cargado los partidos de {label.toLowerCase()}.
              Suelen agregarse cuando se conoce a los equipos reales que pasan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/bracket"
              className="text-[var(--color-primary)] font-medium hover:underline"
            >
              Ver cuadro de eliminatorias →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matchRows.map((m) => {
            const home = teamMap.get(m.home_team_code ?? "");
            const away = teamMap.get(m.away_team_code ?? "");
            if (!home || !away) {
              return (
                <Card key={m.id} className="p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Partido {m.id}: equipos por confirmar.
                  </p>
                </Card>
              );
            }
            const pred = predMap.get(m.id);
            return (
              <MatchPredictionCard
                key={m.id}
                matchId={m.id}
                kickoffAt={m.kickoff_at}
                home={home}
                away={away}
                initialHome={pred?.home_score ?? null}
                initialAway={pred?.away_score ?? null}
                initialPenaltyWinner={pred?.penalty_winner_code ?? null}
                requirePenaltyWinner
                locked={locked}
                lockReason={locked ? "Cierre pasado." : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function RoundsSwitcher({ current }: { current: Round }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none sm:flex-wrap sm:shrink-0 -mx-4 sm:mx-0 px-4 sm:px-0">
      {VALID_ROUNDS.map((r) => (
        <Link
          key={r}
          href={`/pronosticos/eliminatorias/${r}`}
          className={
            r === current
              ? "shrink-0 px-3 h-9 inline-flex items-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-sm font-medium shadow-[var(--shadow-sm)]"
              : "shrink-0 px-3 h-9 inline-flex items-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-muted)] text-sm font-medium hover:bg-[var(--color-border)]"
          }
        >
          {ROUND_LABELS[r]}
        </Link>
      ))}
    </div>
  );
}
