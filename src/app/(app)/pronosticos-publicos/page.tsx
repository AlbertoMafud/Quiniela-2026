import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { slugify } from "@/lib/utils";

export const metadata = { title: "Pronósticos públicos" };

interface PlayerRow {
  id: string;
  name: string;
  is_admin: boolean;
}

interface CountRow {
  player_id: string;
  count: number;
}

export default async function PronosticosPublicosPage() {
  const supabase = adminClient();

  const { data: players } = await supabase
    .from("players")
    .select("id, name, is_admin")
    .order("name", { ascending: true });

  const { data: predRows } = await supabase
    .from("predictions")
    .select("player_id");

  const counts = new Map<string, number>();
  for (const r of (predRows ?? []) as { player_id: string }[]) {
    counts.set(r.player_id, (counts.get(r.player_id) ?? 0) + 1);
  }

  const list = (players ?? []) as PlayerRow[];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Pronósticos públicos
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          Después de cada deadline puedes ver los pronósticos de los demás.
          Selecciona a un jugador.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Jugadores</CardTitle>
          <CardDescription>
            Cada perfil muestra los pronósticos cuya etapa ya pasó el deadline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {list.map((p) => {
              const slug = slugify(p.name);
              return (
                <li key={p.id}>
                  <Link
                    href={`/pronosticos-publicos/${slug}`}
                    className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] transition-all"
                  >
                    <div className="h-10 w-10 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center font-semibold text-sm text-[var(--color-text-muted)]">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--color-text)] truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {counts.get(p.id) ?? 0} pronósticos
                      </p>
                    </div>
                    <span className="text-[var(--color-text-subtle)] text-sm">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
