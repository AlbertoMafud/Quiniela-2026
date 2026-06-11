import { isRegistrationOpen } from "@/lib/gates-server";
import { LoginClient } from "./_components/login-client";

export default async function LoginPage() {
  const registrationOpen = await isRegistrationOpen();
  return <LoginClient registrationOpen={registrationOpen} />;
}
