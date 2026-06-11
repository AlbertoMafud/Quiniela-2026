import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import {
  normalizeOverride,
  resolveStageGate,
  resolveRegistration,
  type StageOverride,
} from "@/lib/gates";

interface ConfigRow {
  key: string;
  value: unknown;
}

async function readConfig(keys: string[]): Promise<Map<string, unknown>> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("admin_config")
    .select("key, value")
    .in("key", keys);
  return new Map(((data ?? []) as ConfigRow[]).map((r) => [r.key, r.value]));
}

function asStartString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Override manual de una etapa de pronóstico (desde admin_config.stage_overrides). */
export async function getStageOverride(stageKey: string): Promise<StageOverride> {
  const cfg = await readConfig(["stage_overrides"]);
  const raw = cfg.get("stage_overrides");
  const map = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return normalizeOverride(map[stageKey]);
}

/** Fecha de inicio del torneo (ISO) o null si no está configurada. */
export async function getTournamentStart(): Promise<string | null> {
  const cfg = await readConfig(["tournament_start_at"]);
  return asStartString(cfg.get("tournament_start_at"));
}

/** Editabilidad de una etapa: combina override + deadline de esa etapa. */
export async function checkStageEditable(
  stageKey: string,
): Promise<{ editable: boolean; reason?: string; override: StageOverride }> {
  const supabase = adminClient();
  const [{ data: deadline }, override] = await Promise.all([
    supabase
      .from("deadlines")
      .select("deadline_at")
      .eq("stage", stageKey)
      .maybeSingle<{ deadline_at: string }>(),
    getStageOverride(stageKey),
  ]);
  const res = resolveStageGate(override, deadline?.deadline_at ?? null, new Date());
  return { ...res, override };
}

/** ¿Registro abierto ahora? Combina registration_override + tournament_start_at. */
export async function isRegistrationOpen(now: Date = new Date()): Promise<boolean> {
  const cfg = await readConfig(["registration_override", "tournament_start_at"]);
  const override = normalizeOverride(cfg.get("registration_override"));
  const startAt = asStartString(cfg.get("tournament_start_at"));
  return resolveRegistration(override, startAt, now).open;
}
