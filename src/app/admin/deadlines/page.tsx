import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { normalizeOverride, type StageOverride } from "@/lib/gates";
import { DeadlinesForm } from "./_components/deadlines-form";
import { RegistrationGateForm } from "./_components/registration-gate-form";

export const metadata = { title: "Cierres · Admin" };

interface DeadlineRow {
  stage: string;
  deadline_at: string;
}
interface ConfigRow {
  key: string;
  value: unknown;
}

const STAGE_LABELS: Record<string, string> = {
  group_stage: "Fase de grupos (marcadores)",
  thirds: "Selección de 8 mejores terceros",
  early_bracket: "Cuadro desde el inicio",
  r32_picks: "Selecciones de 16avos (cuadro)",
  r32_scores: "Marcadores de 16avos",
  r16_picks: "Selecciones de octavos (cuadro)",
  r16_scores: "Marcadores de octavos",
  qf_picks: "Selecciones de cuartos (cuadro)",
  qf_scores: "Marcadores de cuartos",
  sf_picks: "Selecciones de semifinales (cuadro)",
  sf_scores: "Marcadores de semifinales",
  final_picks: "Selecciones de la final (cuadro)",
  final_scores: "Marcador de la final",
};

const ORDER = Object.keys(STAGE_LABELS);

export default async function DeadlinesPage() {
  const supabase = adminClient();
  const [{ data: deadlines }, { data: config }] = await Promise.all([
    supabase.from("deadlines").select("stage, deadline_at"),
    supabase
      .from("admin_config")
      .select("key, value")
      .in("key", ["stage_overrides", "tournament_start_at", "registration_override"]),
  ]);

  const dlMap = new Map(
    ((deadlines ?? []) as DeadlineRow[]).map((d) => [d.stage, d.deadline_at]),
  );
  const cfgMap = new Map(
    ((config ?? []) as ConfigRow[]).map((r) => [r.key, r.value]),
  );

  const overridesRaw = cfgMap.get("stage_overrides");
  const overrides = (overridesRaw && typeof overridesRaw === "object"
    ? overridesRaw
    : {}) as Record<string, unknown>;

  const items = ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    deadline_at: dlMap.get(stage) ?? null,
    override: normalizeOverride(overrides[stage]),
  }));

  const startRaw = cfgMap.get("tournament_start_at");
  const startAt = typeof startRaw === "string" && startRaw.length > 0 ? startRaw : null;
  const registrationOverride: StageOverride = normalizeOverride(
    cfgMap.get("registration_override"),
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Cierres
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Después de cada fecha (hora CDMX) los jugadores ya no editan esa etapa. El
          estado manual gana sobre la fecha.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Inicio del torneo y registro</CardTitle>
          <CardDescription>
            La fecha de inicio cierra los registros y bloquea la edición de grupos. El
            estado manual de registro gana sobre la fecha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationGateForm startAt={startAt} override={registrationOverride} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cierres por etapa</CardTitle>
          <CardDescription>
            Las horas son CDMX. Guarda cada renglón por separado. &quot;Estado
            manual&quot; permite forzar abierto/cerrado por cualquier contingencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeadlinesForm items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
