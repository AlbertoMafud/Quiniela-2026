"use client";

import { useEffect } from "react";
import { pingHeartbeat } from "@/app/_actions/heartbeat";

const PING_INTERVAL_MS = 60_000; // 1 minuto

/**
 * Componente invisible que envía un ping al servidor cada minuto para
 * actualizar last_seen_at del jugador actual. También dispara ping cuando
 * la pestaña recupera foco (regresa de background).
 */
export function HeartbeatPing() {
  useEffect(() => {
    // Ping inmediato al montar (cuando entras a la app)
    pingHeartbeat().catch(() => {});

    const intervalId = setInterval(() => {
      pingHeartbeat().catch(() => {});
    }, PING_INTERVAL_MS);

    function onVisibility() {
      if (!document.hidden) pingHeartbeat().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
