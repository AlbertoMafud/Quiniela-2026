"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";

const STORAGE_KEY = "qf_theme";

function applyTheme(mode: Mode) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (mode === "light") root.classList.add("light");
  if (mode === "dark") root.classList.add("dark");
  // 'system' deja que el media query lo decida.
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (typeof window !== "undefined" &&
      (localStorage.getItem(STORAGE_KEY) as Mode | null)) || "system";
    setMode(saved);
    applyTheme(saved);
  }, []);

  function change(next: Mode) {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  if (!mounted) return null;

  const options: Array<{ value: Mode; icon: typeof Sun; label: string }> = [
    { value: "light", icon: Sun, label: "Claro" },
    { value: "system", icon: Monitor, label: "Sistema" },
    { value: "dark", icon: Moon, label: "Oscuro" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="inline-flex items-center p-0.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)]"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => change(value)}
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center transition-all",
              active
                ? "bg-[var(--color-surface)] shadow-[var(--shadow-sm)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
