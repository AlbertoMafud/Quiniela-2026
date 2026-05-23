import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  computeStandings,
  bestThirds,
  type MatchScore,
} from "@/lib/standings";
import { resolveBracket, type PicksMap } from "@/lib/derive-bracket";
import { BracketPickerWrapper } from "./_components/bracket-picker-wrapper";

export const metadata = { title: "Bracket" };

interface TeamRow {
  code: string;
  name: string;
  group_letter: string;
  flag_emoji: string | null;
}
interface MatchRow {
  id: string;
  group_letter: string | null;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
}
interface PickRow {
  round: string;
  slot_id: string;
  winner_team_code: string | null;
}

export default async function BracketPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = adminClient();

  const [{ data: teams }, { data: matches }, { data: picks }] = await Promise.all([
    supabase.from("teams").select("code, name, group_letter, flag_emoji"),
    supabase
      .from("matches")
      .select(
        "id, group_letter, home_team_code, away_team_code, home_score, away_score",
      )
      .eq("stage", "group"),
    supabase
      .from("bracket_picks")
      .select("round, slot_id, winner_team_code")
      .eq("player_id", session.playerId),
  ]);

  const teamsList = (teams ?? []) as TeamRow[];
  const matchRows = (matches ?? []) as MatchRow[];

  // Solo cuentan partidos de grupos con marcador real definido.
  const finishedMatches: MatchScore[] = [];
  let pendingMatches = 0;
  for (const m of matchRows) {
    if (
      !m.home_team_code ||
      !m.away_team_code ||
      m.home_score === null ||
      m.away_score === null
    ) {
      pendingMatches += 1;
      continue;
    }
    finishedMatches.push({
      home_team_code: m.home_team_code,
      away_team_code: m.away_team_code,
      home_score: m.home_score,
      away_score: m.away_score,
    });
  }

  const groupStageComplete = pendingMatches === 0 && matchRows.length > 0;

  if (!groupStageComplete) {
    const totalGroup = matchRows.length;
    const done = totalGroup - pendingMatches;
    return (
      <div className="space-y-5">
        <header>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
            Bracket
          </h1>
          <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
            Disponible cuando termine la fase de grupos.
          </p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Esperando resultados</CardTitle>
            <CardDescription>
              Llevamos {done} de {totalGroup} partidos de fase de grupos con
              resultado oficial. Cuando estén los 72 marcadores reales, podrás llenar
              tu bracket de eliminatorias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-text-muted)]">
              Mientras tanto, si el bracket-desde-inicio está activo, puedes irlo
              llenando con tus pronósticos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const standings = computeStandings(teamsList, finishedMatches);
  const thirds = bestThirds(standings).map((r) => r.team_code);

  const picksMap: PicksMap = {};
  for (const p of (picks ?? []) as PickRow[]) {
    picksMap[p.slot_id] = p.winner_team_code;
  }

  const teamMap = new Map(teamsList.map((t) => [t.code, t]));
  const teamNameOf = (code: string) => teamMap.get(code)?.name ?? code;

  const resolved = resolveBracket(
    { standings, thirdsOrdered: thirds, picks: picksMap },
    teamNameOf,
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Bracket
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          Llena tu cuadro de eliminatorias con los equipos reales que pasaron.
        </p>
      </header>

      <BracketPickerWrapper matches={resolved} />
    </div>
  );
}
