"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MatchPredictionCard } from "@/components/app/match-prediction-card";
import { cn } from "@/lib/utils";

export interface MatchData {
  id: string;
  group_letter: string;
  kickoff_at: string;
  home: { code: string; name: string; flag_emoji: string | null };
  away: { code: string; name: string; flag_emoji: string | null };
  prediction: { home_score: number; away_score: number } | null;
}

interface PredictionsFormProps {
  matchesByGroup: Record<string, MatchData[]>;
  locked: boolean;
  lockReason?: string;
}

export function PredictionsForm({
  matchesByGroup,
  locked,
  lockReason,
}: PredictionsFormProps) {
  const groups = Object.keys(matchesByGroup).sort();
  const [activeGroup, setActiveGroup] = useState(groups[0] ?? "A");

  const currentMatches = matchesByGroup[activeGroup] ?? [];

  return (
    <div className="space-y-4">
      <GroupTabs
        groups={groups}
        active={activeGroup}
        onChange={setActiveGroup}
        countByGroup={Object.fromEntries(
          groups.map((g) => [
            g,
            matchesByGroup[g].filter((m) => m.prediction).length,
          ]),
        )}
        totalByGroup={Object.fromEntries(
          groups.map((g) => [g, matchesByGroup[g].length]),
        )}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeGroup}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-3"
        >
          {currentMatches.map((m) => (
            <MatchPredictionCard
              key={m.id}
              matchId={m.id}
              kickoffAt={m.kickoff_at}
              home={m.home}
              away={m.away}
              initialHome={m.prediction?.home_score ?? null}
              initialAway={m.prediction?.away_score ?? null}
              locked={locked}
              lockReason={lockReason}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function GroupTabs({
  groups,
  active,
  onChange,
  countByGroup,
  totalByGroup,
}: {
  groups: string[];
  active: string;
  onChange: (g: string) => void;
  countByGroup: Record<string, number>;
  totalByGroup: Record<string, number>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function checkBounds() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }

  useEffect(() => {
    checkBounds();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkBounds, { passive: true });
    window.addEventListener("resize", checkBounds);
    return () => {
      el.removeEventListener("scroll", checkBounds);
      window.removeEventListener("resize", checkBounds);
    };
  }, []);

  // Auto-scroll para que el tab activo siempre quede visible
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLElement>(`[data-group="${active}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [active]);

  function scrollByOffset(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className="sticky top-0 md:top-16 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-[var(--color-bg)]/95 backdrop-blur-xl">
      <div className="relative">
        {/* Fade izquierda */}
        <div
          className={cn(
            "pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 transition-opacity",
            "bg-gradient-to-r from-[var(--color-bg)] to-transparent",
            canLeft ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />
        {/* Fade derecha */}
        <div
          className={cn(
            "pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 transition-opacity",
            "bg-gradient-to-l from-[var(--color-bg)] to-transparent",
            canRight ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />

        {/* Botón flecha izquierda (solo desktop, no en touch) */}
        {canLeft && (
          <button
            type="button"
            onClick={() => scrollByOffset(-1)}
            aria-label="Anterior grupo"
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border-strong)] shadow-[var(--shadow-sm)] items-center justify-center hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            onClick={() => scrollByOffset(1)}
            aria-label="Siguiente grupo"
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border-strong)] shadow-[var(--shadow-sm)] items-center justify-center hover:bg-[var(--color-surface-2)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <div
          ref={scrollerRef}
          className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory md:px-10"
        >
          {groups.map((g) => {
            const isActive = g === active;
            const done = countByGroup[g] ?? 0;
            const total = totalByGroup[g] ?? 0;
            const complete = done === total;
            return (
              <button
                key={g}
                type="button"
                data-group={g}
                onClick={() => onChange(g)}
                aria-label={`Grupo ${g}, ${done} de ${total} pronósticos`}
                className={cn(
                  "snap-start shrink-0 h-11 px-3 sm:px-4 rounded-full text-sm font-medium",
                  "inline-flex items-center gap-1.5 sm:gap-2 transition-all",
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-sm)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]",
                )}
              >
                <span>
                  <span className="hidden sm:inline">Grupo </span>
                  {g}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center justify-center text-[10px] sm:text-xs h-4 sm:h-5 min-w-4 sm:min-w-5 px-1 sm:px-1.5 rounded-full tabular-nums",
                    isActive
                      ? "bg-white/20 text-[var(--color-primary-fg)]"
                      : complete
                        ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                        : "bg-[var(--color-bg)] text-[var(--color-text-subtle)]",
                  )}
                >
                  {done}/{total}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
