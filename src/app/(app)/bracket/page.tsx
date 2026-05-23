import { ComingSoon } from "@/components/app/coming-soon";

export const metadata = { title: "Bracket" };

export default function BracketPage() {
  return (
    <ComingSoon
      title="Bracket de eliminatorias"
      description="Aquí llenarás los ganadores ronda por ronda. Disponible cuando termine la fase de grupos (a partir del 26 de junio)."
    />
  );
}
