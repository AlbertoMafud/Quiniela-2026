import Link from "next/link";
import { Trophy, Medal, Award, Globe, Sparkles, Goal, GitBranch } from "lucide-react";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { computeStandings, type MatchScore } from "@/lib/standings";
import {
  computeTotals,
  computePlayerDetail,
  type MatchData,
  type PredictionData,
  type PlayerData,
  type ThirdPickData,
  type BracketPickData,
  type TeamInfo,
} from "@/lib/ranking-calculator";
import { scoreMatch, type ScoringParams } from "@/lib/scoring";
import {
  GroupBreakdown,
  type StandingRow as UIStandingRow,
  type MatchRow as UIMatchRow,
  type MyPick as GroupMyPick,
} from "./_components/group-breakdown";
import {
  RoundBreakdown,
  type RoundMatchRow,
  type MyPick as RoundMyPick,
} from "./_components/round-breakdown";
import { ROUND_LABELS, type Round } from "@/lib/bracket-structure";
import { PlayerSelect } from "./_components/player-select";
import { ClasificadosBreakdown, type ClasificadoRow } from "./_components/clasificados-breakdown";
import { CuadroBreakdown, type CuadroRow } from "./_components/cuadro-breakdown";

export const metadata = { title: "Ranking" };

interface MatchDB {
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
interface PlayerDB { id: string; name: string }
interface PredDB {
  match_id: string;
  player_id: string;
  home_score: number;
  away_score: number;
}
interface TeamDB { code: string; name: string; group_letter: string; flag_emoji: string | null }
interface ThirdDB { player_id: string; team_code: string }
interface BracketDB { player_id: string; slot_id: string; round: Round; winner_team_code: string | null }

const ORIGIN_ORDER: Record<ClasificadoRow["origin"], number> = { "1": 0, "2": 1, tercero: 2 };

const PODIUM = [
  { Icon: Trophy, color: "var(--color-gold)" },
  { Icon: Medal, color: "var(--color-text-subtle)" },
  { Icon: Award, color: "#B87333" },
];

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ jugador?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;
  const { jugador } = await searchParams;

  const supabase = adminClient();

  const [
    { data: players },
    { data: matches },
    predictions,
    { data: teams },
    { data: thirdPicks },
    { data: bracketPicks },
    { data: scoringRow },
  ] = await Promise.all([
    supabase.from("players").select("id, name").order("name"),
    supabase
      .from("matches")
      .select("id, stage, group_letter, kickoff_at, home_team_code, away_team_code, home_score, away_score, penalty_winner")
      .order("kickoff_at", { ascending: true }),
    fetchAllRows<PredDB>((from, to) =>
      supabase
        .from("predictions")
        .select("match_id, player_id, home_score, away_score")
        .order("id")
        .range(from, to),
    ),
    supabase.from("teams").select("code, name, group_letter, flag_emoji"),
    supabase.from("third_picks").select("player_id, team_code"),
    supabase.from("bracket_picks").select("player_id, slot_id, round, winner_team_code"),
    supabase.from("scoring_params").select("*").eq("id", 1).maybeSingle<ScoringParams>(),
  ]);

  const playerList = (players ?? []) as PlayerDB[];
  const matchList = (matches ?? []) as MatchDB[];
  const predList = (predictions ?? []) as PredDB[];
  const teamList = (teams ?? []) as TeamDB[];
  const thirdList = (thirdPicks ?? []) as ThirdDB[];
  const bracketList = (bracketPicks ?? []) as BracketDB[];

  const params: ScoringParams = scoringRow ?? {
    id: 1,
    exact_score_pts: 3,
    correct_winner_pts: 1,
    early_r32_bonus: 1,
    early_r16_bonus: 2,
    early_qf_bonus: 3,
    early_sf_bonus: 4,
    early_final_bonus: 5,
    updated_at: new Date().toISOString(),
  };

  // Calcular standings reales (basados en resultados oficiales)
  const finishedGroupMatches: MatchScore[] = [];
  for (const m of matchList) {
    if (
      m.stage === "group" &&
      m.home_team_code &&
      m.away_team_code &&
      m.home_score !== null &&
      m.away_score !== null
    ) {
      finishedGroupMatches.push({
        home_team_code: m.home_team_code,
        away_team_code: m.away_team_code,
        home_score: m.home_score,
        away_score: m.away_score,
      });
    }
  }
  const teamLite = teamList.map((t) => ({
    code: t.code,
    name: t.name,
    group_letter: t.group_letter,
  }));
  const standings = computeStandings(teamLite, finishedGroupMatches);

