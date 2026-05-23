import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { formatDateMx } from "@/lib/utils";
import { PredictionsForm, type MatchData } from "./_components/predictions-form";

export const metadata = {
  title: "Pronósticos de fase de grupos",
};

interface MatchRow {
  id: string;
  group_letter: string | null;
  kickoff_at: string;
  home_team_code: string | null;
  away_team_code: string | null;
}

interface TeamRow {
  code: string;
  name: string;
  flag_emoji: string | null;
}

interface PredictionRow {
  match_id: string;
  home_score: number;
  away_score: number;
}

export default async function PronosticosGruposPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = adminClient();

  const [{ data: matches }, { data: teams }, { data: preds }, { data: deadline }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id, group_letter, kickoff_at, home_team_code, away_team_code")
        .eq("stage", "group")
        .order("kickoff_at", { ascending: true }),
      supabase
        .from("teams")
        .select("code, name, flag_emoji"),
      supabase
        .from("predictions")
        .select("match_id, home_score, away_score")
        .eq("player_id", session.playerId),
      supabase
        .from("deadlines")
        .select("deadline_at")
        .eq("stage", "group_stage")
        .maybeSingle<{ deadline_at: string }>(),
    ]);

  const teamMap = new Map(
    ((teams ?? []) as TeamRow[]).map((t) => [t.code, t]),
  );
  const predMap = new Map(
    ((preds ?? []) as PredictionRow[]).map((p) => [p.match_id, p]),
  );

  const matchesByGroup: Record<string, MatchData[]> = {};
  for (const row of (matches ?? []) as MatchRow[]) {
    const g = row.group_letter ?? "?";
    const home = teamMap.get(row.home_team_code ?? "");
    const away = teamMap.get(row.away_team_code ?? "");
    if (!home || !away) continue;
    const pred = predMap.get(row.id);
    (matchesByGroup[g] ??= []).push({
      id: row.id,
      group_letter: g,
      kickoff_at: row.kickoff_at,
      home: { code: home.code, name: home.name, flag_emoji: home.flag_emoji },
      away: { code: away.code, name: away.name, flag_emoji: away.flag_emoji },
      prediction: pred
        ? { home_score: pred.home_score, away_score: pred.away_score }
        : null,
    });
  }

  const now = new Date();
  const deadlineDate = deadline ? new Date(deadline.deadline_at) : null;
  const locked = deadlineDate ? now >= deadlineDate : false;

  const totalMatches = Object.values(matchesByGroup).flat().length;
  const totalDone = (preds ?? []).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Fase de grupos
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          {totalDone} de {totalMatches} pronósticos hechos.
          {deadlineDate &&
            ` Cierre: ${formatDateMx(deadlineDate.toISOString())}.`}
        </p>
      </header>

      <PredictionsForm
        matchesByGroup={matchesByGroup}
        locked={locked}
        lockReason={
          locked
            ? "El deadline de fase de grupos ya pasó."
            : undefined
        }
      />
    </div>
  );
}
