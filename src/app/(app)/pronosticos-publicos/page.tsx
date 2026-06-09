import Link from "next/link";
import { Eye, Lock, Goal, Globe } from "lucide-react";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { Card, CardContent } from "@/components/ui/card";
import { ROUND_LABELS, type Round } from "@/lib/bracket-structure";

export const metadata = { title: "Pronósticos públicos" };

interface MatchRow {
  id: string;
  stage: string;
  group_letter: string | null;
  home_score: number | null;
  away_score: number | null;
}
interface DeadlineRow { stage: string; deadline_at: string }
interface PredCountRow { match_id: string }
interface TeamRow { code: string; name: string; group_letter: string; flag_emoji: string | null }

// Tinte alternado por grupo para que se vea colorido
const GROUP_TINTS: string[] = [
  "var(--gradient-card-primary)",
  "var(--gradient-card-accent)",
  "var(--gradient-card-info)",
  "var(--gradient-card-gold)",
];

const ROUND_ORDER: Round[] = ["r32", "r16", "qf", "sf", "final"];
const ROUND_SIZE: Record<Round, number> = { r32: 16, r16: 8, qf: 4, sf: 2, final: 1 };
const ROUND_REVEAL_STAGE: Record<Round, string> = {
  r32: "r32_scores",
  r16: "r16_scores",
  qf: "qf_scores",
  sf: "sf_scores",
  final: "final_scores",
};