  // Calcular totales por jugador (mismo motor que el dashboard).
  const matchDataForCalc: MatchData[] = matchList.map((m) => ({
    id: m.id,
    stage: m.stage,
    group_letter: m.group_letter,
    home_team_code: m.home_team_code,
    away_team_code: m.away_team_code,
    home_score: m.home_score,
    away_score: m.away_score,
    penalty_winner: m.penalty_winner,
  }));
  const predDataForCalc: PredictionData[] = predList.map((p) => ({
    match_id: p.match_id,
    player_id: p.player_id,
    home_score: p.home_score,
    away_score: p.away_score,
  }));
  const playerDataForCalc: PlayerData[] = playerList.map((p) => ({
    id: p.id,
    name: p.name,
  }));
  const thirdDataForCalc: ThirdPickData[] = thirdList.map((t) => ({
    player_id: t.player_id,
    team_code: t.team_code,
  }));
  const bracketDataForCalc: BracketPickData[] = bracketList.map((b) => ({
    player_id: b.player_id,
    slot_id: b.slot_id,
    round: b.round,
    winner_team_code: b.winner_team_code,
  }));
  const teamDataForCalc: TeamInfo[] = teamList.map((t) => ({
    code: t.code,
    name: t.name,
    group_letter: t.group_letter,
  }));

  const totals = computeTotals(
    playerDataForCalc,
    matchDataForCalc,
    predDataForCalc,
    thirdDataForCalc,
    bracketDataForCalc,
    teamDataForCalc,
    params,
  );

  const teamsByCode = new Map(teamList.map((t) => [t.code, t]));

  const selectedPlayerId = playerList.some((p) => p.id === jugador)
    ? (jugador as string)
    : session.playerId;
  const selectedPlayer = playerList.find((p) => p.id === selectedPlayerId);
  const selectedPlayerName = selectedPlayer?.name ?? "—";
  const isViewingSelf = selectedPlayerId === session.playerId;

  // Construir mapa del pronóstico del jugador SELECCIONADO por match (no siempre el tuyo)
  const myPicksByMatch = new Map<string, GroupMyPick>();
  for (const p of predList) {
    if (p.player_id !== selectedPlayerId) continue;
    const m = matchList.find((mm) => mm.id === p.match_id);
    const hasResult = m && m.home_score !== null && m.away_score !== null;
    const points = hasResult
      ? scoreMatch(
          { home: p.home_score, away: p.away_score },
          { home: m.home_score!, away: m.away_score! },
          params,
        )
      : 0;
    const exact = !!hasResult && points === params.exact_score_pts;
    const winner = !!hasResult && !exact && points === params.correct_winner_pts;
    myPicksByMatch.set(p.match_id, {
      pred_home: p.home_score,
      pred_away: p.away_score,
      points,
      exact,
      winner,
    });
  }

  const playerDetail = computePlayerDetail(
    selectedPlayerId,
    matchDataForCalc,
    predDataForCalc,
    thirdDataForCalc,
    bracketDataForCalc,
    teamDataForCalc,
  );

  const clasificadoRows: ClasificadoRow[] = playerDetail.clasificados
    .map((c) => {
      const t = teamsByCode.get(c.team_code);
      return {
        team_code: c.team_code,
        team_name: t?.name ?? c.team_code,
        flag_emoji: t?.flag_emoji ?? null,
        group_letter: c.group_letter,
        origin: c.origin,
        qualified: c.qualified,
        points: c.points,
      };
    })
    .sort((a, b) => {
      if (a.group_letter !== b.group_letter) return a.group_letter.localeCompare(b.group_letter);
      return ORIGIN_ORDER[a.origin] - ORIGIN_ORDER[b.origin];
    });

  const cuadroRowsByRound: Record<Round, CuadroRow[]> = {
    r32: [],
    r16: [],
    qf: [],
    sf: [],
    final: [],
  };
  for (const c of playerDetail.cuadro) {
    const home = c.home_team_code ? teamsByCode.get(c.home_team_code) : undefined;
    const away = c.away_team_code ? teamsByCode.get(c.away_team_code) : undefined;
    const picked = teamsByCode.get(c.picked_team_code);
    cuadroRowsByRound[c.round].push({
      slot_id: c.slot_id,
      home_name: home?.name ?? c.home_team_code ?? "Por definir",
      home_emoji: home?.flag_emoji ?? null,
      away_name: away?.name ?? c.away_team_code ?? "Por definir",
      away_emoji: away?.flag_emoji ?? null,
      picked_name: picked?.name ?? c.picked_team_code,
      picked_emoji: picked?.flag_emoji ?? null,
      status: c.status,
      points: c.points,
    });
  }
  for (const round of Object.keys(cuadroRowsByRound) as Round[]) {
    cuadroRowsByRound[round].sort((a, b) =>
      a.slot_id.localeCompare(b.slot_id, undefined, { numeric: true }),
    );
  }

