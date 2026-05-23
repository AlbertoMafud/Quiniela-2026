import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Vercel Cron: ingesta automática de resultados desde football-data.org.
 *
 * Solo procesa si admin_config.auto_ingest_enabled = true.
 * Auth: header Authorization: Bearer ${CRON_SECRET}.
 *
 * El team-code mapping entre football-data.org y nuestro catálogo es manual
 * (ver FOOTBALL_DATA_TEAM_MAP). Cuando el sorteo del Mundial 2026 confirme
 * los equipos finales, hay que llenar ese mapping (~48 entradas).
 */

const FOOTBALL_DATA_URL = "https://api.football-data.org/v4/competitions/WC/matches";

// Mapping football-data team name → nuestro team.code.
// TODO: llenar con los 48 equipos del Mundial 2026 cuando se confirmen.
const FOOTBALL_DATA_TEAM_MAP: Record<string, string> = {
  // Ejemplo: "Mexico": "MEX", "Argentina": "ARG", ...
};

interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

interface FDResponse {
  matches: FDMatch[];
}

export async function GET(request: Request) {
  // Auth: solo Vercel Cron (o requests con el secret) pueden dispararlo.
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();

  // Verificar toggle.
  const { data: cfg } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "auto_ingest_enabled")
    .maybeSingle<{ value: unknown }>();

  if (!cfg || !Boolean(cfg.value)) {
    return NextResponse.json({
      skipped: true,
      reason: "auto_ingest_enabled=false",
    });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FOOTBALL_DATA_API_KEY not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(FOOTBALL_DATA_URL, {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `football-data.org returned ${res.status}` },
        { status: 502 },
      );
    }
    const json = (await res.json()) as FDResponse;

    const finished = json.matches.filter((m) => m.status === "FINISHED");
    const updated: string[] = [];
    const skipped: { reason: string; match: number }[] = [];

    for (const m of finished) {
      const homeCode = FOOTBALL_DATA_TEAM_MAP[m.homeTeam.name];
      const awayCode = FOOTBALL_DATA_TEAM_MAP[m.awayTeam.name];
      if (!homeCode || !awayCode) {
        skipped.push({ reason: "team mapping missing", match: m.id });
        continue;
      }
      const home = m.score.fullTime.home;
      const away = m.score.fullTime.away;
      if (home === null || away === null) {
        skipped.push({ reason: "no score", match: m.id });
        continue;
      }

      // Buscar nuestro match por team codes + kickoff (aprox same day).
      const { data: ourMatch } = await supabase
        .from("matches")
        .select("id, kickoff_at")
        .eq("home_team_code", homeCode)
        .eq("away_team_code", awayCode)
        .maybeSingle<{ id: string; kickoff_at: string }>();

      if (!ourMatch) {
        skipped.push({ reason: "match not found in our DB", match: m.id });
        continue;
      }

      const { error } = await supabase
        .from("matches")
        .update({
          home_score: home,
          away_score: away,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", ourMatch.id);

      if (error) {
        skipped.push({ reason: error.message, match: m.id });
        continue;
      }
      updated.push(ourMatch.id);
    }

    return NextResponse.json({
      ok: true,
      updated,
      skipped,
      total_finished: finished.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
