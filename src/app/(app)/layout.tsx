import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { BottomNav, TopNav } from "@/components/app/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = adminClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, name, is_admin")
    .eq("id", session.playerId)
    .maybeSingle<{ id: string; name: string; is_admin: boolean }>();

  if (!player) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <TopNav playerName={player.name} isAdmin={player.is_admin} />
      <main className="flex-1 w-full mx-auto max-w-[var(--container-app)] px-4 sm:px-6 pt-4 sm:pt-6 pb-24 md:pb-8">
        {children}
      </main>
      <BottomNav isAdmin={player.is_admin} />
      <noscript>
        <div className="fixed bottom-0 inset-x-0 bg-[var(--color-warning)] text-black text-sm p-2 text-center">
          Esta app necesita JavaScript activado para funcionar.{" "}
          <Link href="/" className="underline">Recargar</Link>
        </div>
      </noscript>
    </div>
  );
}