  // Construir grupos con sus standings y matches
  const groupLetters = Array.from(
    new Set(teamList.map((t) => t.group_letter)),
  ).sort();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Ranking
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          {totals.length} jugador{totals.length === 1 ? "" : "es"} compitiendo. Los pronósticos de cada jugador se revelan en{" "}
          <Link href="/pronosticos-publicos" className="underline text-[var(--color-primary)]">
            Públicos
          </Link>{" "}
          al cerrar cada fase.
        </p>
      </header>

      <SummaryTable
        totals={totals}
        mePlayerId={session.playerId}
        selectedPlayerId={selectedPlayerId}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)]">
          Detalle de {selectedPlayerName}
          {isViewingSelf && (
            <span className="ml-2 text-sm font-normal text-[var(--color-primary)]">(tú)</span>
          )}
        </h2>
        <PlayerSelect players={playerList} selectedId={selectedPlayerId} />
      </div>

      <EliminationsSection
        matchList={matchList}
        teamsByCode={teamsByCode}
        myPicksByMatch={myPicksByMatch}
      />

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)]">
          <Globe className="h-5 w-5 text-[var(--color-info)]" />
          Fase de grupos
        </h2>

        {groupLetters.map((letter, idx) => {
          // Standings de este grupo
          const groupStandings: UIStandingRow[] = standings
            .filter((s) => s.group_letter === letter)
            .map((s) => {
              const t = teamsByCode.get(s.team_code);
              return {
                team_code: s.team_code,
                team_name: s.team_name,
                flag_emoji: t?.flag_emoji ?? null,
                w: s.w,
                d: s.d,
                l: s.l,
                gf: s.gf,
                ga: s.ga,
                gd: s.gd,
                pts: s.pts,
                position: s.position,
              };
            });

          // Matches de este grupo
          const groupMatches = matchList
            .filter((m) => m.stage === "group" && m.group_letter === letter)
            .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
          const uiMatches: UIMatchRow[] = groupMatches.map((m) => {
            const home = teamsByCode.get(m.home_team_code ?? "");
            const away = teamsByCode.get(m.away_team_code ?? "");
            return {
              id: m.id,
              kickoff_at: m.kickoff_at,
              home_name: home?.name ?? m.home_team_code ?? "?",
              home_emoji: home?.flag_emoji ?? null,
              away_name: away?.name ?? m.away_team_code ?? "?",
              away_emoji: away?.flag_emoji ?? null,
              home_score: m.home_score,
              away_score: m.away_score,
            };
          });

          const playedCount = groupMatches.filter(
            (m) => m.home_score !== null && m.away_score !== null,
          ).length;

          const myPicksForGroup: Record<string, GroupMyPick | undefined> = {};
          for (const m of groupMatches) {
            myPicksForGroup[m.id] = myPicksByMatch.get(m.id);
          }

          return (
            <GroupBreakdown
              key={letter}
              letter={letter}
              standings={groupStandings}
              matches={uiMatches}
              myPicksByMatch={myPicksForGroup}
              playedCount={playedCount}
              totalCount={groupMatches.length}
              defaultOpen={idx === 0}
            />
          );
        })}
      </section>

      <ClasificadosBreakdown ready={playerDetail.clasificados_ready} rows={clasificadoRows} />

      <CuadroBreakdown rowsByRound={cuadroRowsByRound} />
    </div>
  );
}

