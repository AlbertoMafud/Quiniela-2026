import { Trophy, Medal, Award } from "lucide-react";
import { getSession } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Ranking",
};

interface ScoreRow {
  player_id: string;
  player_name: string;
  total_points: number;
}

const PODIUM_ICONS = [
  { Icon: Trophy, color: "var(--color-gold)" },
  { Icon: Medal, color: "var(--color-text-subtle)" },
  { Icon: Award, color: "#B87333" },
];

export default async function RankingPage() {
  const session = await getSession();
  if (!session) return null;

  const supabase = adminClient();

  const { data: rows } = await supabase
    .from("player_scores")
    .select("player_id, player_name, total_points")
    .order("total_points", { ascending: false });

  const scores = ((rows ?? []) as ScoreRow[]);
  const me = scores.find((r) => r.player_id === session.playerId);
  const myRank = me ? scores.findIndex((r) => r.player_id === me.player_id) + 1 : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight">
          Ranking
        </h1>
        <p className="mt-1 text-sm sm:text-base text-[var(--color-text-muted)]">
          {scores.length === 0
            ? "Aún no hay jugadores."
            : `${scores.length} jugador${scores.length === 1 ? "" : "es"} en la quiniela.`}
          {myRank && me && ` Tú vas en el lugar #${myRank} con ${me.total_points} pts.`}
        </p>
      </header>

      {scores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tabla general</CardTitle>
            <CardDescription>
              Puntos por aciertos en marcadores. Bonus de bracket y terceros se suman a partir de la fase de eliminatorias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1">
              {scores.map((r, idx) => {
                const podium = idx < 3 ? PODIUM_ICONS[idx] : null;
                const isMe = r.player_id === session.playerId;
                return (
                  <li
                    key={r.player_id}
                    className={cn(
                      "flex items-center justify-between gap-3 py-2.5 px-3 rounded-[var(--radius-md)]",
                      isMe && "bg-[var(--color-primary)]/8 ring-1 ring-[var(--color-primary)]/25",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="tabular-nums w-6 text-right text-sm font-medium text-[var(--color-text-muted)]">
                        {idx + 1}
                      </span>
                      {podium ? (
                        <podium.Icon
                          className="h-5 w-5 shrink-0"
                          style={{ color: podium.color }}
                        />
                      ) : (
                        <span className="h-5 w-5 shrink-0" />
                      )}
                      <span className={cn("truncate", isMe && "font-semibold")}>
                        {r.player_name}
                        {isMe && (
                          <span className="ml-2 text-xs text-[var(--color-primary)]">
                            (tú)
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="tabular-nums font-semibold text-[var(--color-text)]">
                      {r.total_points}
                      <span className="ml-1 text-xs font-normal text-[var(--color-text-muted)]">
                        pts
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
