import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-[var(--color-bg)]">
      <p className="font-[family-name:var(--font-display)] text-[clamp(4rem,12vw,8rem)] font-semibold leading-none text-[var(--color-text)]">
        404
      </p>
      <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">
        Esta página no existe
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-sm">
        Puede que el link esté roto o que la página haya sido movida.
      </p>
      <Link href="/" className="mt-8">
        <Button>Volver al inicio</Button>
      </Link>
    </div>
  );
}
