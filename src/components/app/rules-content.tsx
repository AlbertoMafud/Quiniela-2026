import { adminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoringRow {
  exact_score_pts: number;
  correct_winner_pts: number;
  early_r32_bonus: number;
  early_r16_bonus: number;
  early_qf_bonus: number;
  early_sf_bonus: number;
  early_final_bonus: number;
}

const DEFAULTS: ScoringRow = {
  exact_score_pts: 3,
  correct_winner_pts: 2,
  early_r32_bonus: 1,
  early_r16_bonus: 2,
  early_qf_bonus: 3,
  early_sf_bonus: 4,
  early_final_bonus: 5,
};

export async function RulesContent({ compact = false }: { compact?: boolean }) {
  const supabase = adminClient();
  const { data } = await supabase
    .from("scoring_params")
    .select(
      "exact_score_pts, correct_winner_pts, early_r32_bonus, early_r16_bonus, early_qf_bonus, early_sf_bonus, early_final_bonus",
    )
    .eq("id", 1)
    .maybeSingle<ScoringRow>();

  const p = data ?? DEFAULTS;

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <Card style={{ background: "var(--gradient-card-primary)" }}>
        <CardHeader>
          <CardTitle>Pronósticos de marcadores</CardTitle>
          <CardDescription>
            Aplica tanto a fase de grupos como a cada ronda de eliminatorias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RuleRow
            label="Marcador exacto"
            description="Le atinas al resultado tal cual (ej. 2-1)"
            points={p.exact_score_pts}
          />
          <RuleRow
            label="Ganador correcto"
            description="Adivinas quién gana o que es empate, aunque no le atines al marcador"
            points={p.correct_winner_pts}
          />
        </CardContent>
      </Card>

      <Card style={{ background: "var(--gradient-card-accent)" }}>
        <CardHeader>
          <CardTitle>Bracket desde el inicio (opcional)</CardTitle>
          <CardDescription>
            Si el admin lo activa, llenas el bracket completo desde antes del Mundial.
            Bonus por cada equipo que efectivamente llegue a esa ronda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RuleRow label="Llega a 16avos" points={p.early_r32_bonus} />
          <RuleRow label="Llega a octavos" points={p.early_r16_bonus} />
          <RuleRow label="Llega a cuartos" points={p.early_qf_bonus} />
          <RuleRow label="Llega a semifinales" points={p.early_sf_bonus} />
          <RuleRow label="Llega a la final" points={p.early_final_bonus} />
        </CardContent>
      </Card>

      <Card style={{ background: "var(--gradient-card-info)" }}>
        <CardHeader>
          <CardTitle>Mecánica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--color-text)]">
          <p>
            <strong>1. Fase de grupos:</strong> mete los marcadores de los 72 partidos.
            Puedes editar mientras no haya pasado el deadline.
          </p>
          <p>
            <strong>2. Mejores terceros:</strong> al terminar la fase de grupos, escoges 8
            de los 12 terceros lugares (uno por grupo).
          </p>
          <p>
            <strong>3. Cuadro tras fase de grupos:</strong> con los equipos reales que pasaron,
            llenas tu cuadro de eliminatorias indicando solo el ganador de cada llave.
          </p>
          <p>
            <strong>4. Pronósticos en eliminatorias:</strong> además del bracket, en cada
            ronda metes el marcador exacto de cada partido para ganar más puntos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plazos</CardTitle>
          <CardDescription>
            Los pronósticos se pueden editar mientras no haya pasado el deadline de su etapa.
            Después, quedan congelados y todos pueden ver lo que cada quien pronosticó.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function RuleRow({
  label,
  description,
  points,
}: {
  label: string;
  description?: string;
  points: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[var(--color-border)] last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium text-[var(--color-text)]">{label}</p>
        {description && (
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      <span className="shrink-0 inline-flex items-center justify-center min-w-12 h-9 px-3 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] font-semibold tabular-nums shadow-[var(--shadow-sm)]">
        {points} pts
      </span>
    </div>
  );
}
