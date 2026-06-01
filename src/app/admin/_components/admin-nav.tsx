"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Sliders,
  Calendar,
  Users,
  BarChart2,
  Settings2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/resultados", label: "Resultados", icon: ListChecks },
  { href: "/admin/scoring", label: "Puntos", icon: Sliders },
  { href: "/admin/deadlines", label: "Cierres", icon: Calendar },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/progreso", label: "Progreso", icon: BarChart2 },
  { href: "/admin/config", label: "Config", icon: Settings2 },
  { href: "/admin/herramientas", label: "Herramientas", icon: Wrench },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="w-full bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <div className="w-full mx-auto max-w-[var(--container-app)] flex gap-1 overflow-x-auto px-2 sm:px-4 scrollbar-none">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "shrink-0 inline-flex items-center gap-2 h-11 px-3 text-sm font-medium",
                "border-b-2 transition-all",
                active
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
