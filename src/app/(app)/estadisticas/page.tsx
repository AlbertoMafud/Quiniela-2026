import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUND_LABELS, type Round } from "@/lib/bracket-structure";
import { formatMatchDayMx } from "@/lib/utils";

export const metadata = { title: "Estadísticas" };

interface MatchRow {
  id: string;
  stage: string;
  group_letter: string | null;
  kickoff_at: string;
  home_team_code: string | null;
  away_team_code: string | null;
}
interface TeamRow { code: string; name: string; flag_emoji: string | null }
interface PredRow { match_id: string }

export default async function EstadisticasIndexPage() {
  const supabase = adminClient();

  const [{ data: matches }, { data: teams }, preds] = await Promise.all([
    supabase
      .from("matches")
      .select("id, stage, group_letter, kickoff_at, home_team_code, away_team_code")
      .order("kickoff_at", { ascending: true })
      .limit(100),
    supabase.from("teams").select("code, name, flag_emoji"),
    fetchAllRows<PredRow>((from, to) =>
      supabase.from("predictions").select("match_id").order("id").range(from, to),
    ),
  ]);

  const teamMap = new Map(((teams ?? []) as TeamRow[]).map((t) => [t.code, t]));
  const counts = new Map<string, number>();
  for (const p of (preds ?? []) as PredRow[]) {
    counts.set(p.match_id, (counts.get(p.match_id) ?? 0) + 1);
  }

  const matchRows = (matches ?? []) as MatchRow[];

  const byStage: Record<string, MatchRow[]> = {};
  for (const m of matchRows) (byStage[m.stage] ??= []).push(m);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Estadísticas
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          Por partido: qué porcentaje de la familia se va con cada equipo y promedio de goles.
        </p>
      </header>

      {["group", "r32", "r16", "qf", "sf", "final"].map((stage) => {
        const items = byStage[stage] ?? [];
        if (items.length === 0) return null;
        const label =
          stage === "group" ? "Fase de grupos" : ROUND_LABELS[stage as Round];
        return (
          <Card key={stage}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
              <CardDescription>
                {items.length} partido{items.length === 1 ? "" : "s"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((m) => {
                  const home = teamMap.get(m.home_team_code ?? "");
                  const away = teamMap.get(m.away_team_code ?? "");
                  const count = counts.get(m.id) ?? 0;
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/estadisticas/${m.id}`}
                        className="flex flex-col gap-1 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] transition-all"
                      >
                        <p className="text-xs text-[var(--color-text-subtle)] tabular-nums">
                          {formatMatchDayMx(m.kickoff_at)}
                        </p>
                        <p className="font-medium text-sm">
                          {home?.flag_emoji ?? "🏳️"} {home?.name ?? "?"} vs{" "}
                          {away?.name ?? "?"} {away?.flag_emoji ?? "🏳️"}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {count} pronóstico{count === 1 ? "" : "s"}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
