import Link from "next/link";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computeStandings, pickThirds, type MatchScore } from "@/lib/standings";
import { resolveBracket, type PicksMap } from "@/lib/derive-bracket";
import { BracketPicker } from "./_components/bracket-picker";
import { formatDateMx } from "@/lib/utils";

export const metadata = { title: "Cuadro desde el inicio" };

interface TeamRow { code: string; name: string; group_letter: string; flag_emoji: string | null }
interface MatchRow { id: string; group_letter: string | null; home_team_code: string | null; away_team_code: string | null }
interface PredRow { match_id: string; home_score: number; away_score: number }
interface PickRow { team_code: string; pick_order: number }
interface EarlyPickRow { round: string; slot_id: string; winner_team_code: string | null }

export default async function BracketInicioPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = adminClient();

  const [
    { data: cfg },
    { data: teams },
    { data: matches },
    { data: preds },
    { data: thirdPicks },
    { data: earlyPicks },
    { data: deadline },
  ] = await Promise.all([
    supabase
      .from("admin_config")
      .select("value")
      .eq("key", "early_bracket_enabled")
      .maybeSingle<{ value: unknown }>(),
    supabase.from("teams").select("code, name, group_letter, flag_emoji"),
    supabase
      .from("matches")
      .select("id, group_letter, home_team_code, away_team_code")
      .eq("stage", "group"),
    supabase
      .from("predictions")
      .select("match_id, home_score, away_score")
      .eq("player_id", session.playerId),
    supabase
      .from("third_picks")
      .select("team_code, pick_order")
      .eq("player_id", session.playerId)
      .order("pick_order", { ascending: true }),
    supabase
      .from("early_bracket_picks")
      .select("round, slot_id, winner_team_code")
      .eq("player_id", session.playerId),
    supabase
      .from("deadlines")
      .select("deadline_at")
      .eq("stage", "early_bracket")
      .maybeSingle<{ deadline_at: string }>(),
  ]);

  const enabled = Boolean(cfg?.value);

  if (!enabled) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
            Cuadro desde el inicio
          </h1>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>No está activo</CardTitle>
            <CardDescription>
              Esta modalidad opcional permite llenar el cuadro completo desde
              antes del Mundial, ganando puntos bonus si los equipos que eliges
              efectivamente llegan a esa ronda. El administrador la activa desde el
              panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/bracket"
              className="text-[var(--color-primary)] font-medium hover:underline"
            >
              Ir al cuadro tras fase de grupos →
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamsList = (teams ?? []) as TeamRow[];
  const matchRows = (matches ?? []) as MatchRow[];
  const predMap = new Map(
    ((preds ?? []) as PredRow[]).map((p) => [p.match_id, p]),
  );

  const matchScores: MatchScore[] = [];
  let missing = 0;
  for (const m of matchRows) {
    if (!m.home_team_code || !m.away_team_code) continue;
    const p = predMap.get(m.id);
    if (!p) {
      missing += 1;
      continue;
    }
    matchScores.push({
      home_team_code: m.home_team_code,
      away_team_code: m.away_team_code,
      home_score: p.home_score,
      away_score: p.away_score,
    });
  }

  const standings = computeStandings(teamsList, matchScores);
  const thirdsOrdered = ((thirdPicks ?? []) as PickRow[]).map((p) => p.team_code);

  const picksMap: PicksMap = {};
  for (const ep of (earlyPicks ?? []) as EarlyPickRow[]) {
    picksMap[ep.slot_id] = ep.winner_team_code;
  }

  const teamMap = new Map(teamsList.map((t) => [t.code, t]));
  const teamNameOf = (code: string) => teamMap.get(code)?.name ?? code;

  const resolved = resolveBracket(
    { standings, thirdsOrdered, picks: picksMap },
    teamNameOf,
  );

  const totalThirds = thirdsOrdered.length;
  const ready = missing === 0 && totalThirds === 8;

  const now = new Date();
  const deadlineDate = deadline ? new Date(deadline.deadline_at) : null;
  const locked = deadlineDate ? now >= deadlineDate : false;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Cuadro desde el inicio
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          Si los equipos que escoges aquí efectivamente llegan a esa ronda, ganas puntos bonus.
          {deadlineDate &&
            ` Cierre: ${formatDateMx(deadlineDate.toISOString())}.`}
        </p>
      </header>

      {!ready && (
        <Card>
          <CardHeader>
            <CardTitle>Te faltan pasos previos</CardTitle>
            <CardDescription>
              {missing > 0 &&
                `Llena los 72 partidos de fase de grupos (te faltan ${missing}).`}
              {missing === 0 &&
                totalThirds < 8 &&
                "Escoge tus 8 mejores terceros para que sepamos quiénes pasan a R32."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            {missing > 0 && (
              <Link
                href="/pronosticos/grupos"
                className="text-[var(--color-primary)] font-medium hover:underline"
              >
                Ir a fase de grupos →
              </Link>
            )}
            {missing === 0 && totalThirds < 8 && (
              <Link
                href="/pronosticos/terceros"
                className="text-[var(--color-primary)] font-medium hover:underline"
              >
                Ir a mejores terceros →
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {ready && (
        <BracketPicker
          matches={resolved}
          locked={locked}
          lockReason={locked ? "El deadline ya pasó." : undefined}
        />
      )}
    </div>
  );
}
