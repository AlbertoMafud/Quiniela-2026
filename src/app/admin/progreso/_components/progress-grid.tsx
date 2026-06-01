import { cn } from "@/lib/utils";
import type {
  KnockoutRound,
  PlayerProgress,
  ProgressMeta,
  ROUND_LABELS,
} from "../page";

const LABELS: Record<KnockoutRound, string> = {
  r32: "16avos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semis",
  final: "Final",
};

function StatusPill({ count, total }: { count: number; total: number }) {
  if (total === 0) {
    return <span className="text-xs text-[var(--color-text-subtle)]">—</span>;
  }
  const complete = count === total;
  const empty = count === 0;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tabular-nums",
        complete
          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
          : empty
            ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
            : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
      )}
    >
      {count}/{total}
    </span>
  );
}

function OverallBadge({
  player,
  meta,
}: {
  player: PlayerProgress;
  meta: ProgressMeta;
}) {
  const groupOk =
    meta.total_group_matches > 0 &&
    player.group_preds === meta.total_group_matches;
  const thirdsOk = player.third_picks === 8;
  const earlyOk =
    !meta.early_bracket_enabled ||
    player.early_bracket_picks === meta.early_bracket_total;
  const knockoutOk = meta.knockout_rounds.every(
    (r) => (player.bracket_picks[r] ?? 0) === (meta.knockout_totals[r] ?? 0),
  );

  const allDone = groupOk && thirdsOk && earlyOk && knockoutOk;
  const noneDone =
    player.group_preds === 0 &&
    player.third_picks === 0 &&
    player.early_bracket_picks === 0 &&
    meta.knockout_rounds.every((r) => (player.bracket_picks[r] ?? 0) === 0);

  if (allDone) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-success)]/15 text-[var(--color-success)]">
        ✓ Completo
      </span>
    );
  }
  if (noneDone) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
        Sin empezar
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
      En progreso
    </span>
  );
}

const TH =
  "px-3 py-3 text-center font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wider whitespace-nowrap";
const TD = "px-3 py-3 text-center";

export function ProgressGrid({
  players,
  meta,
}: {
  players: PlayerProgress[];
  meta: ProgressMeta;
}) {
  const {
    total_group_matches,
    early_bracket_enabled,
    early_bracket_total,
    knockout_rounds,
    knockout_totals,
  } = meta;

  const colSpan =
    3 +
    (early_bracket_enabled ? 1 : 0) +
    knockout_rounds.length +
    1; // +1 for Estado

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--color-border)]">
          <th className="sticky left-0 z-10 bg-[var(--color-surface)] px-4 py-3 text-left font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wider whitespace-nowrap">
            Jugador
          </th>
          <th className={TH}>
            Grupos
            <br />
            <span className="font-normal normal-case text-[10px]">
              de {total_group_matches}
            </span>
          </th>
          <th className={TH}>
            Terceros
            <br />
            <span className="font-normal normal-case text-[10px]">de 8</span>
          </th>
          {early_bracket_enabled && (
            <th className={TH}>
              Cuadro ini.
              <br />
              <span className="font-normal normal-case text-[10px]">
                de {early_bracket_total}
              </span>
            </th>
          )}
          {knockout_rounds.map((r) => (
            <th key={r} className={TH}>
              {LABELS[r]}
              <br />
              <span className="font-normal normal-case text-[10px]">
                de {knockout_totals[r]}
              </span>
            </th>
          ))}
          <th className={TH}>Estado</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-border)]">
        {players.length === 0 ? (
          <tr>
            <td
              colSpan={colSpan}
              className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]"
            >
              Sin jugadores registrados.
            </td>
          </tr>
        ) : (
          players.map((p) => (
            <tr
              key={p.id}
              className="hover:bg-[var(--color-surface-2)]/40 transition-colors"
            >
              <td className="sticky left-0 z-10 bg-[var(--color-surface)] px-4 py-3 whitespace-nowrap">
                <span className="font-medium text-[var(--color-text)]">
                  {p.name}
                </span>
                {p.is_admin && (
                  <span className="ml-1.5 text-[10px] text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded">
                    admin
                  </span>
                )}
              </td>
              <td className={TD}>
                <StatusPill count={p.group_preds} total={total_group_matches} />
              </td>
              <td className={TD}>
                <StatusPill count={p.third_picks} total={8} />
              </td>
              {early_bracket_enabled && (
                <td className={TD}>
                  <StatusPill
                    count={p.early_bracket_picks}
                    total={early_bracket_total}
                  />
                </td>
              )}
              {knockout_rounds.map((r) => (
                <td key={r} className={TD}>
                  <StatusPill
                    count={p.bracket_picks[r] ?? 0}
                    total={knockout_totals[r] ?? 0}
                  />
                </td>
              ))}
              <td className={TD}>
                <OverallBadge player={p} meta={meta} />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
