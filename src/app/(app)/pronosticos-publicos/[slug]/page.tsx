import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUND_LABELS, type Round } from "@/lib/bracket-structure";
import { formatDateMx, slugify } from "@/lib/utils";

interface PlayerRow { id: string; name: string }
interface TeamRow { code: string; name: string; flag_emoji: string | null }
interface MatchRow {
  id: string;
  stage: string;
  group_letter: string | null;
  kickoff_at: string;
  home_team_code: string | null;
  away_team_code: string | null;
  home_score: number | null;
  away_score: number | null;
}
interface PredRow { match_id: string; home_score: number; away_score: number }
interface DeadlineRow { stage: string; deadline_at: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `Pronósticos de ${slug}` };
}

const STAGE_TO_DEADLINE: Record<string, string> = {
  group: "group_stage",
  r32: "r32_scores",
  r16: "r16_scores",
  qf: "qf_scores",
  sf: "sf_scores",
  final: "final_scores",
};

const STAGE_ORDER = ["group", "r32", "r16", "qf", "sf", "final"] as const;

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = adminClient();

  // Buscar player por slug (slugificamos nombre y comparamos).
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, name");
  const players = (allPlayers ?? []) as PlayerRow[];
  const player = players.find((p) => slugify(p.name) === slug);
  if (!player) notFound();

  const [{ data: matches }, { data: teams }, { data: preds }, { data: deadlines }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, stage, group_letter, kickoff_at, home_team_code, away_team_code, home_score, away_score",
        )
        .order("kickoff_at", { ascending: true }),
      supabase.from("teams").select("code, name, flag_emoji"),
      supabase
        .from("predictions")
        .select("match_id, home_score, away_score")
        .eq("player_id", player.id),
      supabase.from("deadlines").select("stage, deadline_at"),
    ]);

  const teamMap = new Map(((teams ?? []) as TeamRow[]).map((t) => [t.code, t]));
  const predMap = new Map(
    ((preds ?? []) as PredRow[]).map((p) => [p.match_id, p]),
  );
  const deadlineMap = new Map(
    ((deadlines ?? []) as DeadlineRow[]).map((d) => [
      d.stage,
      new Date(d.deadline_at),
    ]),
  );

  const now = new Date();

  // Por etapa, decidir si está abierto al público o no.
  function stageIsPublic(stage: string): boolean {
    const deadlineKey = STAGE_TO_DEADLINE[stage];
    if (!deadlineKey) return false;
    const dl = deadlineMap.get(deadlineKey);
    if (!dl) return false;
    return now >= dl;
  }

  const matchRows = (matches ?? []) as MatchRow[];
  const byStage: Record<string, MatchRow[]> = {};
  for (const m of matchRows) {
    (byStage[m.stage] ??= []).push(m);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/pronosticos-publicos"
            className="text-xs text-[var(--color-text-muted)] hover:underline"
          >
            ← Volver
          </Link>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
            {player.name}
          </h1>
        </div>
      </header>

      {STAGE_ORDER.map((stage) => {
        const items = byStage[stage] ?? [];
        if (items.length === 0) return null;
        const isPublic = stageIsPublic(stage);
        const label =
          stage === "group" ? "Fase de grupos" : ROUND_LABELS[stage as Round];

        return (
          <Card key={stage}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
              <CardDescription>
                {isPublic
                  ? `${items.length} partidos · deadline pasado.`
                  : "Aún no se puede ver — deadline no ha pasado."}
              </CardDescription>
            </CardHeader>
            {isPublic && (
              <CardContent>
                <ul className="space-y-2">
                  {items.map((m) => {
                    const home = teamMap.get(m.home_team_code ?? "");
                    const away = teamMap.get(m.away_team_code ?? "");
                    const pred = predMap.get(m.id);
                    return (
                      <li
                        key={m.id}
                        className="py-2 flex items-center gap-3 text-sm"
                      >
                        <span className="text-xs text-[var(--color-text-subtle)] w-32 shrink-0 tabular-nums hidden sm:inline">
                          {formatDateMx(m.kickoff_at)}
                        </span>
                        <span className="flex-1 min-w-0 text-right">
                          {home?.flag_emoji ?? "🏳️"} {home?.name ?? "?"}
                        </span>
                        <span className="shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] tabular-nums font-semibold">
                          {pred ? (
                            <>
                              {pred.home_score} <span className="text-[var(--color-text-subtle)]">-</span> {pred.away_score}
                            </>
                          ) : (
                            <span className="text-[var(--color-text-subtle)] text-xs font-normal">
                              sin pronóstico
                            </span>
                          )}
                        </span>
                        <span className="flex-1 min-w-0 text-left">
                          {away?.name ?? "?"} {away?.flag_emoji ?? "🏳️"}
                        </span>
                        {m.home_score !== null && m.away_score !== null && (
                          <span className="hidden md:inline-flex items-center text-xs text-[var(--color-text-muted)] tabular-nums shrink-0">
                            (real: {m.home_score}-{m.away_score})
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
