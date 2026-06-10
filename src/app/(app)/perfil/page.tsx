import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "./_components/profile-form";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = adminClient();
  const { data: player } = await supabase
    .from("players")
    .select("name")
    .eq("id", session.playerId)
    .maybeSingle<{ name: string }>();
  if (!player) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--color-text)]">
          Perfil
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Administra tu información.
        </p>
      </div>
      <ProfileForm currentName={player.name} />
    </div>
  );
}
