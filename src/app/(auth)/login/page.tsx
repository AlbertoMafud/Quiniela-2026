import { isRegistrationOpen } from "@/lib/gates-server";
import { LoginClient } from "./_components/login-client";

// Lee el estado de registro en cada request: el cierre por fecha de inicio
// debe reflejarse sin esperar un rebuild ni una revalidación manual.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const registrationOpen = await isRegistrationOpen();
  return <LoginClient registrationOpen={registrationOpen} />;
}
