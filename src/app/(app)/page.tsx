import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCards } from "@/components/app/dashboard-cards";
import { formatDateMx } from "@/lib/utils";

interface PlayerRow { name: string }
interface DeadlineRow { stage: string; deadline_at: string }
interface MatchRow { id: string; kickoff_at: string; home_team_code: string | null; away_team_code: string | null }

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = adminClient();
  const [{ data: player }, { data: nextDeadline }, { data: nextMatch }] =
    await Promise.all([
      supabase
        .from("players")
        .select("name")
        .eq("id", session.playerId)
        .maybeSingle<PlayerRow>(),
      supabase
        .from("deadlines")
        .select("stage, deadline_at")
        .gt("deadline_at", new Date().toISOString())
        .order("deadline_at", { ascending: true })
        .limit(1)
        .maybeSingle<DeadlineRow>(),
      supabase
        .from("matches")
        .select("id, kickoff_at, home_team_code, away_team_code")
        .gt("kickoff_at", new Date().toISOString())
        .order("kickoff_at", { ascending: true })
        .limit(1)
        .maybeSingle<MatchRow>(),
    ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.875rem,4vw,2.5rem)] font-semibold tracking-tight text-[var(--color-text)]">
          Hola, {player?.name ?? "jugador"}.
        </h1>
        <p className="mt-1 text-[var(--color-text-muted)]">
          Bienvenido a la quiniela familiar del Mundial 2026.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Próximo deadline</CardTitle>
            <CardDescription>
              {nextDeadline
                ? `Etapa: ${nextDeadline.stage}`
                : "No hay deadlines activos."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nextDeadline ? (
              <p className="text-lg font-semibold tabular-nums">
                {formatDateMx(nextDeadline.deadline_at)}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                El administrador definirá los deadlines pronto.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximo partido</CardTitle>
            <CardDescription>El partido que sigue en el calendario.</CardDescription>
          </CardHeader>
          <CardContent>
            {nextMatch ? (
              <div className="space-y-1">
                <p className="text-lg font-semibold">
                  {nextMatch.home_team_code ?? "TBD"} vs {nextMatch.away_team_code ?? "TBD"}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] tabular-nums">
                  {formatDateMx(nextMatch.kickoff_at)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                Aún no hay partidos programados.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DashboardCards />
    </div>
  );
}
