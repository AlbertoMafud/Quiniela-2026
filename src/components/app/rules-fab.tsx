"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface RulesFabProps {
  children: React.ReactNode; // RulesContent renderizado en el server, se pasa como children
}

/**
 * Botón flotante (FAB) "Reglas" siempre visible en la esquina inferior-derecha.
 * Al hacer click abre un Sheet con las reglas completas, sin salir de la pestaña actual.
 */
export function RulesFab({ children }: RulesFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver reglas"
        className={cn(
          "fixed z-30 right-4 sm:right-6",
          // En mobile: arriba del bottom-nav (que toma ~64px + safe area). En desktop: bottom directo.
          "bottom-20 md:bottom-6",
          "h-12 sm:h-14 px-4 sm:px-5 rounded-full",
          "inline-flex items-center gap-2",
          "bg-[var(--color-primary)] text-[var(--color-primary-fg)]",
          "shadow-[var(--shadow-lg)]",
          "hover:bg-[var(--color-primary-hover)] hover:-translate-y-0.5",
          "active:scale-95 transition-all duration-200",
          "font-medium text-sm sm:text-base",
        )}
      >
        <BookOpen className="h-5 w-5" />
        <span className="hidden xs:inline">Reglas</span>
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Reglas de la quiniela"
        description="Cómo se ganan los puntos. El admin puede ajustar los valores."
        side="right"
      >
        {children}
      </Sheet>
    </>
  );
}
