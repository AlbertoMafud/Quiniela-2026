import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResultsList, type ResultMatch } from "./_components/results-list";

export const metadata = { title: "Resultados · Admin" };

interface MatchRow {
  id: string;
  stage: string;
  group_letter: string | null;
  kickoff_at: string;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner: string | null;
}

interface TeamRow {
  code: string;
  name: string;
  flag_emoji: string | null;
}

export default async function ResultadosPage() {
  const supabase = adminClient();

  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, stage, group_letter, kickoff_at, home_team_code, away_team_code, home_score, away_score, penalty_winner",
      )
      .order("kickoff_at", { ascending: true }),
    supabase.from("teams").select("code, name, flag_emoji"),
  ]);

  const teamMap = new Map(
    ((teams ?? []) as TeamRow[]).map((t) => [t.code, t]),
  );

  const enriched: ResultMatch[] = ((matches ?? []) as MatchRow[]).map((m) => {
    const home = teamMap.get(m.home_team_code ?? "");
    const away = teamMap.get(m.away_team_code ?? "");
    return {
      id: m.id,
      stage: m.stage,
      group_letter: m.group_letter,
      kickoff_at: m.kickoff_at,
      home: home
        ? { code: home.code, name: home.name, flag_emoji: home.flag_emoji }
        : { code: m.home_team_code ?? "?", name: "?", flag_emoji: null },
      away: away
        ? { code: away.code, name: away.name, flag_emoji: away.flag_emoji }
        : { code: m.away_team_code ?? "?", name: "?", flag_emoji: null },
      home_score: m.home_score,
      away_score: m.away_score,
      penalty_winner: m.penalty_winner,
    };
  });

  const totalRecorded = enriched.filter(
    (m) => m.home_score !== null && m.away_score !== null,
  ).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Resultados de partidos
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {totalRecorded} de {enriched.length} partidos con marcador registrado.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Carga manual</CardTitle>
          <CardDescription>
            Cambia las cifras y se guardan solas. Al guardar se recalculan los puntos
            de quienes pronosticaron ese partido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResultsList matches={enriched} teams={(teams ?? []) as TeamRow[]} />
        </CardContent>
      </Card>
    </div>
  );
}