function EliminationsSection({
  matchList,
  teamsByCode,
  myPicksByMatch,
}: {
  matchList: MatchDB[];
  teamsByCode: Map<string, TeamDB>;
  myPicksByMatch: Map<string, RoundMyPick>;
}) {
  const ROUNDS_ORDER: Round[] = ["r32", "r16", "qf", "sf", "final"];
  const elimMatches = matchList.filter((m) => m.stage !== "group");
  if (elimMatches.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)]">
        <Goal className="h-5 w-5 text-[var(--color-accent)]" />
        Eliminatorias
      </h2>
      {ROUNDS_ORDER.map((round) => {
        const roundMatches = elimMatches
          .filter((m) => m.stage === round)
          .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));

        const uiMatches: RoundMatchRow[] = roundMatches.map((m) => {
          const home = teamsByCode.get(m.home_team_code ?? "");
          const away = teamsByCode.get(m.away_team_code ?? "");
          return {
            id: m.id,
            kickoff_at: m.kickoff_at,
            home_name: home?.name ?? m.home_team_code ?? "Por definir",
            home_emoji: home?.flag_emoji ?? null,
            away_name: away?.name ?? m.away_team_code ?? "Por definir",
            away_emoji: away?.flag_emoji ?? null,
            home_score: m.home_score,
            away_score: m.away_score,
          };
        });

        const playedCount = roundMatches.filter(
          (m) => m.home_score !== null && m.away_score !== null,
        ).length;

        const myPicksForRound: Record<string, RoundMyPick | undefined> = {};
        for (const m of roundMatches) {
          myPicksForRound[m.id] = myPicksByMatch.get(m.id);
        }

        return (
          <RoundBreakdown
            key={round}
            label={ROUND_LABELS[round]}
            matches={uiMatches}
            myPicksByMatch={myPicksForRound}
            playedCount={playedCount}
            totalCount={roundMatches.length}
            defaultOpen={false}
          />
        );
      })}
    </section>
  );
}

function SummaryTable({
  totals,
  mePlayerId,
  selectedPlayerId,
}: {
  totals: Array<{
    player_id: string;
    player_name: string;
    group_points: number;
    clasificados_points: number;
    elim_points: number;
    cuadro_points: number;
    total: number;
    group_predictions_made: number;
    group_matches_played: number;
  }>;
  mePlayerId: string;
  selectedPlayerId: string;
}) {
  if (totals.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-[var(--color-text-muted)]">
          Aún no hay jugadores con puntos.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tabla general</CardTitle>
        <CardDescription>
          Desglose por categoría. Abajo encontrarás standings de cada grupo y resultados de eliminatorias.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                <th className="text-left py-2 px-4 sm:px-2 font-medium w-10">#</th>
                <th className="text-left py-2 px-2 font-medium">Jugador</th>
                <th className="text-center py-2 px-2 font-medium">
                  <Globe className="inline h-3.5 w-3.5 text-[var(--color-info)] mr-1" />
                  Grupos
                </th>
                <th className="text-center py-2 px-2 font-medium">
                  <Sparkles className="inline h-3.5 w-3.5 text-[var(--color-warning)] mr-1" />
                  Clasificados
                </th>
                <th className="text-center py-2 px-2 font-medium">
                  <Goal className="inline h-3.5 w-3.5 text-[var(--color-accent)] mr-1" />
                  Eliminatorias
                </th>
                <th className="text-center py-2 px-2 font-medium">
                  <GitBranch className="inline h-3.5 w-3.5 text-[var(--color-success)] mr-1" />
                  Cuadro
                </th>
                <th className="text-right py-2 px-4 sm:px-2 font-semibold text-[var(--color-success)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((row, idx) => {
                const podium = idx < 3 ? PODIUM[idx] : null;
                const isMe = row.player_id === mePlayerId;
                return (
                  <tr
                    key={row.player_id}
                    className={cn(
                      "border-t border-[var(--color-border)]",
                      isMe && "bg-[var(--color-primary)]/8",
                    )}
                  >
                    <td className="py-3 px-4 sm:px-2 tabular-nums text-[var(--color-text-muted)] font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-2">
                      <Link
                        href={`/ranking?jugador=${encodeURIComponent(row.player_id)}`}
                        className="inline-flex items-center gap-2 hover:underline"
                      >
                        {podium ? (
                          <podium.Icon className="h-4 w-4 shrink-0" style={{ color: podium.color }} />
                        ) : (
                          <span className="w-4 h-4 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "truncate",
                            isMe && "font-semibold",
                            row.player_id === selectedPlayerId &&
                              "text-[var(--color-primary)] font-semibold",
                          )}
                        >
                          {row.player_name}
                          {isMe && (
                            <span className="ml-1.5 text-xs text-[var(--color-primary)]">(tú)</span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="text-center tabular-nums py-3 px-2 text-[var(--color-info)] font-medium">
                      {row.group_points}
                    </td>
                    <td className="text-center tabular-nums py-3 px-2 text-[var(--color-warning)] font-medium">
                      {row.clasificados_points}
                    </td>
                    <td className="text-center tabular-nums py-3 px-2 text-[var(--color-accent)] font-medium">
                      {row.elim_points}
                    </td>
                    <td className="text-center tabular-nums py-3 px-2 text-[var(--color-success)] font-medium">
                      {row.cuadro_points}
                    </td>
                    <td className="text-right tabular-nums py-3 px-4 sm:px-2 font-bold text-[var(--color-success)] text-base">
                      {row.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
