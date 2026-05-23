import { PronosticosSubNav } from "./_components/sub-nav";
import { adminClient } from "@/lib/supabase/admin";

export default async function PronosticosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = adminClient();
  const { data: cfg } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "early_bracket_enabled")
    .maybeSingle<{ value: unknown }>();

  const earlyEnabled = Boolean(cfg?.value);

  return (
    <div className="space-y-5">
      <PronosticosSubNav earlyEnabled={earlyEnabled} />
      {children}
    </div>
  );
}
