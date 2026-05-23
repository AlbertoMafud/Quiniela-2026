import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl">
        <div className="w-full mx-auto max-w-[var(--container-app)] flex items-center justify-between px-4 sm:px-6 h-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Link>
          <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
            Panel admin
          </span>
          <span className="text-xs text-[var(--color-text-muted)]">
            {admin.name}
          </span>
        </div>
      </header>

      <AdminNav />

      <main className="flex-1 w-full mx-auto max-w-[var(--container-app)] px-4 sm:px-6 pt-4 sm:pt-6 pb-12">
        {children}
      </main>
    </div>
  );
}
