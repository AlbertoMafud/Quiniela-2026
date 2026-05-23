"use client";

import { motion } from "framer-motion";

interface DashboardWelcomeProps {
  playerName: string;
  overallDone: number;
  overallTotal: number;
  overallPct: number;
}

export function DashboardWelcome({
  playerName,
  overallDone,
  overallTotal,
  overallPct,
}: DashboardWelcomeProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)] to-[oklch(0.42_0.14_165)] text-[var(--color-primary-fg)] p-5 sm:p-6"
    >
      <div className="relative z-10">
        <p className="text-xs sm:text-sm uppercase tracking-wider opacity-80 font-medium">
          Quiniela Familia · Mundial 2026
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-tight">
          Hola, {playerName}.
        </h1>
        <p className="mt-2 text-sm sm:text-base opacity-90 max-w-prose">
          Tu progreso global: <span className="font-bold tabular-nums">{overallDone}</span>{" "}
          de {overallTotal} pronósticos hechos ({overallPct}%).
        </p>
        <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden max-w-md">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="h-full bg-[var(--color-gold)]"
          />
        </div>
      </div>

      {/* Decoración: pelota estilizada con SVG */}
      <svg
        className="absolute -right-6 -top-6 sm:-right-4 sm:-top-4 opacity-15 pointer-events-none"
        width="180"
        height="180"
        viewBox="0 0 180 180"
        fill="none"
        aria-hidden
      >
        <circle cx="90" cy="90" r="80" stroke="white" strokeWidth="3" />
        <polygon
          points="90,40 130,70 115,120 65,120 50,70"
          fill="white"
          fillOpacity="0.2"
        />
        <line x1="90" y1="40" x2="90" y2="10" stroke="white" strokeWidth="2" />
        <line x1="130" y1="70" x2="160" y2="60" stroke="white" strokeWidth="2" />
        <line x1="50" y1="70" x2="20" y2="60" stroke="white" strokeWidth="2" />
        <line x1="115" y1="120" x2="135" y2="150" stroke="white" strokeWidth="2" />
        <line x1="65" y1="120" x2="45" y2="150" stroke="white" strokeWidth="2" />
      </svg>
    </motion.section>
  );
}
