import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UsersTable } from "./_components/users-table";

export const metadata = { title: "Usuarios · Admin" };

interface PlayerRow {
  id: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export default async function UsuariosPage() {
  const supabase = adminClient();

  const { data: players } = await supabase
    .from("players")
    .select("id, name, is_admin, created_at, last_seen_at")
    .order("created_at", { ascending: true });

  const { data: predRows } = await supabase
    .from("predictions")
    .select("player_id");

  const counts = new Map<string, number>();
  for (const r of (predRows ?? []) as { player_id: string }[]) {
    counts.set(r.player_id, (counts.get(r.player_id) ?? 0) + 1);
  }

  const enriched = ((players ?? []) as PlayerRow[]).map((p) => ({
    ...p,
    predictions_count: counts.get(p.id) ?? 0,
  }));

  const onlineCount = enriched.filter((p) => isOnline(p.last_seen_at)).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Usuarios
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {enriched.length} jugador{enriched.length === 1 ? "" : "es"} registrado{enriched.length === 1 ? "" : "s"}.
          {" "}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
            {onlineCount} en línea ahora.
          </span>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>
            Punto verde = activo en los últimos 2 minutos. Resetea PIN si alguien
            lo olvida, marca admin a quien necesite acceso al panel, o borra
            cuentas duplicadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable players={enriched} />
        </CardContent>
      </Card>
    </div>
  );
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const last = new Date(lastSeenAt).getTime();
  const now = Date.now();
  return now - last < 2 * 60 * 1000; // 2 minutos
}
