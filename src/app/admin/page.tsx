import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CountRow { count: number | null }

export default async function AdminDashboardPage() {
  const supabase = adminClient();

  const [{ count: players }, { count: matches }, { count: predictions }, { count: results }] =
    await Promise.all([
      supabase.from("players").select("*", { count: "exact", head: true }),
      supabase.from("matches").select("*", { count: "exact", head: true }),
      supabase.from("predictions").select("*", { count: "exact", head: true }),
      supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .not("home_score", "is", null),
    ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Panel de administración
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Resumen de la quiniela.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Jugadores" value={players ?? 0} />
        <StatCard label="Partidos cargados" value={matches ?? 0} />
        <StatCard label="Pronósticos hechos" value={predictions ?? 0} />
        <StatCard label="Resultados oficiales" value={results ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atajos comunes</CardTitle>
          <CardDescription>
            Lo que más vas a hacer durante el Mundial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>Resultados</strong>: meter marcadores reales conforme van pasando los partidos.</p>
          <p>• <strong>Puntos</strong>: ajustar cuánto valen aciertos y bonus de bracket.</p>
          <p>• <strong>Deadlines</strong>: fechas de cierre por etapa. Lo que pase el deadline ya no se puede editar.</p>
          <p>• <strong>Usuarios</strong>: ver jugadores, resetear PIN, marcar admin.</p>
          <p>• <strong>Config</strong>: activar bracket-desde-el-inicio y auto-ingesta de resultados.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
        {value}
      </p>
    </Card>
  );
}
