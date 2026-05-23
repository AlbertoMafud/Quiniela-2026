import Link from "next/link";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computeStandings, pickThirds, type MatchScore } from "@/lib/standings";
import { ThirdsPicker } from "./_components/thirds-picker";
import { formatDateMx } from "@/lib/utils";

export const metadata = { title: "Mejores terceros" };

interface TeamRow { code: string; name: string; group_letter: string; flag_emoji: string | null }
interface MatchRow { id: string; group_letter: string | null; home_team_code: string | null; away_team_code: string | null }
interface PredRow { match_id: string; home_score: number; away_score: number }
interface PickRow { team_code: string; pick_order: number }

export default async function TercerosPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = adminClient();

  const [
    { data: teams },
    { data: matches },
    { data: preds },
    { data: existingPicks },
    { data: deadline },
  ] = await Promise.all([
    supabase.from("teams").select("code, name, group_letter, flag_emoji"),
    supabase
      .from("matches")
      .select("id, group_letter, home_team_code, away_team_code")
      .eq("stage", "group"),
    supabase
      .from("predictions")
      .select("match_id, home_score, away_score")
      .eq("player_id", session.playerId),
    supabase
      .from("third_picks")
      .select("team_code, pick_order")
      .eq("player_id", session.playerId)
      .order("pick_order", { ascending: true }),
    supabase
      .from("deadlines")
      .select("deadline_at")
      .eq("stage", "thirds")
      .maybeSingle<{ deadline_at: string }>(),
  ]);

  const teamsList = (teams ?? []) as TeamRow[];
  const matchRows = (matches ?? []) as MatchRow[];
  const predMap = new Map(
    ((preds ?? []) as PredRow[]).map((p) => [p.match_id, p]),
  );

  // Construir set de MatchScore desde pronósticos del jugador.
  const matchScores: MatchScore[] = [];
  let missing = 0;
  for (const m of matchRows) {
    if (!m.home_team_code || !m.away_team_code) continue;
    const p = predMap.get(m.id);
    if (!p) {
      missing += 1;
      continue;
    }
    matchScores.push({
      home_team_code: m.home_team_code,
      away_team_code: m.away_team_code,
      home_score: p.home_score,
      away_score: p.away_score,
    });
  }

  const standings = computeStandings(teamsList, matchScores);
  const teamMap = new Map(teamsList.map((t) => [t.code, t]));
  const thirds = pickThirds(standings).map((r) => ({
    code: r.team_code,
    name: r.team_name,
    group_letter: r.group_letter,
    flag_emoji: teamMap.get(r.team_code)?.flag_emoji ?? null,
    pts: r.pts,
    gd: r.gd,
    gf: r.gf,
  }));

  const initialPicks = ((existingPicks ?? []) as PickRow[]).map(
    (p) => p.team_code,
  );

  const now = new Date();
  const deadlineDate = deadline ? new Date(deadline.deadline_at) : null;
  const locked = deadlineDate ? now >= deadlineDate : false;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Mejores terceros
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          Escoge 8 de los 12 terceros lugares que (según tus pronósticos) pasarían a R32.
          {deadlineDate &&
            ` Deadline: ${formatDateMx(deadlineDate.toISOString())}.`}
        </p>
      </header>

      {missing > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Te faltan pronósticos de grupos</CardTitle>
            <CardDescription>
              Llena los 72 partidos de fase de grupos primero. Solo cuando estén
              completos podemos calcular qué equipos quedarían en tercer lugar.
              Llevas {72 - missing} de 72.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/pronosticos/grupos"
              className="inline-flex items-center text-[var(--color-primary)] font-medium hover:underline"
            >
              Ir a fase de grupos →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ThirdsPicker
          options={thirds}
          initialSelection={initialPicks}
          locked={locked}
          lockReason={locked ? "El deadline de terceros ya pasó." : undefined}
        />
      )}
    </div>
  );
}
