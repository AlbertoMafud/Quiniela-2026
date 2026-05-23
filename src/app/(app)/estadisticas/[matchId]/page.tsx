import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OutcomePie, ScoresBar } from "./_components/stats-charts";
import { formatDateMx } from "@/lib/utils";

interface MatchRow {
  id: string;
  stage: string;
  group_letter: string | null;
  kickoff_at: string;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
}
interface TeamRow { code: string; name: string; flag_emoji: string | null }
interface PredRow { home_score: number; away_score: number }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return { title: `Estadísticas · ${matchId}` };
}

export default async function MatchStatsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = adminClient();

  const [{ data: match }, { data: teams }, { data: preds }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, stage, group_letter, kickoff_at, home_team_code, away_team_code, home_score, away_score",
      )
      .eq("id", matchId)
      .maybeSingle<MatchRow>(),
    supabase.from("teams").select("code, name, flag_emoji"),
    supabase
      .from("predictions")
      .select("home_score, away_score")
      .eq("match_id", matchId),
  ]);

  if (!match) notFound();

  const teamMap = new Map(((teams ?? []) as TeamRow[]).map((t) => [t.code, t]));
  const home = teamMap.get(match.home_team_code ?? "");
  const away = teamMap.get(match.away_team_code ?? "");
  const predictions = (preds ?? []) as PredRow[];
  const total = predictions.length;

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let sumGoalsHome = 0;
  let sumGoalsAway = 0;
  const scoreCounts = new Map<string, number>();
  for (const p of predictions) {
    if (p.home_score > p.away_score) homeWin += 1;
    else if (p.home_score < p.away_score) awayWin += 1;
    else draw += 1;
    sumGoalsHome += p.home_score;
    sumGoalsAway += p.away_score;
    const key = `${p.home_score}-${p.away_score}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }

  const avgHome = total > 0 ? sumGoalsHome / total : 0;
  const avgAway = total > 0 ? sumGoalsAway / total : 0;
  const topScores = Array.from(scoreCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([score, count]) => ({ score, count }));

  const homeName = home?.name ?? "Local";
  const awayName = away?.name ?? "Visita";

  return (
    <div className="space-y-5">
      <header>
        <Link
          href="/estadisticas"
          className="text-xs text-[var(--color-text-muted)] hover:underline"
        >
          ← Volver
        </Link>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          {home?.flag_emoji ?? "🏳️"} {homeName} vs {awayName} {away?.flag_emoji ?? "🏳️"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)] tabular-nums">
          {formatDateMx(match.kickoff_at)}
          {match.home_score !== null && match.away_score !== null && (
            <span className="ml-2">
              · Resultado real: <strong className="text-[var(--color-text)]">{match.home_score}-{match.away_score}</strong>
            </span>
          )}
        </p>
      </header>

      {total === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin pronósticos aún</CardTitle>
            <CardDescription>
              Cuando los jugadores empiecen a pronosticar este partido, verás aquí las
              tendencias.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>¿Quién gana?</CardTitle>
                <CardDescription>
                  Distribución de las {total} predicciones de marcador.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OutcomePie
                  homeLabel={homeName}
                  awayLabel={awayName}
                  homeWin={homeWin}
                  draw={draw}
                  awayWin={awayWin}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Goles promedio</CardTitle>
                <CardDescription>
                  Lo que en promedio cree la familia que va a pasar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around py-6">
                  <div className="text-center">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {homeName}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,3rem)] font-semibold tabular-nums">
                      {avgHome.toFixed(1)}
                    </p>
                  </div>
                  <span className="text-2xl text-[var(--color-text-subtle)]">–</span>
                  <div className="text-center">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {awayName}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,3rem)] font-semibold tabular-nums">
                      {avgAway.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Marcadores más populares</CardTitle>
              <CardDescription>
                Top {topScores.length} marcadores con más votos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScoresBar data={topScores} total={total} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
