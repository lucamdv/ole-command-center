import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { POLICIES, WEEKLY_TREND, AUDIT_RULES } from "@/lib/mock/data";
import { formatBRL, formatCompact, formatInt } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · OLÉ COPILOT" },
      { name: "description", content: "Rankings, tendências, análise financeira e eficiência operacional." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const brokerRank = useMemo(() => {
    const map = new Map<string, { name: string; total: number; failed: number; premium: number }>();
    for (const p of POLICIES) {
      const cur = map.get(p.broker) ?? { name: p.broker, total: 0, failed: 0, premium: 0 };
      cur.total++;
      if (p.audit === "REPROVADA") cur.failed++;
      cur.premium += p.premium;
      map.set(p.broker, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.premium - a.premium);
  }, []);

  const productRank = useMemo(() => {
    const map = new Map<string, { name: string; total: number; premium: number }>();
    for (const p of POLICIES) {
      const cur = map.get(p.product) ?? { name: p.product, total: 0, premium: 0 };
      cur.total++;
      cur.premium += p.premium;
      map.set(p.product, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, []);

  const errorTrend = useMemo(() => {
    return AUDIT_RULES.slice(0, 5).map((rule) => ({
      name: rule,
      value: Math.round(Math.random() * 80 + 20),
    }));
  }, []);

  const PIE_COLORS = ["var(--primary)", "var(--info)", "var(--success)", "var(--warning)", "var(--destructive)"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Analytics</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Inteligência estratégica sobre carteira, distribuição e eficiência operacional.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly trend */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-5 shadow-elevated">
          <SectionHeader title="Tendência semanal" subtitle="Aprovações vs reprovações nas últimas 12 semanas" />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_TREND}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                />
                <Bar dataKey="approved" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="rejected" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-elevated">
          <SectionHeader title="Distribuição de riscos" subtitle="Por regra de auditoria" />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={errorTrend} dataKey="value" innerRadius={48} outerRadius={80} paddingAngle={3} stroke="none">
                  {errorTrend.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {errorTrend.map((e, i) => (
              <div key={e.name} className="flex items-center gap-2 text-[11.5px]">
                <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                <span className="text-muted-foreground truncate flex-1">{e.name}</span>
                <span className="font-mono text-foreground">{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Ranking title="Ranking de Corretores" subtitle="Por volume de prêmio" data={brokerRank} valueKey="premium" format={(v) => formatBRL(v)} errorKey="failed" totalKey="total" />
        <Ranking title="Ranking de Produtos" subtitle="Por quantidade de apólices" data={productRank} valueKey="total" format={(v) => formatInt(v)} secondaryKey="premium" secondaryFormat={(v) => `R$ ${formatCompact(v)}`} />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-elevated">
        <SectionHeader title="Volume financeiro · 12 semanas" subtitle="Prêmio processado semanalmente" />
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={WEEKLY_TREND}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `R$ ${formatCompact(v)}`} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: any) => formatBRL(Number(v))}
              />
              <Line type="monotone" dataKey="premium" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="text-[11px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function Ranking<T extends Record<string, any>>({
  title,
  subtitle,
  data,
  valueKey,
  format,
  errorKey,
  totalKey,
  secondaryKey,
  secondaryFormat,
}: {
  title: string;
  subtitle: string;
  data: T[];
  valueKey: keyof T;
  format: (v: number) => string;
  errorKey?: keyof T;
  totalKey?: keyof T;
  secondaryKey?: keyof T;
  secondaryFormat?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey])));
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-elevated">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="space-y-2.5">
        {data.slice(0, 8).map((d, i) => {
          const v = Number(d[valueKey]);
          const ratio = (v / max) * 100;
          const errorRate = errorKey && totalKey ? (Number(d[errorKey]) / Number(d[totalKey])) * 100 : null;
          return (
            <div key={i} className="group">
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10.5px] text-muted-foreground w-5">#{i + 1}</span>
                  <span className="text-[12.5px] text-foreground truncate">{d.name}</span>
                  {errorRate !== null && errorRate > 30 && (
                    <span className="text-[10px] font-mono text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                      {errorRate.toFixed(0)}% falhas
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-mono text-[12px] text-foreground">{format(v)}</span>
                  {secondaryKey && secondaryFormat && (
                    <span className="ml-2 font-mono text-[10.5px] text-muted-foreground">
                      {secondaryFormat(Number(d[secondaryKey]))}
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1 rounded-full bg-background overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-info group-hover:from-primary group-hover:to-primary-glow transition-all"
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
