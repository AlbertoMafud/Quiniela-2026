import { adminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoringRow {
  exact_score_pts: number;
  correct_winner_pts: number;
}

const DEFAULTS: ScoringRow = {
  exact_score_pts: 3,
  correct_winner_pts: 1,
};

export async function RulesContent({ compact = false }: { compact?: boolean }) {
  const supabase = adminClient();
  const { data } = await supabase
    .from("scoring_params")
    .select("exact_score_pts, correct_winner_pts")
    .eq("id", 1)
    .maybeSingle<ScoringRow>();

  const p = data ?? DEFAULTS;

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      <Card style={{ background: "var(--gradient-card-primary)" }}>
        <CardHeader>
          <CardTitle>Marcador de partidos</CardTitle>
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

      <Card style={{ background: "var(--gradient-card-info)" }}>
        <CardHeader>
          <CardTitle>Clasificados a 16avos</CardTitle>
          <CardDescription>
            Tus primeros, segundos y mejores terceros elegidos definen tus 32
            clasificados. Ganas 1 punto por cada uno que realmente pasó a 16avos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RuleRow
            label="Por cada equipo tuyo que sí pasó a 16avos"
            description="Hasta 32 puntos si le atinas a los 32"
            points={1}
          />
        </CardContent>
      </Card>

      <Card style={{ background: "var(--gradient-card-accent)" }}>
        <CardHeader>
          <CardTitle>Cuadro eliminatorio</CardTitle>
          <CardDescription>
            Antes de 16avos llenas tu cuadro completo (quién avanza ronda por ronda).
            Por cada acierto, e independiente del marcador:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RuleRow label="Pasa 16avos (llega a octavos)" points={2} />
          <RuleRow label="Pasa octavos (llega a cuartos)" points={3} />
          <RuleRow label="Pasa cuartos (llega a semifinal)" points={4} />
          <RuleRow label="Pasa semifinal (llega a la final)" points={5} />
          <RuleRow label="Campeón" points={6} />
        </CardContent>
      </Card>

      <Card style={{ background: "var(--gradient-card-info)" }}>
        <CardHeader>
          <CardTitle>Mecánica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--color-text)]">
          <p>
            <strong>1. Fase de grupos:</strong> mete los marcadores de los 72 partidos
            y elige tus 8 mejores terceros. Puedes editar hasta que pase el Cierre.
          </p>
          <p>
            <strong>2. Clasificados:</strong> al terminar los grupos se calculan tus
            32 clasificados y ganas +1 por cada uno que realmente pasó a 16avos.
          </p>
          <p>
            <strong>3. Cuadro eliminatorio:</strong> con los equipos reales que pasaron,
            llenas tu cuadro indicando quién avanza en cada llave (bonus 2 a 6).
          </p>
          <p>
            <strong>4. Marcador de eliminatorias:</strong> además del cuadro, en cada
            ronda metes el marcador exacto de cada partido para ganar más puntos. Los
            puntos de cuadro y de marcador son independientes y se suman.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plazos</CardTitle>
          <CardDescription>
            Los pronósticos se pueden editar mientras no haya pasado el Cierre de su etapa.
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
