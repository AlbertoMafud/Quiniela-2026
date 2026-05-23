import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToolButton } from "./_components/tool-button";
import {
  fillMyPredictionsAction,
  fillEveryonePredictionsAction,
  fillGroupResultsAction,
  clearAllResultsAction,
  createKnockoutMatchesAction,
} from "./_actions";

export const metadata = { title: "Herramientas · Admin" };

export default function HerramientasPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Herramientas de prueba
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Generadores de data ficticia para probar la app antes de que arranque el Mundial.
          Úsalos con cuidado en producción.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Pronósticos</CardTitle>
          <CardDescription>
            Llena pronósticos de marcadores en partidos de fase de grupos.
            No sobreescribe los que ya existen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToolButton
            action={fillMyPredictionsAction}
            label="Llenar mis pronósticos en blanco"
            description="Genera marcadores aleatorios (0-4 goles, distribución realista) para los partidos donde NO tengo pronóstico."
          />
          <ToolButton
            action={fillEveryonePredictionsAction}
            label="Llenar pronósticos de TODOS los jugadores"
            description="Útil para probar /ranking, /estadisticas y vista pública. Insert masivo."
            variant="outline"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados oficiales</CardTitle>
          <CardDescription>
            Llena los marcadores reales (home_score / away_score) para simular el avance del torneo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToolButton
            action={fillGroupResultsAction}
            label="Asignar marcadores ficticios a fase de grupos"
            description="Genera resultados aleatorios en TODOS los 72 partidos. Recalcula automáticamente el ranking, standings y mejores terceros."
          />
          <ToolButton
            action={clearAllResultsAction}
            label="Borrar todos los marcadores reales"
            description="Vuelve los matches a sin resultado. Los pronósticos de los jugadores quedan intactos."
            variant="destructive"
            confirm
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bracket de eliminatorias</CardTitle>
          <CardDescription>
            Crea los matches de R32..Final a partir de los standings reales.
            Solo funciona cuando la fase de grupos esté completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToolButton
            action={createKnockoutMatchesAction}
            label="Crear matches de eliminatorias (R32..Final)"
            description="Computa standings reales, top-2 + 8 mejores terceros, y crea los 31 partidos del bracket. R32 con equipos reales; rondas siguientes con TBD que se resuelven cuando metas resultados."
          />
        </CardContent>
      </Card>
    </div>
  );
}
