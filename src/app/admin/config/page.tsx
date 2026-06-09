import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfigToggle } from "./_components/config-toggle";

export const metadata = { title: "Configuración · Admin" };

interface ConfigRow { key: string; value: unknown }

export default async function ConfigPage() {
  const supabase = adminClient();
  const { data } = await supabase
    .from("admin_config")
    .select("key, value");

  const map = new Map(
    ((data ?? []) as ConfigRow[]).map((r) => [r.key, Boolean(r.value)]),
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Toggles que cambian la mecánica de la quiniela.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Cuadro desde el inicio</CardTitle>
          <CardDescription>
            Si está activo, los jugadores llenan su cuadro completo desde antes
            del Mundial (basado en sus pronósticos de grupos + 8 terceros). Si esos
            picks tempranos efectivamente llegan a cada ronda, ganan puntos bonus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigToggle
            keyName="early_bracket_enabled"
            label="Activar cuadro desde el inicio"
            enabled={map.get("early_bracket_enabled") ?? false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previsualización de pronósticos públicos (admins)</CardTitle>
          <CardDescription>
            Si está activa, los administradores pueden ver los pronósticos en
            /pronosticos-publicos aun cuando el Cierre de cada fase no haya
            pasado. Útil para validar la vista antes del cierre. Para jugadores
            normales sigue bloqueado hasta el Cierre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigToggle
            keyName="public_picks_admin_preview"
            label="Activar previsualización para admins"
            enabled={map.get("public_picks_admin_preview") ?? false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-ingesta de resultados</CardTitle>
          <CardDescription>
            Si está activa, un job automático trae los resultados de los partidos
            desde football-data.org cada 30 minutos durante el Mundial. Si está
            desactivada, los marcadores se meten manualmente en Resultados.
            Se activa hasta el milestone M6.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigToggle
            keyName="auto_ingest_enabled"
            label="Activar auto-ingesta"
            enabled={map.get("auto_ingest_enabled") ?? false}
            disabled
          />
          <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
            Pendiente: configurar API key de football-data.org y Vercel Cron.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
