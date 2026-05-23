export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[var(--color-bg)]">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight text-[var(--color-text)]">
            Quiniela Familia
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Mundial 2026 · Solo para la familia
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}