export default async function PronosticosPublicosPage() {
  const session = await getSession();
  const supabase = adminClient();

  const [
    { data: allMatches },
    { data: allDeadlines },
    predictions,
    { data: teams },
    { data: mePlayer },
    { data: previewConfig },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, stage, group_letter, home_score, away_score"),
    supabase
      .from("deadlines")
      .select("stage, deadline_at"),
    fetchAllRows<PredCountRow>((from, to) =>
      supabase.from("predictions").select("match_id").order("id").range(from, to),
    ),
    supabase
      .from("teams")
      .select("code, name, group_letter, flag_emoji"),
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
  ]);

  const isAdmin = mePlayer?.is_admin === true;
  const adminPreviewEnabled = Boolean(previewConfig?.value);
  const canPreview = isAdmin && adminPreviewEnabled;

  const matches = (allMatches ?? []) as MatchRow[];
  const teamsList = (teams ?? []) as TeamRow[];
  const deadlines = (allDeadlines ?? []) as DeadlineRow[];

  const deadlineByStage = new Map<string, Date>();
  for (const d of deadlines) deadlineByStage.set(d.stage, new Date(d.deadline_at));

  const now = new Date();
  function isRevealed(stage: string): boolean {
    if (canPreview) return true;
    const dl = deadlineByStage.get(stage);
    return !!dl && dl <= now;
  }

  // ---- Stats por grupo
  const groupStats = new Map<
    string,
    { played: number; total: number; predictions: number; teams: TeamRow[] }
  >();
  for (const t of teamsList) {
    const cur = groupStats.get(t.group_letter) ?? {
      played: 0,
      total: 0,
      predictions: 0,
      teams: [],
    };
    cur.teams.push(t);
    groupStats.set(t.group_letter, cur);
  }
  const matchIdToGroup = new Map<string, string>();
  const matchIdToRound = new Map<string, Round>();
  for (const m of matches) {
    if (m.stage === "group" && m.group_letter) {
      const cur = groupStats.get(m.group_letter);
      if (cur) {
        cur.total += 1;
        if (m.home_score !== null && m.away_score !== null) cur.played += 1;
      }
      matchIdToGroup.set(m.id, m.group_letter);
    } else if (ROUND_ORDER.includes(m.stage as Round)) {
      matchIdToRound.set(m.id, m.stage as Round);
    }
  }

  // ---- Stats por ronda
  const roundStats: Record<Round, { played: number; total: number; predictions: number }> = {
    r32: { played: 0, total: 0, predictions: 0 },
    r16: { played: 0, total: 0, predictions: 0 },
    qf: { played: 0, total: 0, predictions: 0 },
    sf: { played: 0, total: 0, predictions: 0 },
    final: { played: 0, total: 0, predictions: 0 },
  };
  for (const m of matches) {
    if (ROUND_ORDER.includes(m.stage as Round)) {
      const r = m.stage as Round;
      roundStats[r].total += 1;
      if (m.home_score !== null && m.away_score !== null) roundStats[r].played += 1;
    }
  }

  // ---- Conteo de predictions por grupo y por ronda
  for (const p of (predictions ?? []) as PredCountRow[]) {
    const g = matchIdToGroup.get(p.match_id);
    if (g) {
      const cur = groupStats.get(g);
      if (cur) cur.predictions += 1;
      continue;
    }
    const r = matchIdToRound.get(p.match_id);
    if (r) roundStats[r].predictions += 1;
  }

  const groupsRevealed = isRevealed("group_stage");
  const previewBanner = canPreview && !groupsRevealed;
  const sortedGroups = Array.from(groupStats.keys()).sort();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Pronósticos públicos
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          Después de que pase el Cierre de cada etapa, podrás ver los pronósticos
          de toda la familia consolidados por grupo y partido.
        </p>
      </header>

      {previewBanner && (
        <Card className="border-[var(--color-info)]/40 bg-[var(--color-info)]/8">
          <CardContent className="py-3 text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-[var(--color-info)] shrink-0" />
            <p className="text-[var(--color-text)]">
              <strong>Vista previa de admin:</strong> el Cierre aún no se cumple,
              pero estás viendo los pronósticos porque la previsualización para
              admins está activa.
            </p>
          </CardContent>
        </Card>
      )}

      {/* --- Grupos --- */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)]">
          <Globe className="h-5 w-5 text-[var(--color-info)]" />
          Fase de grupos
        </h2>

        {!groupsRevealed && (
          <Card className="border-[var(--color-warning)]/40" style={{ background: "var(--color-surface-tint-accent)" }}>
            <CardContent className="py-4 text-sm">
              <p className="text-[var(--color-text)]">
                <strong>Aún no se pueden ver los pronósticos de grupos.</strong> Se
                abrirán al pasar el Cierre de la fase de grupos (11 de junio).
                Los grupos se muestran aquí para que sepas qué hay disponible.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {sortedGroups.map((g, idx) => {
            const s = groupStats.get(g)!;
            const teamsSorted = s.teams.slice().sort((a, b) =>
              a.code.localeCompare(b.code),
            );
            return (
              <Link key={g} href={`/pronosticos-publicos/${g}`}>
                <Card
                  className="hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all border-[var(--color-border)] h-full"
                  style={{ background: GROUP_TINTS[idx % GROUP_TINTS.length] }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
                        Grupo {g}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface)]/70 text-[var(--color-text-muted)] tabular-nums">
                        {s.played}/{s.total}
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs sm:text-[13px]">
                      {teamsSorted.map((t) => (
                        <li key={t.code} className="flex items-center gap-1.5 truncate">
                          <span className="shrink-0">{t.flag_emoji ?? "🏳️"}</span>
                          <span className="truncate text-[var(--color-text)]">{t.name}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                      {s.predictions} pronósticos en este grupo
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* --- Eliminatorias --- */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-base font-[family-name:var(--font-display)] font-semibold text-[var(--color-text)]">
          <Goal className="h-5 w-5 text-[var(--color-accent)]" />
          Eliminatorias
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {ROUND_ORDER.map((round) => {
            const s = roundStats[round];
            const revealed = isRevealed(ROUND_REVEAL_STAGE[round]);
            const dl = deadlineByStage.get(ROUND_REVEAL_STAGE[round]);
            const totalExpected = ROUND_SIZE[round];
            const noMatches = s.total === 0;

            const Inner = (
              <Card
                className={
                  revealed
                    ? "hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all border-[var(--color-accent)]/30 h-full"
                    : "border-[var(--color-border)] h-full opacity-80"
                }
                style={
                  revealed
                    ? { background: "var(--gradient-card-accent)" }
                    : undefined
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-[var(--color-text)]">
                      {ROUND_LABELS[round]}
                    </p>
                    {!revealed && (
                      <Lock className="h-3.5 w-3.5 text-[var(--color-text-subtle)] shrink-0 mt-1" />
                    )}
                  </div>
                  {noMatches ? (
                    <p className="text-xs text-[var(--color-text-subtle)]">
                      Partidos por cargar.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-[var(--color-text-muted)] tabular-nums">
                        {s.played}/{s.total} de {totalExpected} partidos
                      </p>
                      {revealed ? (
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {s.predictions} pronósticos
                        </p>
                      ) : dl ? (
                        <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                          Se abre al cerrar marcadores.
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                          Sin Cierre configurado.
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );

            // Clickable solo si hay partidos cargados (revelado o no — el detail muestra el bloqueo si toca)
            if (noMatches) return <div key={round}>{Inner}</div>;
            return (
              <Link key={round} href={`/pronosticos-publicos/eliminatorias/${round}`}>
                {Inner}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
