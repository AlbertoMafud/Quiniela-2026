"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolResult } from "../_actions";

interface ToolButtonProps {
  action: () => Promise<ToolResult>;
  label: string;
  description?: string;
  variant?: "default" | "outline" | "destructive";
  confirm?: boolean;
}

export function ToolButton({
  action,
  label,
  description,
  variant = "default",
  confirm = false,
}: ToolButtonProps) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);

  function execute() {
    setConfirming(false);
    setResult(null);
    startTransition(async () => {
      const res = await action();
      setResult(res);
    });
  }

  return (
    <div className="border-l-2 border-[var(--color-border)] pl-4 py-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-[var(--color-text)]">{label}</p>
          {description && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {description}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {confirm && !confirming ? (
            <Button
              type="button"
              size="sm"
              variant={variant}
              onClick={() => setConfirming(true)}
              disabled={pending}
            >
              {label.split(" ")[0]}
            </Button>
          ) : confirming ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={execute}
                disabled={pending}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, confirmar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant={variant}
              onClick={execute}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Ejecutar"
              )}
            </Button>
          )}
        </div>
      </div>
      {result && (
        <div
          className={
            result.ok
              ? "mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--color-success)]"
              : "mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--color-danger)]"
          }
        >
          {result.ok ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {result.message ?? result.error}
        </div>
      )}
    </div>
  );
}
