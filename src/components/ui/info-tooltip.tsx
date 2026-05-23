"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  title: string;
  description: string;
  size?: "sm" | "md";
}

/**
 * Botón redondo con ícono "i" que al hover/tap muestra un popover con
 * título + descripción. Funciona en mobile (tap) y desktop (hover).
 */
export function InfoTooltip({ title, description, size = "sm" }: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseEnter={() => {
          if (window.matchMedia("(hover: hover)").matches) setOpen(true);
        }}
        onMouseLeave={() => {
          if (window.matchMedia("(hover: hover)").matches) setOpen(false);
        }}
        aria-label={`Más info: ${title}`}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors",
          "text-[var(--color-text-subtle)] hover:text-[var(--color-primary)]",
          "focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2",
          size === "sm" ? "h-5 w-5" : "h-6 w-6",
        )}
      >
        <Info className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>

      {open && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-64 sm:w-72",
            "rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border-strong)]",
            "shadow-[var(--shadow-lg)] p-3 text-left",
            "animate-in fade-in-0 zoom-in-95 duration-150",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
