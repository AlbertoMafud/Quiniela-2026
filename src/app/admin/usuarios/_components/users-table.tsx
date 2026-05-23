"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Shield, ShieldOff, KeyRound, Trash2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  resetPlayerPin,
  togglePlayerAdmin,
  deletePlayer,
  type UserActionState,
} from "../_actions";
import { cn, formatDateMx } from "@/lib/utils";

interface PlayerItem {
  id: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  predictions_count: number;
  last_seen_at: string | null;
}

function presence(lastSeenAt: string | null): {
  label: string;
  online: boolean;
  recent: boolean;
} {
  if (!lastSeenAt) return { label: "Nunca", online: false, recent: false };
  const last = new Date(lastSeenAt).getTime();
  const now = Date.now();
  const diffMin = (now - last) / 60_000;
  if (diffMin < 2) return { label: "En línea", online: true, recent: false };
  if (diffMin < 60)
    return {
      label: `Hace ${Math.round(diffMin)} min`,
      online: false,
      recent: true,
    };
  if (diffMin < 60 * 24)
    return {
      label: `Hace ${Math.round(diffMin / 60)} h`,
      online: false,
      recent: false,
    };
  return {
    label: `Hace ${Math.round(diffMin / 60 / 24)} d`,
    online: false,
    recent: false,
  };
}

export function UsersTable({ players }: { players: PlayerItem[] }) {
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {players.map((p) => (
        <li key={p.id} className="py-3 first:pt-0 last:pb-0">
          <PlayerRow player={p} />
        </li>
      ))}
    </ul>
  );
}

function PlayerRow({ player }: { player: PlayerItem }) {
  const [expanded, setExpanded] = useState(false);
  const pres = presence(player.last_seen_at);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-3 min-w-0 text-left"
        >
          <div className="relative shrink-0">
            <div
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm",
                player.is_admin
                  ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
              )}
            >
              {player.name.charAt(0).toUpperCase()}
            </div>
            {pres.online && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-surface)] animate-pulse"
                aria-label="En línea"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--color-text)] truncate flex items-center gap-1.5 flex-wrap">
              {player.name}
              {player.is_admin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-xs text-[var(--color-primary)]">
                  <Shield className="h-3 w-3" /> admin
                </span>
              )}
              {pres.online && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-success)]/15 text-[10px] text-[var(--color-success)] font-semibold">
                  En línea
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              <span className={pres.recent ? "text-[var(--color-warning)]" : ""}>
                {pres.label}
              </span>
              {" · "}
              {player.predictions_count} pronósticos · creado {formatDateMx(player.created_at)}
            </p>
          </div>
          <span className="text-xs text-[var(--color-text-subtle)]">
            {expanded ? "Ocultar" : "Acciones"}
          </span>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 pl-13">
          <ResetPinForm playerId={player.id} />
          <ToggleAdminForm playerId={player.id} isAdmin={player.is_admin} />
          <DeletePlayerForm playerId={player.id} playerName={player.name} />
        </div>
      )}
    </div>
  );
}

function ResetPinForm({ playerId }: { playerId: string }) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    resetPlayerPin,
    {},
  );
  const [pin, setPin] = useState("");

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="player_id" value={playerId} />
      <KeyRound className="h-4 w-4 text-[var(--color-text-muted)]" />
      <Input
        name="new_pin"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="Nuevo PIN (4 dígitos)"
        inputMode="numeric"
        maxLength={4}
        className="flex-1 sm:max-w-48 tabular-nums"
        required
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending || pin.length !== 4}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resetear"}
      </Button>
      {state.ok && state.newPin && (
        <span className="text-xs text-[var(--color-success)] tabular-nums">
          ✓ Nuevo PIN: {state.newPin}
        </span>
      )}
      {state.error && <span className="text-xs text-[var(--color-danger)]">{state.error}</span>}
    </form>
  );
}

function ToggleAdminForm({ playerId, isAdmin }: { playerId: string; isAdmin: boolean }) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    togglePlayerAdmin,
    {},
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="player_id" value={playerId} />
      <input type="hidden" name="is_admin" value={(!isAdmin).toString()} />
      {isAdmin ? (
        <ShieldOff className="h-4 w-4 text-[var(--color-text-muted)]" />
      ) : (
        <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
      )}
      <span className="text-sm text-[var(--color-text)] flex-1">
        {isAdmin ? "Quitar privilegios de admin" : "Hacer admin"}
      </span>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isAdmin ? "Quitar" : "Promover"}
      </Button>
      {state.ok && <Check className="h-4 w-4 text-[var(--color-success)]" />}
      {state.error && <span className="text-xs text-[var(--color-danger)]">{state.error}</span>}
    </form>
  );
}

function DeletePlayerForm({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    deletePlayer,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex items-center gap-2 text-sm text-[var(--color-danger)] hover:underline"
      >
        <Trash2 className="h-4 w-4" /> Borrar jugador y sus pronósticos
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="player_id" value={playerId} />
      <span className="text-sm text-[var(--color-danger)] flex-1">
        ¿Seguro de borrar a {playerName}?
      </span>
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, borrar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
      {state.error && <span className="text-xs text-[var(--color-danger)]">{state.error}</span>}
    </form>
  );
}
