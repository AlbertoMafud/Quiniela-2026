import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoringForm } from "./_components/scoring-form";

export const metadata = { title: "Puntos · Admin" };

interface ScoringRow {
  exact_score_pts: number;
  correct_winner_pts: number;
  early_r32_bonus: number;
  early_r16_bonus: number;
  early_qf_bonus: number;
  early_sf_bonus: number;
  early_final_bonus: number;
}

export default async function ScoringPage() {
  const supabase = adminClient();
  const { data } = await supabase
    .from("scoring_params")
    .select("*")
    .eq("id", 1)
    .maybeSingle<ScoringRow>();

  const params = data ?? {
    exact_score_pts: 3,
    correct_winner_pts: 2,
    early_r32_bonus: 1,
    early_r16_bonus: 2,
    early_qf_bonus: 3,
    early_sf_bonus: 4,
    early_final_bonus: 5,
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Parámetros de puntos
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Cambios aplican inmediatamente al ranking y a la página de reglas.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Pronósticos de marcador</CardTitle>
          <CardDescription>
            Puntos por acertar marcadores en grupos y eliminatorias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScoringForm initial={params} />
        </CardContent>
      </Card>
    </div>
  );
}
