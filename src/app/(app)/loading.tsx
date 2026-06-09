// Skeleton mientras cargan las páginas autenticadas (A-4). Evita pantalla
// congelada en celulares lentos durante la navegación.
export default function Loading() {
  return (
    <div
      className="space-y-5 animate-pulse"
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="h-9 w-48 rounded-md bg-[var(--color-surface-2)]" />
      <div className="h-32 rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]" />
      <div className="h-32 rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]" />
      <div className="h-32 rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]" />
    </div>
  );
}
