"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Target,
  Trophy,
  BarChart3,
  Users,
  Settings,
  ChartLine,
  Menu,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/_actions";
import { ThemeToggle } from "./theme-toggle";
import { Sheet } from "@/components/ui/sheet";

interface NavProps {
  playerName?: string;
  isAdmin?: boolean;
}

const PRIMARY_LINKS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/pronosticos/grupos", label: "Pronósticos", icon: Target },
  { href: "/bracket", label: "Cuadro", icon: Trophy },
  { href: "/ranking", label: "Ranking", icon: BarChart3 },
] as const;

const SECONDARY_LINKS = [
  { href: "/estadisticas", label: "Estadísticas", icon: ChartLine },
  { href: "/pronosticos-publicos", label: "Públicos", icon: Users },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

export function TopNav({ playerName, isAdmin }: NavProps) {
  const pathname = usePathname();

  return (
    <header className="hidden md:flex sticky top-0 z-30 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl">
      <div className="w-full mx-auto max-w-[var(--container-app)] flex items-center justify-between px-6 h-16">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--color-text)]"
        >
          Quiniela Familia
        </Link>

        <nav className="flex items-center gap-1">
          {[...PRIMARY_LINKS, ...SECONDARY_LINKS].map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 h-9 inline-flex items-center rounded-[var(--radius-sm)] text-sm font-medium transition-colors",
                  active
                    ? "text-[var(--color-primary)] bg-[var(--color-surface-2)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <Settings className="h-4 w-4" />
              Admin
            </Link>
          )}
          <span className="text-sm text-[var(--color-text-muted)]">
            {playerName}
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ isAdmin }: NavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isMenuActive =
    SECONDARY_LINKS.some((l) => pathname.startsWith(l.href)) ||
    (isAdmin && pathname.startsWith("/admin"));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl safe-area-pb">
        <ul className="flex items-stretch h-16">
          {PRIMARY_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "h-full w-full flex flex-col items-center justify-center gap-1 transition-colors",
                    active
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text-muted)]",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[11px] font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Más opciones"
              className={cn(
                "h-full w-full flex flex-col items-center justify-center gap-1 transition-colors",
                isMenuActive
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[11px] font-medium">Más</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Menú"
        side="bottom"
      >
        <MoreMenu isAdmin={isAdmin} onNavigate={() => setMenuOpen(false)} />
      </Sheet>
    </>
  );
}

function MoreMenu({
  isAdmin,
  onNavigate,
}: {
  isAdmin?: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1.5 pb-4">
      {SECONDARY_LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-2)] active:bg-[var(--color-surface-2)] transition-colors"
        >
          <Icon className="h-5 w-5 text-[var(--color-text-muted)]" />
          <span className="text-base font-medium text-[var(--color-text)]">
            {label}
          </span>
        </Link>
      ))}
      {isAdmin && (
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-primary)]/8 hover:bg-[var(--color-primary)]/15 transition-colors"
        >
          <Settings className="h-5 w-5 text-[var(--color-primary)]" />
          <span className="text-base font-medium text-[var(--color-primary)]">
            Admin
          </span>
        </Link>
      )}

      <div className="pt-2 mt-2 border-t border-[var(--color-border)]">
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-base font-medium">Salir</span>
          </button>
        </form>
      </div>
    </div>
  );
}
