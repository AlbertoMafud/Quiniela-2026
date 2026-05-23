"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Sparkles, Trophy, Goal } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: typeof Target;
}

interface SubNavProps {
  earlyEnabled: boolean;
}

export function PronosticosSubNav({ earlyEnabled }: SubNavProps) {
  const pathname = usePathname();

  const links: NavLink[] = [
    { href: "/pronosticos/grupos", label: "Grupos", icon: Target },
    { href: "/pronosticos/terceros", label: "Mejores terceros", icon: Sparkles },
  ];
  if (earlyEnabled) {
    links.push({
      href: "/pronosticos/bracket-inicio",
      label: "Bracket desde inicio",
      icon: Trophy,
    });
  }
  links.push({
    href: "/pronosticos/eliminatorias/r32",
    label: "Eliminatorias",
    icon: Goal,
  });

  return (
    <nav className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 sm:-mx-0 px-4 sm:px-0">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === pathname ||
          (href.startsWith("/pronosticos/eliminatorias") &&
            pathname.startsWith("/pronosticos/eliminatorias"));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "shrink-0 h-10 px-4 rounded-full text-sm font-medium",
              "inline-flex items-center gap-2 transition-all",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-sm)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
