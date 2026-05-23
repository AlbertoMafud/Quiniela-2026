import { RulesContent } from "@/components/app/rules-content";

export const metadata = { title: "Reglas" };

export default function ReglasPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Reglas
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          Cómo se ganan los puntos. El administrador puede ajustar los valores.
        </p>
      </header>

      <RulesContent />
    </div>
  );
}
