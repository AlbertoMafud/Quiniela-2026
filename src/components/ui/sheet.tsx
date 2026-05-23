"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  side?: "right" | "bottom";
}

/**
 * Sheet/Drawer modal. Mobile: slide-up desde abajo. Desktop: slide desde la derecha.
 * Cierra con ESC, click en backdrop, o botón X.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
}: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "sheet-title" : undefined}
            initial={
              side === "right"
                ? { x: "100%" }
                : { y: "100%" }
            }
            animate={side === "right" ? { x: 0 } : { y: 0 }}
            exit={
              side === "right"
                ? { x: "100%" }
                : { y: "100%" }
            }
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed z-50 bg-[var(--color-bg)] shadow-[var(--shadow-lg)]",
              "flex flex-col",
              side === "right"
                ? "top-0 right-0 bottom-0 w-full sm:max-w-md md:max-w-lg"
                : "left-0 right-0 bottom-0 max-h-[90vh] rounded-t-[var(--radius-xl)]",
            )}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-xl">
              <div className="min-w-0 flex-1">
                {title && (
                  <h2
                    id="sheet-title"
                    className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-semibold text-[var(--color-text)]"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-0.5 text-xs sm:text-sm text-[var(--color-text-muted)]">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="shrink-0 h-9 w-9 rounded-full inline-flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 safe-area-pb">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
