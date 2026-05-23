"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface DashboardItem {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function DashboardCards({ items }: { items: DashboardItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item, idx) => (
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
