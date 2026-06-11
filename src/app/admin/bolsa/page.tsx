import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEFAULT_CUOTA, DEFAULT_SPLIT, type Split } from "@/lib/pot";
import { BolsaForm } from "./_components/bolsa-form";

export const metadata = { title: "Bolsa · Admin" };

interface ConfigRow {
  key: string;
  value: unknown;
}

export default async function BolsaPage() {
  const supabase = adminClient();
  const { data } = await supabase
    .from("admin_config")
    .select("key, value")
    .in("key", ["pot_cuota", "pot_split"]);
  const map = new Map(((data ?? []) as ConfigRow[]).map((r) => [r.key, r.value]));

  const cuotaRaw = map.get("pot_cuota");
  const cuota = typeof cuotaRaw === "number" ? cuotaRaw : DEFAULT_CUOTA;

  const splitRaw = map.get("pot_split");
  const split: Split =
    splitRaw && typeof splitRaw === "object"
      ? {
          first: Number((splitRaw as Record<string, unknown>).first ?? DEFAULT_SPLIT.first),
          second: Number((splitRaw as Record<string, unknown>).second ?? DEFAULT_SPLIT.second),
          third: Number((splitRaw as Record<string, unknown>).third ?? DEFAULT_SPLIT.third),
        }
      : DEFAULT_SPLIT;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.5vw,2rem)] font-semibold tracking-tight">
          Bolsa y premios
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Cuota por jugador y reparto a los 3 primeros lugares. Los jugadores ven la
          bolsa en su pantalla de inicio.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Configuración de la bolsa</CardTitle>
          <CardDescription>
            Los porcentajes deben sumar 100. Los cambios aplican de inmediato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BolsaForm cuota={cuota} split={split} />
        </CardContent>
      </Card>
    </div>
  );
}
