import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pronósticos públicos" };

interface MatchRow {
  id: string;
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

export default async function PronosticosPublicosPage() {
  const supabase = adminClient();

  const [
    { data: groupMatches },
    { data: deadline },
    { data: predictions },
    { data: teams },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, group_letter, home_score, away_score")
      .eq("stage", "group"),
    supabase
      .from("deadlines")
      .select("deadline_at")
      .eq("stage", "group_stage")
      .maybeSingle<DeadlineRow>(),
    supabase
      .from("predictions")
      .select("match_id"),
    supabase
      .from("teams")
      .select("code, name, group_letter, flag_emoji"),
  ]);

  const matches = (groupMatches ?? []) as MatchRow[];
  const teamsList = (teams ?? []) as TeamRow[];

  // Por grupo: count partidos jugados, count pronósticos, equipos
  const stats = new Map<
    string,
    { played: number; total: number; predictions: number; teams: TeamRow[] }
  >();
  for (const t of teamsList) {
    const cur = stats.get(t.group_letter) ?? {
      played: 0,
      total: 0,
      predictions: 0,
      teams: [],
    };
    cur.teams.push(t);
    stats.set(t.group_letter, cur);
  }
  for (const m of matches) {
    if (!m.group_letter) continue;
    const cur = stats.get(m.group_letter);
    if (!cur) continue;
    cur.total += 1;
    if (m.home_score !== null && m.away_score !== null) cur.played += 1;
  }
  const matchIdToGroup = new Map(matches.map((m) => [m.id, m.group_letter]));
  for (const p of (predictions ?? []) as PredCountRow[]) {
    const g = matchIdToGroup.get(p.match_id);
    if (!g) continue;
    const cur = stats.get(g);
    if (cur) cur.predictions += 1;
  }

  const now = new Date();
  const groupDeadlinePassed =
    deadline && new Date(deadline.deadline_at) <= now;

  const sortedGroups = Array.from(stats.keys()).sort();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Pronósticos públicos
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          Después de que pase el deadline de cada etapa, podrás ver los pronósticos
          de toda la familia consolidados por grupo y partido.
        </p>
      </header>

      {!groupDeadlinePassed && (
        <Card className="border-[var(--color-warning)]/40" style={{ background: "var(--color-surface-tint-accent)" }}>
          <CardContent className="py-4 text-sm">
            <p className="text-[var(--color-text)]">
              <strong>Aún no se pueden ver los pronósticos de grupos.</strong> Se
              abrirán al pasar el deadline de fase de grupos (11 de junio).
              Los grupos se muestran aquí para que sepas qué hay disponible.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {sortedGroups.map((g, idx) => {
          const s = stats.get(g)!;
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
    </div>
  );
}
