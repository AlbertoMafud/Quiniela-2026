import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-[var(--color-primary)]/10 inline-flex items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-2 text-balance">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-[var(--color-text-subtle)]">
            Esta sección estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
