import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Brain,
  Lightbulb,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { WEEKLY_TREND } from "@/lib/mock/data";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/intelligence")({
  head: () => ({
    meta: [
      { title: "OLÉ Intelligence · OLÉ COPILOT" },
      { name: "description", content: "Analista operacional digital com IA — diagnóstico, causa raiz e recomendações." },
    ],
  }),
  component: IntelligencePage,
});

const SUGGESTIONS = [
  "Quais foram os principais problemas deste mês?",
  "Quais corretores geraram mais falhas?",
  "Qual o maior risco operacional atual?",
  "Quais produtos apresentam maior incidência de reprovação?",
];

function IntelligencePage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = (q: string) => {
    setLoading(true);
    setSubmitted(null);
    setTimeout(() => {
      setSubmitted(q);
      setLoading(false);
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl border border-border bg-gradient-surface p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-60 pointer-events-none" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 grid place-items-center">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-primary">OLÉ INTELLIGENCE</div>
              <div className="text-[10.5px] text-muted-foreground">Analista operacional digital</div>
            </div>
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">
            Pergunte. <span className="text-muted-foreground">A operação inteira responde.</span>
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-2">
            A IA observa apólices, endossos, auditorias e alertas em tempo real para diagnosticar causas-raiz e
            recomendar ações.
          </p>

          {/* Input */}
          <div className="mt-6 rounded-xl border border-border bg-surface focus-within:border-primary/60 focus-within:shadow-glow transition">
            <div className="flex items-center gap-2 p-2">
              <Brain className="h-4 w-4 text-primary ml-2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && query.trim() && ask(query)}
                placeholder="Pergunte algo à operação… (ex.: qual o risco operacional desta semana?)"
                className="flex-1 bg-transparent outline-none text-[13.5px] py-2 placeholder:text-muted-foreground/70"
              />
              <button
                onClick={() => query.trim() && ask(query)}
                disabled={!query.trim() || loading}
                className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 hover:opacity-95"
              >
                <Send className="h-3 w-3" />
                Analisar
              </button>
            </div>
          </div>

          {/* Suggestions */}
          {!submitted && !loading && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    ask(s);
                  }}
                  className="text-[11.5px] px-2.5 py-1.5 rounded-md border border-border bg-surface/60 hover:border-primary/40 hover:bg-surface text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
                >
                  {s}
                  <ArrowRight className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <div className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            Analisando 12.847 execuções, 84 apólices e 46 alertas ativos…
          </div>
        </div>
      )}

      {submitted && !loading && <Response question={submitted} />}
    </div>
  );
}

function Response({ question }: { question: string }) {
  const sections = [
    {
      icon: Target,
      title: "Resumo Executivo",
      body:
        "A operação apresenta um nível de conformidade de 86%, com tendência estável nas últimas 4 semanas. O principal vetor de risco é a regra de Gap de Vigência, concentrada em renovações do produto Vida em Grupo.",
    },
    {
      icon: AlertCircle,
      title: "Causa Raiz",
      body:
        "78% das reprovações partem de 3 corretores (Vértice, Capital, Atlas). Em 64% dos casos, a falha ocorre na transição entre apólice anterior e renovação, indicando inconsistência no processo de continuidade.",
    },
    {
      icon: Wallet,
      title: "Impacto Financeiro",
      body: "Exposição não conforme estimada em R$ 4.8M no ciclo atual. Potencial perda regulatória de até R$ 380K se não tratada em 14 dias.",
    },
    {
      icon: TrendingUp,
      title: "Tendências",
      body: "Aumento de 12% em endossos de alteração de prêmio nos últimos 30 dias. Queda de 6% em duplicidades — resultado positivo das regras automáticas implementadas em S6.",
    },
    {
      icon: Lightbulb,
      title: "Insights",
      body: "Renovações com gap maior que 15 dias têm 4.2x mais chance de gerar inconformidade. Corretores com volume acima de 80 apólices/mês concentram 67% dos alertas críticos.",
    },
    {
      icon: BarChart3,
      title: "Recomendações",
      body:
        "1) Acionar revisão manual das 12 apólices com gap > 15 dias. 2) Reforçar processo de renovação com Vértice e Capital. 3) Adicionar regra de auditoria preventiva no T-7 da expiração.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4">
        <div className="text-[10.5px] uppercase tracking-wider text-primary mb-1">Pergunta analisada</div>
        <div className="text-[14px] text-foreground font-medium">"{question}"</div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-border bg-surface p-5 hover:border-primary/30 transition"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-md bg-primary/15 grid place-items-center">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="text-[13px] font-semibold">{s.title}</div>
              </div>
              <div className="text-[12.5px] text-muted-foreground leading-relaxed">{s.body}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-semibold">Evolução do risco — última carteira analisada</div>
            <div className="text-[11px] text-muted-foreground">Reprovações por semana</div>
          </div>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={WEEKLY_TREND}>
              <defs>
                <linearGradient id="ai-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, n) => (n === "premium" ? formatBRL(v) : v)}
              />
              <Area type="monotone" dataKey="rejected" stroke="var(--primary)" strokeWidth={2} fill="url(#ai-area)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
