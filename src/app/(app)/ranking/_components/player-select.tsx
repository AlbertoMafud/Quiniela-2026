"use client";

import { useRouter } from "next/navigation";

export interface PlayerOption {
  id: string;
  name: string;
}

interface Props {
  players: PlayerOption[];
  selectedId: string;
}

export function PlayerSelect({ players, selectedId }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="player-select" className="text-[var(--color-text-muted)] whitespace-nowrap">
        Viendo a
      </label>
      <select
        id="player-select"
        value={selectedId}
        onChange={(e) => router.push(`/ranking?jugador=${e.target.value}`)}
        className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2"
      >
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
