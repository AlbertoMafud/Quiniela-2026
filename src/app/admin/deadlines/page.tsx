import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeadlinesForm } from "./_components/deadlines-form";

export const metadata = { title: "Deadlines · Admin" };

interface DeadlineRow { stage: string; deadline_at: string }

const STAGE_LABELS: Record<string, string> = {
  group_stage: "Fase de grupos (marcadores)",
  thirds: "Selección de 8 mejores terceros",
  early_bracket: "Bracket desde el inicio",
  r32_picks: "Selecciones de 16avos (bracket)",
  r32_scores: "Marcadores de 16avos",
  r16_picks: "Selecciones de octavos (bracket)",
  r16_scores: "Marcadores de octavos",
  qf_picks: "Selecciones de cuartos (bracket)",
  qf_scores: "Marcadores de cuartos",
  sf_picks: "Selecciones de semifinales (bracket)",
  sf_scores: "Marcadores de semifinales",
  final_picks: "Selecciones de la final (bracket)",
  final_scores: "Marcador de la final",
};

const ORDER = Object.keys(STAGE_LABELS);

export default async function DeadlinesPage() {
  const supabase = adminClient();
  const { data } = await supabase
    .from("deadlines")
    .select("stage, deadline_at");

  const map = new Map(
    ((data ?? []) as DeadlineRow[]).map((d) => [d.stage, d.deadline_at]),
  );

  const items = ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    deadline_at: map.get(stage) ?? null,
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Deadlines
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Después de cada fecha y hora, los jugadores ya no pueden editar pronósticos
          de esa etapa.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Configuración por etapa</CardTitle>
          <CardDescription>
            Las horas se interpretan en tu zona horaria local. Guarda cada renglón por separado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeadlinesForm items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
