"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PresenceRow {
  id: string;
  name: string;
  last_seen_at: string | null;
}

const REFRESH_MS = 15_000; // re-evalúa la vista cada 15 seg sin tocar el server

export function OnlinePlayersWidget({
  players,
}: {
  players: PresenceRow[];
}) {
  // El estado solo guarda "ahora" para re-renderizar y que el cálculo de
  // "hace cuánto" se actualice sin necesidad de refresh manual.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const sorted = players
    .map((p) => {
      const last = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0;
      const diffMin = (now - last) / 60_000;
      return { ...p, diffMin };
    })
    .sort((a, b) => a.diffMin - b.diffMin);

  const online = sorted.filter((p) => p.diffMin < 2);
  const recent = sorted.filter((p) => p.diffMin >= 2 && p.diffMin < 60);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--color-info)]" />
          Presencia en este momento
          {online.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-normal text-[var(--color-success)]">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
              {online.length} en línea
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-2">
            Aún nadie ha entrado a la app.
          </p>
        ) : (
          <>
            {online.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">
                  En línea ahora
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {online.map((p) => (
                    <Pill key={p.id} name={p.name} variant="online" />
                  ))}
                </ul>
              </div>
            )}
            {recent.length > 0 && (
              <div className={cn("space-y-1.5", online.length > 0 && "mt-4")}>
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">
                  Recién activos (última hora)
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {recent.map((p) => (
                    <Pill
                      key={p.id}
                      name={p.name}
                      variant="recent"
                      detail={`hace ${Math.round(p.diffMin)} min`}
                    />
                  ))}
                </ul>
              </div>
            )}
            {online.length === 0 && recent.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] py-2">
                Nadie está activo en este momento.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Pill({
  name,
  variant,
  detail,
}: {
  name: string;
  variant: "online" | "recent";
  detail?: string;
}) {
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm",
        variant === "online"
          ? "bg-[var(--color-success)]/12 text-[var(--color-success)] font-medium"
          : "bg-[var(--color-surface-2)] text-[var(--color-text)]",
      )}
    >
      {variant === "online" && (
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-success)] animate-pulse" />
      )}
      {name}
      {detail && (
        <span className="text-xs text-[var(--color-text-muted)] font-normal">
          · {detail}
        </span>
      )}
    </li>
  );
}
