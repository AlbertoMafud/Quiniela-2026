import Link from "next/link";
import { Trophy, Medal, Award, Target, Sparkles, Goal, ChartLine, Clock, TrendingUp, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatDateMx } from "@/lib/utils";
import { DashboardWelcome } from "@/components/app/dashboard-welcome";
import { ROUND_LABELS } from "@/lib/bracket-structure";

interface PlayerRow { id: string; name: string }
interface DeadlineRow { stage: string; deadline_at: string }
interface MatchRow {
  id: string;
  stage: string;
  kickoff_at: string;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
  group_letter: string | null;
}
interface ScoreRow { player_id: string; player_name: string; total_points: number }
interface TeamRow { code: string; name: string; flag_emoji: string | null }

const STAGE_PRETTY: Record<string, string> = {
  group_stage: "Fase de grupos",
  thirds: "Mejores terceros",
  early_bracket: "Bracket desde inicio",
  r32_picks: "Selecciones 16avos",
  r32_scores: "Marcadores 16avos",
  r16_picks: "Selecciones octavos",
  r16_scores: "Marcadores octavos",
  qf_picks: "Selecciones cuartos",
  qf_scores: "Marcadores cuartos",
  sf_picks: "Selecciones semifinales",
  sf_scores: "Marcadores semifinales",
  final_picks: "Selecciones final",
  final_scores: "Marcador final",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = adminClient();
  const now = new Date().toISOString();

  const [
    { data: player },
    { data: nextDeadline },
    { data: nextMatch },
    { data: scores },
    { count: totalPlayers },
    { count: totalGroupMatches },
    { count: myGroupPreds },
    { count: myThirds },
    { count: myBracketPicks },
    { data: recentResults },
    { data: teams },
    { data: earlyEnabled },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, name")
      .eq("id", session.playerId)
      .maybeSingle<PlayerRow>(),
    supabase
      .from("deadlines")
      .select("stage, deadline_at")
      .gt("deadline_at", now)
      .order("deadline_at", { ascending: true })
      .limit(1)
      .maybeSingle<DeadlineRow>(),
    supabase
      .from("matches")
      .select("id, stage, kickoff_at, home_team_code, away_team_code, home_score, away_score, group_letter")
      .gt("kickoff_at", now)
      .order("kickoff_at", { ascending: true })
      .limit(1)
      .maybeSingle<MatchRow>(),
    supabase
      .from("player_scores")
      .select("player_id, player_name, total_points")
      .order("total_points", { ascending: false })
      .limit(5),
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("stage", "group"),
    supabase.from("predictions").select("*", { count: "exact", head: true }).eq("player_id", session.playerId),
    supabase.from("third_picks").select("*", { count: "exact", head: true }).eq("player_id", session.playerId),
    supabase.from("bracket_picks").select("*", { count: "exact", head: true }).eq("player_id", session.playerId),
    supabase
      .from("matches")
      .select("id, stage, kickoff_at, home_team_code, away_team_code, home_score, away_score, group_letter")
      .not("home_score", "is", null)
      .order("kickoff_at", { ascending: false })
      .limit(3),
    supabase.from("teams").select("code, name, flag_emoji"),
    supabase
      .from("admin_config")
      .select("value")
      .eq("key", "early_bracket_enabled")
      .maybeSingle<{ value: unknown }>(),
  ]);

  const teamMap = new Map(((teams ?? []) as TeamRow[]).map((t) => [t.code, t]));
  const scoresList = (scores ?? []) as ScoreRow[];
  const recents = (recentResults ?? []) as MatchRow[];
  const earlyBracketOn = Boolean(earlyEnabled?.value);

  const myRank = scoresList.findIndex((s) => s.player_id === session.playerId);
  const myScore = scoresList.find((s) => s.player_id === session.playerId);

  const groupTotal = totalGroupMatches ?? 72;
  const groupDone = myGroupPreds ?? 0;
  const thirdsTotal = 8;
  const thirdsDone = myThirds ?? 0;
  const bracketTotal = 31;
  const bracketDone = myBracketPicks ?? 0;

  const overallDone = groupDone + thirdsDone + bracketDone;
  const overallTotal = groupTotal + thirdsTotal + bracketTotal;
  const overallPct = Math.round((overallDone / overallTotal) * 100);

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardWelcome
        playerName={player?.name ?? "jugador"}
        overallDone={overallDone}
        overallTotal={overallTotal}
        overallPct={overallPct}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <DeadlineCard deadline={nextDeadline} />
        <NextMatchCard match={nextMatch} teamMap={teamMap} />
        <YourRankCard myRank={myRank} myScore={myScore?.total_points ?? 0} totalPlayers={totalPlayers ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />
              Tu progreso
            </CardTitle>
            <CardDescription>
              Lo que llevas en cada sección de la quiniela.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProgressBar
              label="Pronósticos de grupos"
              done={groupDone}
              total={groupTotal}
              href="/pronosticos/grupos"
              icon={Target}
              infoTitle="Pronósticos de fase de grupos"
              infoDescription="Mete tu marcador exacto para cada uno de los 72 partidos de la primera ronda (12 grupos × 6 partidos). Ganas 3 pts por marcador exacto y 2 pts por adivinar al ganador (o empate). Puedes editar hasta que pase el deadline."
            />
            <ProgressBar
              label="Mejores terceros"
              done={thirdsDone}
              total={thirdsTotal}
              href="/pronosticos/terceros"
              icon={Sparkles}
              infoTitle="Mejores terceros"
              infoDescription="Pasan a R32 los top-2 de cada grupo (24) + los 8 mejores terceros lugares (de los 12 grupos). Aquí escoges cuáles 8 terceros de tus pronósticos crees que avanzarán. Necesitas haber completado los 72 pronósticos de grupos primero."
            />
            {earlyBracketOn && (
              <ProgressBar
                label="Bracket desde el inicio"
                done={bracketDone}
                total={bracketTotal}
                href="/pronosticos/bracket-inicio"
                icon={Trophy}
                accent
                infoTitle="Bracket desde el inicio (opcional)"
                infoDescription="Si el admin lo activa, llenas TODO el cuadro de eliminatorias desde antes del Mundial usando tus pronósticos de grupos + 8 terceros. Por cada equipo que llegue realmente a esa ronda ganas bonus: 1 pt en R32, 2 en octavos, 3 en cuartos, 4 en semis, 5 en la final."
              />
            )}
            <ProgressBar
              label="Pronósticos de eliminatorias"
              done={0}
              total={31}
              href="/pronosticos/eliminatorias/r32"
              icon={Goal}
              hint="Se habilita cuando los partidos de cada ronda estén cargados"
              infoTitle="Marcadores de eliminatorias"
              infoDescription="Cada ronda (32vos → final) tienes que meter los marcadores exactos de cada partido para ganar puntos. Mismo sistema: 3 pts marcador exacto, 2 pts ganador correcto. Se va habilitando cada ronda cuando se conozcan los equipos reales que pasan."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[var(--color-gold)]" />
              Top 5
            </CardTitle>
            <CardDescription>Quién va arriba.</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniRanking scores={scoresList} mePlayerId={session.playerId} />
            <Link
              href="/ranking"
              className="mt-3 inline-flex items-center text-sm text-[var(--color-primary)] font-medium hover:underline"
            >
              Ver ranking completo →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--color-text-muted)]" />
            Resultados recientes
          </CardTitle>
          <CardDescription>
            Los últimos marcadores oficiales registrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recents.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
              Aún no hay resultados oficiales. Aparecerán aquí conforme se jueguen los partidos.
            </p>
          ) : (
            <ul className="space-y-2">
              {recents.map((m) => {
                const home = teamMap.get(m.home_team_code ?? "");
                const away = teamMap.get(m.away_team_code ?? "");
                const stageLabel = m.stage === "group"
                  ? `Grupo ${m.group_letter ?? ""}`
                  : ROUND_LABELS[m.stage as keyof typeof ROUND_LABELS] ?? m.stage;
                const homeWin = (m.home_score ?? 0) > (m.away_score ?? 0);
                const awayWin = (m.home_score ?? 0) < (m.away_score ?? 0);
                return (
                  <li key={m.id} className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] overflow-hidden">
                    {/* Mobile layout vertical */}
                    <div className="sm:hidden p-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-subtle)] mb-2">
                        {stageLabel}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-sm flex-1 truncate ${homeWin ? "font-semibold" : "font-medium opacity-80"}`}>
                            {home?.flag_emoji ?? "🏳️"} {home?.name ?? "?"}
                          </span>
                          <span className={`text-base tabular-nums shrink-0 ${homeWin ? "font-bold text-[var(--color-primary)]" : "font-medium"}`}>
                            {m.home_score}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-sm flex-1 truncate ${awayWin ? "font-semibold" : "font-medium opacity-80"}`}>
                            {away?.flag_emoji ?? "🏳️"} {away?.name ?? "?"}
                          </span>
                          <span className={`text-base tabular-nums shrink-0 ${awayWin ? "font-bold text-[var(--color-primary)]" : "font-medium"}`}>
                            {m.away_score}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout horizontal */}
                    <div className="hidden sm:flex items-center gap-3 py-2 px-3">
                      <span className="text-xs text-[var(--color-text-subtle)] w-20 shrink-0">
                        {stageLabel}
                      </span>
                      <span className="flex-1 min-w-0 text-right text-sm font-medium truncate">
                        {home?.flag_emoji ?? "🏳️"} {home?.name ?? "?"}
                      </span>
                      <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-sm font-bold tabular-nums">
                        {m.home_score} <span className="mx-1 opacity-50">-</span> {m.away_score}
                      </span>
                      <span className="flex-1 min-w-0 text-left text-sm font-medium truncate">
                        {away?.name ?? "?"} {away?.flag_emoji ?? "🏳️"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <QuickActions earlyBracketOn={earlyBracketOn} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatChip
          icon={Users}
          label="Jugadores"
          value={totalPlayers ?? 0}
        />
        <StatChip
          icon={Goal}
          label="Partidos cargados"
          value={(totalGroupMatches ?? 0) + 0}
        />
        <StatChip
          icon={TrendingUp}
          label="Tus puntos"
          value={myScore?.total_points ?? 0}
          accent
        />
        <StatChip
          icon={ChartLine}
          label="Tu progreso"
          value={`${overallPct}%`}
        />
      </div>
    </div>
  );
}

function DeadlineCard({ deadline }: { deadline: DeadlineRow | null | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-[var(--color-accent)]" />
          Próximo cierre
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deadline ? (
          <>
            <p className="text-sm text-[var(--color-text-muted)]">
              {STAGE_PRETTY[deadline.stage] ?? deadline.stage}
            </p>
            <p className="mt-1 text-base sm:text-lg font-semibold tabular-nums">
              {formatDateMx(deadline.deadline_at)}
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            No hay deadlines activos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NextMatchCard({
  match,
  teamMap,
}: {
  match: MatchRow | null | undefined;
  teamMap: Map<string, TeamRow>;
}) {
  const home = match ? teamMap.get(match.home_team_code ?? "") : null;
  const away = match ? teamMap.get(match.away_team_code ?? "") : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Goal className="h-4 w-4 text-[var(--color-primary)]" />
          Próximo partido
        </CardTitle>
      </CardHeader>
      <CardContent>
        {match ? (
          <>
            <p className="font-semibold text-base">
              {home?.flag_emoji ?? "🏳️"} {home?.name ?? match.home_team_code} vs{" "}
              {away?.name ?? match.away_team_code} {away?.flag_emoji ?? "🏳️"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)] tabular-nums">
              {formatDateMx(match.kickoff_at)}
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Aún no hay partidos programados.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function YourRankCard({
  myRank,
  myScore,
  totalPlayers,
}: {
  myRank: number;
  myScore: number;
  totalPlayers: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-[var(--color-gold)]" />
          Tu posición
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myRank >= 0 ? (
          <>
            <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-semibold tabular-nums">
              #{myRank + 1}
              <span className="text-sm font-normal text-[var(--color-text-muted)]">
                {" "}
                de {totalPlayers}
              </span>
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text)] tabular-nums">{myScore}</span>{" "}
              pts acumulados
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Aún no tienes puntos. Mete pronósticos para entrar al ranking.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressBar({
  label,
  done,
  total,
  href,
  icon: Icon,
  accent,
  hint,
  infoTitle,
  infoDescription,
}: {
  label: string;
  done: number;
  total: number;
  href: string;
  icon: typeof Target;
  accent?: boolean;
  hint?: string;
  infoTitle?: string;
  infoDescription?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = done >= total && total > 0;
  return (
    <div className="rounded-[var(--radius-md)] p-3 sm:p-4 bg-[var(--color-surface-2)] hover:bg-[var(--color-border)] transition-colors">
      <div className="flex items-center justify-between gap-3 mb-2">
        <Link href={href} className="flex items-center gap-2 min-w-0 flex-1">
          <Icon
            className={
              accent
                ? "h-4 w-4 text-[var(--color-accent)] shrink-0"
                : "h-4 w-4 text-[var(--color-primary)] shrink-0"
            }
          />
          <span className="font-medium text-sm text-[var(--color-text)] truncate">{label}</span>
          {infoTitle && infoDescription && (
            <InfoTooltip title={infoTitle} description={infoDescription} />
          )}
        </Link>
        <span
          className={
            complete
              ? "text-xs font-semibold text-[var(--color-success)] tabular-nums"
              : "text-xs font-medium text-[var(--color-text-muted)] tabular-nums"
          }
        >
          {done} / {total}
        </span>
      </div>
      <Link href={href} className="block">
        <div className="h-1.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
          <div
            className={
              accent
                ? "h-full bg-[var(--color-accent)] transition-all duration-500"
                : complete
                  ? "h-full bg-[var(--color-success)] transition-all duration-500"
                  : "h-full bg-[var(--color-primary)] transition-all duration-500"
            }
            style={{ width: `${pct}%` }}
          />
        </div>
      </Link>
      {hint && (
        <p className="mt-2 text-xs text-[var(--color-text-subtle)]">{hint}</p>
      )}
    </div>
  );
}

function MiniRanking({
  scores,
  mePlayerId,
}: {
  scores: ScoreRow[];
  mePlayerId: string;
}) {
  if (scores.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
        Aún no hay jugadores con puntos.
      </p>
    );
  }
  const podiumIcons = [
    { Icon: Trophy, color: "var(--color-gold)" },
    { Icon: Medal, color: "var(--color-text-subtle)" },
    { Icon: Award, color: "#B87333" },
  ];
  return (
    <ol className="space-y-1">
      {scores.map((s, idx) => {
        const podium = idx < 3 ? podiumIcons[idx] : null;
        const isMe = s.player_id === mePlayerId;
        return (
          <li
            key={s.player_id}
            className={
              isMe
                ? "flex items-center gap-2 py-1.5 px-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)]/8"
                : "flex items-center gap-2 py-1.5 px-2"
            }
          >
            <span className="w-5 text-xs font-medium text-[var(--color-text-muted)] text-right tabular-nums">
              {idx + 1}
            </span>
            {podium ? (
              <podium.Icon className="h-4 w-4 shrink-0" style={{ color: podium.color }} />
            ) : (
              <span className="w-4 h-4 shrink-0" />
            )}
            <span className={isMe ? "flex-1 min-w-0 truncate text-sm font-semibold" : "flex-1 min-w-0 truncate text-sm"}>
              {s.player_name}
              {isMe && <span className="ml-1 text-xs text-[var(--color-primary)]">(tú)</span>}
            </span>
            <span className="tabular-nums text-sm font-semibold">{s.total_points}</span>
          </li>
        );
      })}
    </ol>
  );
}

function QuickActions({ earlyBracketOn }: { earlyBracketOn: boolean }) {
  const links = [
    { href: "/pronosticos/grupos", label: "Grupos", icon: Target, color: "var(--color-primary)" },
    { href: "/pronosticos/terceros", label: "Terceros", icon: Sparkles, color: "var(--color-warning)" },
    earlyBracketOn
      ? { href: "/pronosticos/bracket-inicio", label: "Bracket inicio", icon: Trophy, color: "var(--color-accent)" }
      : { href: "/bracket", label: "Bracket", icon: Trophy, color: "var(--color-gold)" },
    { href: "/estadisticas", label: "Estadísticas", icon: ChartLine, color: "var(--color-primary)" },
    { href: "/pronosticos-publicos", label: "Públicos", icon: Users, color: "var(--color-text-muted)" },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all"
        >
          <l.icon className="h-5 w-5" style={{ color: l.color }} />
          <span className="text-xs sm:text-sm font-medium text-[var(--color-text)] text-center">
            {l.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Target;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-[var(--color-primary)]/30" : ""}>
      <CardContent className="p-3 sm:p-4 flex items-center gap-3">
        <div
          className={
            accent
              ? "h-9 w-9 rounded-full bg-[var(--color-primary)]/12 flex items-center justify-center shrink-0"
              : "h-9 w-9 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center shrink-0"
          }
        >
          <Icon
            className={
              accent
                ? "h-4 w-4 text-[var(--color-primary)]"
                : "h-4 w-4 text-[var(--color-text-muted)]"
            }
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-text-muted)] truncate">{label}</p>
          <p className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-semibold tabular-nums">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
