"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  return (
    <div className="sticky top-0 md:top-16 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-[var(--color-bg)]/95 backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory">
        {groups.map((g) => {
          const isActive = g === active;
          const done = countByGroup[g] ?? 0;
          const total = totalByGroup[g] ?? 0;
          const complete = done === total;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onChange(g)}
              className={cn(
                "snap-start shrink-0 h-11 px-4 rounded-full text-sm font-medium",
                "inline-flex items-center gap-2 transition-all",
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-sm)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]",
              )}
            >
              <span>Grupo {g}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center text-xs h-5 min-w-5 px-1.5 rounded-full tabular-nums",
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
  );
}
