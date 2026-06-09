"use client";

// Error boundary de las rutas autenticadas (A-4): si una query de Supabase
// truena, el usuario ve un mensaje en español y un botón para reintentar,
// no el overlay crudo de Next.
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--color-text)]">
        Algo salió mal
      </h2>
      <p className="max-w-sm text-sm text-[var(--color-text-muted)]">
        No pudimos cargar esta sección. Revisa tu conexión e intenta de nuevo.
      </p>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}
