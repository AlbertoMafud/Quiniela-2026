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
import { resolveBracket, type PicksMap, type MatchTeamsMap } from "@/lib/derive-bracket";
import { OFFICIAL_KNOCKOUT_MATCHES } from "@/lib/bracket-structure";
import {
  CUADRO_FROZEN_BRANCH_MATCH_IDS,
  isCuadroFrozenForPlayer,
} from "@/lib/cuadro-overrides";
import { BracketPickerWrapper } from "./_components/bracket-picker-wrapper";

export const metadata = { title: "Cuadro de eliminatorias" };

interface TeamRow {
  code: string;
  name: string;
  group_letter: string;
  flag_emoji: string | null;
}
interface GroupMatchRow {
  id: string;
  group_letter: string | null;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
}
interface KoMatchRow {
  id: string;
  stage: string;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner: string | null;
}
interface PickRow {
  round: string;
  slot_id: string;
  winner_team_code: string | null;
}
interface ElimPredRow {
  match_id: string;
  home_score: number;
  away_score: number;
  penalty_winner_code: string | null;
}

export default async function BracketPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = adminClient();

  const isFrozenPlayer = isCuadroFrozenForPlayer(session.playerId);

  const [
    { data: teams },
    { data: groupMatches },
    { data: koMatches },
    { data: r32Predictions },
    { data: picks },
  ] = await Promise.all([
    supabase.from("teams").select("code, name, group_letter, flag_emoji"),
    supabase
      .from("matches")
      .select(
        "id, group_letter, home_team_code, away_team_code, home_score, away_score",
      )
      .eq("stage", "group"),
    supabase
      .from("matches")
      .select(
        "id, stage, home_team_code, away_team_code, home_score, away_score, penalty_winner",
      )
      .neq("stage", "group"),
    supabase
      .from("predictions")
      .select("match_id, home_score, away_score, penalty_winner_code")
      .eq("player_id", session.playerId),
    supabase
      .from("bracket_picks")
      .select("round, slot_id, winner_team_code")
      .eq("player_id", session.playerId),
  ]);

  const teamsList = (teams ?? []) as TeamRow[];
  const matchRows = (groupMatches ?? []) as GroupMatchRow[];

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
            Cuadro de eliminatorias
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
              tu cuadro de eliminatorias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-text-muted)]">
              Mientras tanto, si el cuadro desde el inicio está activo, puedes irlo
              llenando con tus pronósticos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const standings = computeStandings(teamsList, finishedMatches);
  const thirds = bestThirds(standings).map((r) => r.team_code);

  // picksMap: para R32 se DERIVA del pronóstico del jugador (no editable).
  // Para R16+ viene de bracket_picks (editable manualmente).
  const picksMap: PicksMap = {};

  // R16+ desde bracket_picks
  for (const p of (picks ?? []) as PickRow[]) {
    if (p.round !== "r32") {
      picksMap[p.slot_id] = p.winner_team_code;
    }
  }

  // Ganador real de cada partido KO ya jugado (empate a 90' → penalty_winner).
  // Misma lógica que ranking-calculator. Se usa para: (a) marcar acierto/fallo
  // en el cuadro y (b) resolver la rama congelada de los 3 jugadores.
  const koMatchRows = (koMatches ?? []) as KoMatchRow[];
  const realAdvancers: Record<string, string> = {};
  for (const m of koMatchRows) {
    if (m.home_score === null || m.away_score === null) continue;
    let adv: string | null = null;
    if (m.home_score > m.away_score) adv = m.home_team_code;
    else if (m.away_score > m.home_score) adv = m.away_team_code;
    else adv = m.penalty_winner;
    if (adv) realAdvancers[m.id] = adv;
  }

  // R32 derivado de pronósticos
  const r32MatchRows = koMatchRows.filter((m) => m.stage === "r32");
  const r32PredMap = new Map(
    ((r32Predictions ?? []) as ElimPredRow[]).map((p) => [p.match_id, p]),
  );
  for (const m of r32MatchRows) {
    const pred = r32PredMap.get(m.id);
    if (!pred) {
      picksMap[m.id] = null;
      continue;
    }
    if (pred.home_score > pred.away_score) {
      picksMap[m.id] = m.home_team_code;
    } else if (pred.away_score > pred.home_score) {
      picksMap[m.id] = m.away_team_code;
    } else {
      picksMap[m.id] = pred.penalty_winner_code;
    }
  }

  // Rama congelada (ver lib/cuadro-overrides.ts): para los 3 jugadores que no
  // llenaron a tiempo el marcador de r32_m3, esos slots se resuelven con el
  // resultado REAL (no con su pick) y quedan bloqueados en el picker
  // (lockedMatchIds más abajo) — nunca generan fila en bracket_picks, así que
  // el bono de Cuadro de esas 2 rondas da 0.
  if (isFrozenPlayer) {
    for (const matchId of CUADRO_FROZEN_BRANCH_MATCH_IDS) {
      if (!picksMap[matchId] && realAdvancers[matchId]) {
        picksMap[matchId] = realAdvancers[matchId];
      }
    }
  }

  const teamMap = new Map(teamsList.map((t) => [t.code, t]));
  const teamNameOf = (code: string) => teamMap.get(code)?.name ?? code;

  const matchTeams: MatchTeamsMap = {};
  for (const m of r32MatchRows) {
    matchTeams[m.id] = { home: m.home_team_code, away: m.away_team_code };
  }

  const resolved = resolveBracket(
    { standings, thirdsOrdered: thirds, picks: picksMap, matchTeams },
    teamNameOf,
    OFFICIAL_KNOCKOUT_MATCHES,
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Cuadro de eliminatorias
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          Los 16avos se llenan automáticamente con los ganadores de tus pronósticos.
          De octavos en adelante eliges quién pasa cada partido.
        </p>
      </header>

      <BracketPickerWrapper
        matches={resolved}
        realAdvancers={realAdvancers}
        lockedMatchIds={isFrozenPlayer ? CUADRO_FROZEN_BRANCH_MATCH_IDS : undefined}
      />
    </div>
  );
}
