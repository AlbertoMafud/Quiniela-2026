import { adminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressGrid } from "./_components/progress-grid";

export const metadata = { title: "Progreso · Admin" };

const KNOCKOUT_ROUNDS = ["r32", "r16", "qf", "sf", "final"] as const;
export type KnockoutRound = (typeof KNOCKOUT_ROUNDS)[number];

export const ROUND_LABELS: Record<KnockoutRound, string> = {
  r32: "16avos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semis",
  final: "Final",
};

export interface PlayerProgress {
  id: string;
  name: string;
  is_admin: boolean;
  last_seen_at: string | null;
  group_preds: number;
  third_picks: number;
  early_bracket_picks: number;
  bracket_picks: Partial<Record<KnockoutRound, number>>;
  marcador_picks: Partial<Record<KnockoutRound, number>>;
}

export interface ProgressMeta {
  total_group_matches: number;
  early_bracket_enabled: boolean;
  early_bracket_total: number;
  knockout_rounds: KnockoutRound[];
  knockout_totals: Partial<Record<KnockoutRound, number>>;
  marcador_rounds: KnockoutRound[];
  marcador_totals: Partial<Record<KnockoutRound, number>>;
}

export default async function ProgresoPage() {
  const supabase = adminClient();

  const [
    { data: players },
    { data: allMatches },
    allPreds,
    { data: thirdPickRows },
    { data: earlyBracketRows },
    { data: bracketPickRows },
    { data: configRows },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, is_admin, last_seen_at")
      .order("name"),
    supabase.from("matches").select("id, stage, home_team_code, away_team_code"),
    fetchAllRows<{ player_id: string; match_id: string }>((from, to) =>
      supabase.from("predictions").select("player_id, match_id").order("id").range(from, to),
    ),
    supabase.from("third_picks").select("player_id"),
    supabase
      .from("early_bracket_picks")
      .select("player_id")
      .not("winner_team_code", "is", null),
    supabase
      .from("bracket_picks")
      .select("player_id, round")
      .not("winner_team_code", "is", null),
    supabase.from("admin_config").select("key, value"),
  ]);

  // Match stage lookup & count per stage
  type MatchRow = {
    id: string;
    stage: string;
    home_team_code: string | null;
    away_team_code: string | null;
  };
  const matchStage = new Map<string, string>();
  const matchCount = new Map<string, number>();
  // Partidos por etapa con AMBOS equipos ya resueltos (real-jugables, no solo
  // el slot del cuadro) — denominador del Marcador, distinto del de Cuadro.
  const marcadorMatchCount = new Map<string, number>();
  for (const m of (allMatches ?? []) as MatchRow[]) {
    matchStage.set(m.id, m.stage);
    matchCount.set(m.stage, (matchCount.get(m.stage) ?? 0) + 1);
    if (m.home_team_code && m.away_team_code) {
      marcadorMatchCount.set(m.stage, (marcadorMatchCount.get(m.stage) ?? 0) + 1);
    }
  }

  // Admin config
  type ConfigRow = { key: string; value: unknown };
  const configMap = new Map(
    ((configRows ?? []) as ConfigRow[]).map((r) => [r.key, Boolean(r.value)]),
  );
  const earlyBracketEnabled = configMap.get("early_bracket_enabled") ?? false;

  // Group predictions per player
  type PredRow = { player_id: string; match_id: string };
  const groupByPlayer = new Map<string, number>();
  for (const pred of (allPreds ?? []) as PredRow[]) {
    if (matchStage.get(pred.match_id) === "group") {
      groupByPlayer.set(
        pred.player_id,
        (groupByPlayer.get(pred.player_id) ?? 0) + 1,
      );
    }
  }

  // Marcador (predictions) por jugador por ronda de eliminatoria — mismas
  // filas de `predictions` ya traídas arriba, solo agrupadas por etapa de KO
  // en vez de sumadas todas en el contador de grupos.
  const marcadorByPlayer = new Map<string, Map<string, number>>();
  for (const pred of (allPreds ?? []) as PredRow[]) {
    const stage = matchStage.get(pred.match_id);
    if (!stage || stage === "group") continue;
    if (!marcadorByPlayer.has(pred.player_id)) {
      marcadorByPlayer.set(pred.player_id, new Map());
    }
    const rm = marcadorByPlayer.get(pred.player_id)!;
    rm.set(stage, (rm.get(stage) ?? 0) + 1);
  }

  // Third picks per player
  type SimpleRow = { player_id: string };
  const thirdByPlayer = new Map<string, number>();
  for (const r of (thirdPickRows ?? []) as SimpleRow[]) {
    thirdByPlayer.set(r.player_id, (thirdByPlayer.get(r.player_id) ?? 0) + 1);
  }

  // Early bracket picks per player
  const earlyByPlayer = new Map<string, number>();
  for (const r of (earlyBracketRows ?? []) as SimpleRow[]) {
    earlyByPlayer.set(r.player_id, (earlyByPlayer.get(r.player_id) ?? 0) + 1);
  }

  // Bracket picks per player per round
  type BracketRow = { player_id: string; round: string };
  const bracketByPlayer = new Map<string, Map<string, number>>();
  for (const r of (bracketPickRows ?? []) as BracketRow[]) {
    if (!bracketByPlayer.has(r.player_id)) {
      bracketByPlayer.set(r.player_id, new Map());
    }
    const rm = bracketByPlayer.get(r.player_id)!;
    rm.set(r.round, (rm.get(r.round) ?? 0) + 1);
  }

  // Knockout rounds that have matches in DB (in chronological order)
  const availableRounds = KNOCKOUT_ROUNDS.filter(
    (r) => (matchCount.get(r) ?? 0) > 0,
  );
  const knockoutTotals: Partial<Record<KnockoutRound, number>> = {};
  for (const r of availableRounds) {
    knockoutTotals[r] = matchCount.get(r) ?? 0;
  }

  // Rondas de Marcador: solo las que ya tienen al menos un partido con AMBOS
  // equipos reales asignados (si no, sería puro 0/N sin sentido todavía).
  const marcadorRounds = KNOCKOUT_ROUNDS.filter(
    (r) => (marcadorMatchCount.get(r) ?? 0) > 0,
  );
  const marcadorTotals: Partial<Record<KnockoutRound, number>> = {};
  for (const r of marcadorRounds) {
    marcadorTotals[r] = marcadorMatchCount.get(r) ?? 0;
  }

  // Build per-player progress
  type PlayerRow = {
    id: string;
    name: string;
    is_admin: boolean;
    last_seen_at: string | null;
  };
  const playerProgress: PlayerProgress[] = (
    (players ?? []) as PlayerRow[]
  ).map((p) => {
    const roundPicks: Partial<Record<KnockoutRound, number>> = {};
    const playerRounds = bracketByPlayer.get(p.id);
    for (const r of availableRounds) {
      roundPicks[r] = playerRounds?.get(r) ?? 0;
    }
    const marcadorPicks: Partial<Record<KnockoutRound, number>> = {};
    const playerMarcador = marcadorByPlayer.get(p.id);
    for (const r of marcadorRounds) {
      marcadorPicks[r] = playerMarcador?.get(r) ?? 0;
    }
    return {
      ...p,
      group_preds: groupByPlayer.get(p.id) ?? 0,
      third_picks: thirdByPlayer.get(p.id) ?? 0,
      early_bracket_picks: earlyByPlayer.get(p.id) ?? 0,
      bracket_picks: roundPicks,
      marcador_picks: marcadorPicks,
    };
  });

  const meta: ProgressMeta = {
    total_group_matches: matchCount.get("group") ?? 0,
    early_bracket_enabled: earlyBracketEnabled,
    early_bracket_total: 31, // R32(16) + R16(8) + QF(4) + SF(2) + Final(1)
    knockout_rounds: availableRounds,
    knockout_totals: knockoutTotals,
    marcador_rounds: marcadorRounds,
    marcador_totals: marcadorTotals,
  };

  // Quick summary counts
  const completedGroups = playerProgress.filter(
    (p) => meta.total_group_matches > 0 && p.group_preds === meta.total_group_matches,
  ).length;
  const completedThirds = playerProgress.filter((p) => p.third_picks === 8).length;
  const total = playerProgress.length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Progreso de jugadores
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Avance por fase. Verde = completo · Amarillo = parcial · Rojo = sin
          empezar.
        </p>
        {meta.marcador_rounds.length > 0 && (
          <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
            <strong>Cuadro</strong> = quién avanza (se llena una vez para todo
            el torneo). <strong>Marcador</strong> = resultado real de cada
            partido, ronda por ronda. En 16avos siempre coinciden — tu
            marcador llena automáticamente esa selección del cuadro. De
            octavos en adelante son independientes.
          </p>
        )}
      </header>

      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard
            label="Grupos completos"
            value={completedGroups}
            total={total}
          />
          <SummaryCard
            label="Terceros completos"
            value={completedThirds}
            total={total}
          />
          {earlyBracketEnabled && (
            <SummaryCard
              label="Cuadro inicial completo"
              value={
                playerProgress.filter(
                  (p) => p.early_bracket_picks === meta.early_bracket_total,
                ).length
              }
              total={total}
            />
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalle por jugador</CardTitle>
          <CardDescription>
            Pronósticos ingresados sobre el total esperado por etapa.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <ProgressGrid players={playerProgress} meta={meta} />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const allDone = value === total;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums ${
          allDone
            ? "text-[var(--color-success)]"
            : "text-[var(--color-text)]"
        }`}
      >
        {value}
        <span className="text-base font-normal text-[var(--color-text-muted)]">
          /{total}
        </span>
      </p>
    </div>
  );
}
