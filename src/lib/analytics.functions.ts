import { createServerFn } from "@tanstack/react-start";

export interface MonthBucket {
  month: string; // YYYY-MM
  label: string;
  count: number;
}

export interface RevenueBucket {
  month: string;
  label: string;
  usd: number;
  brl: number;
  policies: number;
}

export interface AnalyticsAggregates {
  findingsByVigencia: MonthBucket[];
  revenueByMonth: RevenueBucket[];
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
    .format(new Date(y, m - 1, 1))
    .replace(".", "");
}

function pickMonth(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // aceita "YYYY-MM-DD..." ou ISO completo
  const m = iso.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

export const getAnalyticsAggregates = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnalyticsAggregates> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) carrega apólices com proposta (precisamos da vigência e do prêmio em USD)
    const { data: policies, error: pErr } = await supabaseAdmin
      .from("policies")
      .select("numero_apolice, proposta");
    if (pErr) throw pErr;

    // mapa apolice -> mês de vigência inicial
    const apoliceMonth = new Map<string, string>();
    // acumulador de receita por mês
    const revMap = new Map<string, { usd: number; brl: number; policies: Set<string> }>();

    for (const p of policies ?? []) {
      // proposta pode ser objeto ou string
      const proposta =
        typeof p.proposta === "string"
          ? safeJson(p.proposta)
          : ((p.proposta ?? {}) as Record<string, unknown>);

      const datas = (proposta.datas ?? {}) as Record<string, unknown>;
      const inicio =
        typeof datas.inicio_vigencia === "string" ? datas.inicio_vigencia : null;
      const month = pickMonth(inicio);
      if (month) apoliceMonth.set(p.numero_apolice, month);

      // soma prêmio USD/BRL (tipo_premio=DIRETO, natureza_premio=PREMIO)
      let usd = 0;
      let brl = 0;
      const itens = Array.isArray(proposta.itens) ? proposta.itens : [];
      for (const it of itens as Array<Record<string, unknown>>) {
        const coberturas = Array.isArray(it.coberturas) ? it.coberturas : [];
        for (const cob of coberturas as Array<Record<string, unknown>>) {
          const comps = Array.isArray(cob.composicao_premio_cobertura)
            ? cob.composicao_premio_cobertura
            : [];
          for (const c of comps as Array<Record<string, unknown>>) {
            if (
              c.tipo_premio === "DIRETO" &&
              c.natureza_premio === "PREMIO"
            ) {
              const vUsd = Number(c.valor_premio) || 0;
              const vBrl = Number(c.valor_premio_brl) || 0;
              usd += vUsd;
              brl += vBrl;
            }
          }
        }
      }
      if (month && (usd > 0 || brl > 0)) {
        const cur = revMap.get(month) ?? { usd: 0, brl: 0, policies: new Set<string>() };
        cur.usd += usd;
        cur.brl += brl;
        cur.policies.add(p.numero_apolice);
        revMap.set(month, cur);
      }
    }

    // 2) carrega findings da última run de auditoria
    const { data: latestRun, error: rErr } = await supabaseAdmin
      .from("audit_runs")
      .select("id")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rErr) throw rErr;

    const findingMap = new Map<string, number>();
    if (latestRun?.id) {
      const { data: findings, error: fErr } = await supabaseAdmin
        .from("audit_findings")
        .select("apolice")
        .eq("run_id", latestRun.id);
      if (fErr) throw fErr;
      for (const f of findings ?? []) {
        const month = apoliceMonth.get(f.apolice);
        if (!month) continue;
        findingMap.set(month, (findingMap.get(month) ?? 0) + 1);
      }
    }

    const findingsByVigencia: MonthBucket[] = Array.from(findingMap.entries())
      .map(([month, count]) => ({ month, label: monthLabel(month), count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const revenueByMonth: RevenueBucket[] = Array.from(revMap.entries())
      .map(([month, v]) => ({
        month,
        label: monthLabel(month),
        usd: round2(v.usd),
        brl: round2(v.brl),
        policies: v.policies.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { findingsByVigencia, revenueByMonth };
  },
);

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
