import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartType = "line" | "bar" | "pie" | "area" | "scatter" | "auto";

export interface ChartSeries {
  key: string;
  label?: string;
  color?: string;
}

export interface ChartInput {
  type?: ChartType;
  title?: string;
  description?: string;
  xKey?: string;
  series?: ChartSeries[];
  data?: Array<Record<string, string | number | null>>;
}

const PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Fallback for oklch tokens — use CSS variable directly
const cssVar = (i: number) => `var(--chart-${(i % 5) + 1})`;

function pickType(input: ChartInput): Exclude<ChartType, "auto"> {
  if (input.type && input.type !== "auto") return input.type;
  const data = input.data ?? [];
  const series = input.series ?? [];
  if (series.length === 1 && data.length <= 8) {
    // single small series → pie
    const allCategorical = data.every((d) => typeof d[input.xKey ?? "name"] === "string");
    if (allCategorical) return "pie";
  }
  if (input.xKey && data[0] && /^\d{4}-\d{2}/.test(String(data[0][input.xKey] ?? ""))) {
    return "line";
  }
  return "bar";
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
} as const;

export function ChartPart({ input }: { input: ChartInput }) {
  const data = input.data ?? [];
  const xKey = input.xKey ?? "name";
  const series = (input.series ?? []).map((s, i) => ({
    ...s,
    color: s.color ?? cssVar(i),
    label: s.label ?? s.key,
  }));
  const type = pickType({ ...input, series });

  if (data.length === 0 || series.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        Gráfico sem dados.
      </div>
    );
  }

  return (
    <figure className="rounded-xl border border-border bg-card/50 p-4 my-2">
      {input.title && (
        <figcaption className="mb-3">
          <div className="text-sm font-semibold">{input.title}</div>
          {input.description && (
            <div className="text-xs text-muted-foreground mt-0.5">{input.description}</div>
          )}
        </figcaption>
      )}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          ) : type === "area" ? (
            <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.2}
                />
              ))}
            </AreaChart>
          ) : type === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : type === "pie" ? (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={data}
                dataKey={series[0].key}
                nameKey={xKey}
                outerRadius={90}
                innerRadius={40}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <ScatterChart margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                type="number"
              />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
              {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {series.map((s) => (
                <Scatter key={s.key} name={s.label} data={data} dataKey={s.key} fill={s.color} />
              ))}
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
