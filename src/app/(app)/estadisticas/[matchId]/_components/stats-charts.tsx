"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface OutcomePieProps {
  homeLabel: string;
  awayLabel: string;
  homeWin: number;
  draw: number;
  awayWin: number;
}

const COLORS = {
  home: "var(--color-primary)",
  draw: "var(--color-text-subtle)",
  away: "var(--color-warning)",
};

export function OutcomePie({
  homeLabel,
  awayLabel,
  homeWin,
  draw,
  awayWin,
}: OutcomePieProps) {
  const data = [
    { name: `Gana ${homeLabel}`, value: homeWin, color: COLORS.home },
    { name: "Empate", value: draw, color: COLORS.draw },
    { name: `Gana ${awayLabel}`, value: awayWin, color: COLORS.away },
  ];
  const total = homeWin + draw + awayWin;

  return (
    <div>
      <div className="h-44">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => {
                const n = typeof v === "number" ? v : Number(v) || 0;
                return [`${n} (${total > 0 ? Math.round((n / total) * 100) : 0}%)`, ""];
              }}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
        {data.map((d, i) => (
          <li key={i}>
            <span
              className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
              style={{ background: d.color }}
            />
            <span className="text-[var(--color-text-muted)]">{d.name}</span>
            <p className="font-semibold tabular-nums mt-0.5">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ScoresBarProps {
  data: Array<{ score: string; count: number }>;
  total: number;
}

export function ScoresBar({ data, total }: ScoresBarProps) {
  const enriched = data.map((d) => ({
    ...d,
    pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
  }));
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={enriched} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <XAxis dataKey="score" stroke="var(--color-text-muted)" fontSize={12} />
          <YAxis stroke="var(--color-text-muted)" fontSize={12} allowDecimals={false} />
          <Tooltip
            formatter={(v) => {
              const n = typeof v === "number" ? v : Number(v) || 0;
              return [`${n} (${total > 0 ? Math.round((n / total) * 100) : 0}%)`, "Votos"];
            }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
