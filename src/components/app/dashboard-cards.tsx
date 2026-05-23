"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Target, Trophy, BarChart3, BookOpen, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DashboardItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const ITEMS: DashboardItem[] = [
  {
    href: "/pronosticos/grupos",
    title: "Llenar pronósticos",
    description: "Marcadores de la fase de grupos.",
    icon: Target,
  },
  {
    href: "/ranking",
    title: "Ver ranking",
    description: "Cómo va la familia.",
    icon: BarChart3,
  },
  {
    href: "/bracket",
    title: "Cuadro",
    description: "Tu cuadro de eliminatorias.",
    icon: Trophy,
  },
  {
    href: "/reglas",
    title: "Reglas",
    description: "Puntos y mecánica.",
    icon: BookOpen,
  },
];

export function DashboardCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {ITEMS.map((item, idx) => (
        <motion.div
          key={item.href}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: idx * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Link href={item.href}>
            <Card className="p-4 sm:p-5 h-full transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 active:scale-[0.98]">
              <item.icon className="h-6 w-6 text-[var(--color-primary)]" />
              <h3 className="mt-3 font-semibold text-[var(--color-text)] text-sm sm:text-base">
                {item.title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)]">
                {item.description}
              </p>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
