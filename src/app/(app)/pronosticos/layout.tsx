import { PronosticosSubNav } from "./_components/sub-nav";

export default function PronosticosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <PronosticosSubNav />
      {children}
    </div>
  );
}
