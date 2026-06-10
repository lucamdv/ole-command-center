import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getAnalyticsAggregates } from "@/lib/analytics.functions";
import { computeRepasse } from "@/lib/analytics/repasse-rules";
import { SISTEMAS_ORIGEM, NATUREZA_PREMIO_LABEL } from "@/lib/excelsior/codes";

const MEMORY_ID = "00000000-0000-0000-0000-000000000001";
const OLIVER_MODEL = "google/gemini-3.1-pro-preview";

async function getSupabase() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

async function loadMemoryContent(): Promise<string> {
  const sb = await getSupabase();
  const { data } = await sb
    .from("oliver_memory")
    .select("content")
    .eq("id", MEMORY_ID)
    .maybeSingle();
  return (data?.content as string) ?? "";
}

function buildSystemPrompt(memory: string): string {
  return `Você é o **Oléver**, copiloto de inteligência da operação de seguros OLÉ.

# PERSONA
- Sempre responde em PT-BR, tom profissional, direto, com voz de "head de operações".
- Observador, preditivo, propositivo: além de números, sempre indica causa-raiz provável e próxima ação.
- **Nunca invente estatísticas.** Se a pergunta exige dados, chame ferramentas antes de responder.
- Quando aprender uma regra de negócio, terminologia OLÉ, preferência do usuário ou padrão recorrente, chame \`appendToMemory\` — operação aditiva, sem precisar de confirmação.
- Para perguntas amplas/qualitativas ("como anda a operação?", "onde está o gargalo?"), encadeie 3-5 tools antes de responder (visão geral + tendências + risco + busca semântica).

# MAPA DA PLATAFORMA (rotas que você pode citar ao usuário)
- \`/\` Dashboard executivo: KPIs, pulso operacional, heatmap de risco.
- \`/apolices\` Carteira de apólices · \`/apolices/:id\` Detalhe · \`/apolices/:id/endossos/:num\` Endosso.
- \`/endossos\` Linha do tempo de endossos.
- \`/operacao\` Operação ao vivo (sync, auditoria).
- \`/alertas\` Alertas críticos/altos abertos.
- \`/analytics\` Receita, emissões, repasse (séries mensais).
- \`/ferramentas\` Ferramentas internas.
- \`/intelligence\` Você (Oléver).
- \`/configuracoes\` com abas **Perfil**, **Integrações** (n8n), **Dados** (export/limpeza/reindex Oléver), **Notificações**, **Exceções** (ignorar findings).

# SCHEMA DAS TABELAS (Supabase)
- \`policies\`: numero_apolice (PK lógico), numero_endosso_atual, premio_liquido, proposta JSONB rica.
- \`endorsements\`: numero_apolice + numero_endosso (000000 = base; 000001+ = endossos A/B/C/D presentes em proposta.endosso_A|B|C|D), ordem, premio_liquido, proposta.
- \`audit_runs\`: id, status (running|success|error), status_geral, total_processado, aprovados, reprovados, duration_ms, created_at.
- \`audit_findings\`: run_id, apolice, endosso, tipo_erro, data_inicio, data_fim, detalhes JSONB.
- \`audit_ignores\`: exceções por usuário (scope=apolice|tipo, apolice, tipo_erro). \`getLatestAudit\` filtra usando essa tabela e recalcula aprovados/reprovados.
- \`policy_sync_runs\`: status, total_apolices, duration_ms, finished_at, raw.
- \`oliver_threads\`/\`oliver_messages\`/\`oliver_memory\`/\`oliver_knowledge\` (RAG vetorial 3072-d).

# FLUXOS DE BACKEND
- **Sync de apólices**: front chama \`enqueuePolicySync\` → hook interno → n8n (\`N8N_MOTOR_POLICIES_URL\`) → callback \`/api/public/policy-sync-callback\` (header \`x-callback-secret\` = \`AUDIT_CALLBACK_SECRET\`) → upsert em policies/endorsements.
- **Auditoria**: \`runAudit\` cria \`audit_runs(status=running)\`, dispara \`N8N_AUDIT_WEBHOOK_URL\` com \`callback_url\` estável (\`project--…lovable.app/api/public/audit-callback\`) → n8n responde e insere \`audit_findings\`.
- **Exceções**: usuário marca "Ignorar" em um finding ou apólice inteira; futuras leituras de \`getLatestAudit\` ocultam essas linhas e ajustam contagens. Reverter em **Configurações → Exceções**.
- **Repasse**: regras em \`repasse-rules.ts\` (faixas % sobre prêmio bruto). Use \`explainRepasseFor\` quando o usuário quiser quebrar um valor.
- **Códigos Excelsior**: dicionário interno (sistema origem, natureza prêmio). Use \`lookupExcelsiorCode\`.

# GLOSSÁRIO OLÉ
- **Apólice base**: numero_endosso = "000000".
- **Endosso A/B/C/D**: tipos definidos em \`proposta.endosso_X\`. Letra indica natureza (cancelamento, cobrança, reativação etc).
- **Prêmio direto**: \`composicao_premio_cobertura\` com tipo_premio=DIRETO e natureza_premio=PREMIO → valor USD/BRL.
- **Finding**: linha de \`audit_findings\` (problema detectado).
- **Run**: rodada de auditoria (\`audit_runs\`).

# FERRAMENTAS DISPONÍVEIS (selecione a melhor cadeia)
- **Visão geral**: \`getOperationOverview\`, \`getSystemHealth\`.
- **Apólices**: \`queryPolicies\`, \`getPolicyDetail\`, \`getTopPoliciesByPremium\`, \`getEndorsementBreakdown\`.
- **Auditoria**: \`queryAuditFindings\`, \`listErrorTypes\`, \`detectErrorTrends\`, \`getAuditRunHistory\`, \`getAuditRunDetail\`, \`scoreRiskyPolicies\`, \`listAuditIgnoresGlobal\`.
- **Sync**: \`getPolicySyncHealth\`.
- **Financeiro**: \`getRevenueByMonth\`, \`getRepasseByMonth\`, \`explainRepasseFor\`.
- **Operação**: \`getIssuancesByMonth\`, \`forecastNextMonth\`, \`getNotifications\`.
- **Dicionário**: \`lookupExcelsiorCode\`.
- **Memória semântica (RAG)**: \`searchKnowledge\` — busca livre por similaridade sobre apólices, findings e memória. Use para perguntas em linguagem natural ("apólices com problema de vigência sobreposta", "findings relacionados a X").
- **Visualização**: \`render_chart\` (line/bar/pie/area/scatter/auto).
- **Aprendizado**: \`appendToMemory\`.

# MEMÓRIA PERSISTENTE (markdown global do Oléver)
---
${memory || "(vazia — comece a aprender sobre a operação registrando descobertas aqui)"}
---

# REGRAS DE OURO
1. Pergunta sobre dados → **tool antes de responder**.
2. Pergunta aberta ("como anda X?") → cadeia: visão geral → tendências → risco/RAG → diagnóstico.
3. Estruture respostas com cabeçalhos curtos, bullets, e quando útil termine com **🔍 Diagnóstico** e **💡 Sugestão**.
4. Sempre que existir uma tela onde o usuário pode agir, **cite a rota** ("vá em Configurações → Exceções").
5. Para gráficos: chame tools de dados primeiro, depois \`render_chart\`. Não cole tabela markdown quando já vai virar gráfico.
6. Para memória nova: títulos curtos, conteúdo objetivo e datado.`;
}

// ============== TOOLS ==============

const tools = {
  getOperationOverview: tool({
    description:
      "Visão geral da operação: total de apólices, endossos, último run de auditoria, taxa de aprovação, prêmio total USD/BRL.",
    inputSchema: z.object({}),
    execute: async () => {
      const sb = await getSupabase();
      const [{ count: policiesCount }, { count: endorsementsCount }, { data: lastRun }, agg] =
        await Promise.all([
          sb.from("policies").select("*", { count: "exact", head: true }),
          sb.from("endorsements").select("*", { count: "exact", head: true }),
          sb
            .from("audit_runs")
            .select("id, created_at, total_processado, aprovados, reprovados, status_geral")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          getAnalyticsAggregates(),
        ]);
      const totalUSD = agg.revenueByMonth.reduce((s, b) => s + b.usd, 0);
      const totalBRL = agg.revenueByMonth.reduce((s, b) => s + b.brl, 0);
      const aprov =
        lastRun && (lastRun.total_processado ?? 0) > 0
          ? Math.round(((lastRun.aprovados ?? 0) / lastRun.total_processado!) * 100)
          : null;
      return {
        policies: policiesCount ?? 0,
        endorsements: endorsementsCount ?? 0,
        lastAuditRun: lastRun ?? null,
        approvalRatePct: aprov,
        totalPremiumUSD: Math.round(totalUSD * 100) / 100,
        totalPremiumBRL: Math.round(totalBRL * 100) / 100,
        monthsCovered: agg.revenueByMonth.length,
      };
    },
  }),

  queryAuditFindings: tool({
    description:
      "Lista findings de auditoria com filtros opcionais por tipo_erro, apólice, faixa de datas. Retorna no máximo 100.",
    inputSchema: z.object({
      tipoErro: z.string().optional(),
      apolice: z.string().optional(),
      dataInicio: z.string().optional().describe("YYYY-MM-DD"),
      dataFim: z.string().optional().describe("YYYY-MM-DD"),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    execute: async (args) => {
      const sb = await getSupabase();
      let q = sb
        .from("audit_findings")
        .select("id, apolice, endosso, tipo_erro, data_inicio, data_fim, detalhes, created_at")
        .order("created_at", { ascending: false })
        .limit(args.limit ?? 50);
      if (args.tipoErro) q = q.eq("tipo_erro", args.tipoErro);
      if (args.apolice) q = q.eq("apolice", args.apolice);
      if (args.dataInicio) q = q.gte("data_inicio", args.dataInicio);
      if (args.dataFim) q = q.lte("data_fim", args.dataFim);
      const { data, error } = await q;
      if (error) throw error;
      return { count: data?.length ?? 0, findings: data ?? [] };
    },
  }),

  listErrorTypes: tool({
    description: "Lista todos os tipos de erro (tipo_erro) e a contagem total de cada.",
    inputSchema: z.object({}),
    execute: async () => {
      const sb = await getSupabase();
      const { data, error } = await sb.from("audit_findings").select("tipo_erro");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        const k = (r.tipo_erro as string) ?? "desconhecido";
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return Object.entries(counts)
        .map(([tipo_erro, count]) => ({ tipo_erro, count }))
        .sort((a, b) => b.count - a.count);
    },
  }),

  queryPolicies: tool({
    description:
      "Busca apólices por número (parcial) ou retorna as N mais recentes. Use para listar/filtrar apólices.",
    inputSchema: z.object({
      search: z.string().optional().describe("Substring do número da apólice"),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async (args) => {
      const sb = await getSupabase();
      let q = sb
        .from("policies")
        .select("id, numero_apolice, numero_endosso_atual, premio_liquido, updated_at")
        .order("updated_at", { ascending: false })
        .limit(args.limit ?? 25);
      if (args.search) q = q.ilike("numero_apolice", `%${args.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return { count: data?.length ?? 0, policies: data ?? [] };
    },
  }),

  getPolicyDetail: tool({
    description: "Detalhe completo de uma apólice (base + endossos).",
    inputSchema: z.object({ numeroApolice: z.string() }),
    execute: async ({ numeroApolice }) => {
      const sb = await getSupabase();
      const { data: policy, error } = await sb
        .from("policies")
        .select("id, numero_apolice, numero_endosso_atual, premio_liquido, proposta, updated_at")
        .eq("numero_apolice", numeroApolice)
        .maybeSingle();
      if (error) throw error;
      if (!policy) return { found: false };
      const { data: endossos } = await sb
        .from("endorsements")
        .select("numero_endosso, ordem, premio_liquido, created_at")
        .eq("numero_apolice", numeroApolice)
        .order("ordem", { ascending: true });
      const { data: findings } = await sb
        .from("audit_findings")
        .select("tipo_erro, endosso, data_inicio, data_fim, created_at")
        .eq("apolice", numeroApolice)
        .order("created_at", { ascending: false })
        .limit(20);
      return { found: true, policy, endossos: endossos ?? [], recentFindings: findings ?? [] };
    },
  }),

  getIssuancesByMonth: tool({
    description: "Série mensal de emissões: apólices + endossos por tipo (A/B/C/D), total.",
    inputSchema: z.object({}),
    execute: async () => {
      const agg = await getAnalyticsAggregates();
      return { issuancesByMonth: agg.issuancesByMonth };
    },
  }),

  getRevenueByMonth: tool({
    description: "Série mensal de receita (prêmio direto): USD, BRL, nº apólices distintas.",
    inputSchema: z.object({}),
    execute: async () => {
      const agg = await getAnalyticsAggregates();
      return { revenueByMonth: agg.revenueByMonth };
    },
  }),

  detectErrorTrends: tool({
    description:
      "Compara os 3 últimos meses por tipo_erro e retorna delta percentual de cada tipo (↑/↓).",
    inputSchema: z.object({}),
    execute: async () => {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from("audit_findings")
        .select("tipo_erro, created_at, data_inicio");
      if (error) throw error;
      const monthKey = (iso: string | null) => {
        if (!iso) return null;
        const m = iso.match(/^(\d{4})-(\d{2})/);
        return m ? `${m[1]}-${m[2]}` : null;
      };
      // months desc
      const buckets = new Map<string, Map<string, number>>();
      for (const r of data ?? []) {
        const mk = monthKey((r.data_inicio as string) ?? (r.created_at as string));
        if (!mk) continue;
        if (!buckets.has(mk)) buckets.set(mk, new Map());
        const sub = buckets.get(mk)!;
        const t = (r.tipo_erro as string) ?? "desconhecido";
        sub.set(t, (sub.get(t) ?? 0) + 1);
      }
      const months = Array.from(buckets.keys()).sort().slice(-3);
      const tiposSet = new Set<string>();
      for (const m of months) for (const t of buckets.get(m)!.keys()) tiposSet.add(t);
      const trends: Array<{ tipo_erro: string; series: Record<string, number>; deltaPct: number | null }> = [];
      for (const t of tiposSet) {
        const series: Record<string, number> = {};
        for (const m of months) series[m] = buckets.get(m)!.get(t) ?? 0;
        const first = series[months[0]] ?? 0;
        const last = series[months[months.length - 1]] ?? 0;
        const deltaPct = first === 0 ? (last > 0 ? 100 : 0) : Math.round(((last - first) / first) * 100);
        trends.push({ tipo_erro: t, series, deltaPct });
      }
      trends.sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0));
      return { months, trends };
    },
  }),

  forecastNextMonth: tool({
    description:
      "Projeção do próximo mês usando regressão linear simples sobre as séries históricas (emissões, receita, findings).",
    inputSchema: z.object({}),
    execute: async () => {
      const agg = await getAnalyticsAggregates();
      const linReg = (ys: number[]): number => {
        if (ys.length < 2) return ys[ys.length - 1] ?? 0;
        const n = ys.length;
        const xs = ys.map((_, i) => i);
        const sumX = xs.reduce((a, b) => a + b, 0);
        const sumY = ys.reduce((a, b) => a + b, 0);
        const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
        const sumX2 = xs.reduce((a, x) => a + x * x, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
        const intercept = (sumY - slope * sumX) / n;
        return Math.max(0, Math.round(slope * n + intercept));
      };
      const issTotals = agg.issuancesByMonth.map((b) => b.total);
      const issApolices = agg.issuancesByMonth.map((b) => b.apolices);
      const issEndossos = agg.issuancesByMonth.map((b) => b.endossosTotal);
      const revUSD = agg.revenueByMonth.map((b) => b.usd);
      const findings = agg.findingsByVigencia.map((b) => b.count);
      return {
        baseMonths: agg.issuancesByMonth.map((b) => b.label),
        forecast: {
          emissoesTotal: linReg(issTotals),
          apolices: linReg(issApolices),
          endossos: linReg(issEndossos),
          receitaUSD: Math.round(linReg(revUSD) * 100) / 100,
          findingsEsperados: linReg(findings),
        },
        method: "regressão linear simples (mínimos quadrados)",
      };
    },
  }),

  scoreRiskyPolicies: tool({
    description:
      "Top N apólices com maior incidência histórica de findings (proxy de risco).",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    execute: async ({ limit }) => {
      const sb = await getSupabase();
      const { data, error } = await sb.from("audit_findings").select("apolice, tipo_erro");
      if (error) throw error;
      const map = new Map<string, { count: number; tipos: Record<string, number> }>();
      for (const r of data ?? []) {
        const ap = r.apolice as string;
        if (!map.has(ap)) map.set(ap, { count: 0, tipos: {} });
        const e = map.get(ap)!;
        e.count += 1;
        const t = (r.tipo_erro as string) ?? "desconhecido";
        e.tipos[t] = (e.tipos[t] ?? 0) + 1;
      }
      const ranked = Array.from(map.entries())
        .map(([apolice, v]) => ({ apolice, totalFindings: v.count, byTipo: v.tipos }))
        .sort((a, b) => b.totalFindings - a.totalFindings)
        .slice(0, limit ?? 10);
      return { risky: ranked };
    },
  }),

  getRepasseByMonth: tool({
    description:
      "Série mensal de repasse calculado (faixas % sobre prêmio bruto). Retorna por mês: bruto, percentuais aplicados, líquido OLÉ.",
    inputSchema: z.object({}),
    execute: async () => {
      const agg = await getAnalyticsAggregates();
      return { repasseByMonth: agg.repasseByMonth };
    },
  }),

  getTopPoliciesByPremium: tool({
    description: "Top N apólices por prêmio líquido (R$). Padrão 10.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    execute: async ({ limit }) => {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from("policies")
        .select("numero_apolice, numero_endosso_atual, premio_liquido, updated_at")
        .order("premio_liquido", { ascending: false })
        .limit(limit ?? 10);
      if (error) throw error;
      return { top: data ?? [] };
    },
  }),

  getEndorsementBreakdown: tool({
    description:
      "Distribuição de endossos por tipo (000000=base, demais=A/B/C/D). Global ou filtrado por apólice.",
    inputSchema: z.object({ apolice: z.string().optional() }),
    execute: async ({ apolice }) => {
      const sb = await getSupabase();
      let q = sb.from("endorsements").select("numero_endosso, numero_apolice");
      if (apolice) q = q.eq("numero_apolice", apolice);
      const { data, error } = await q;
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        const n = (r.numero_endosso as string) ?? "";
        const k = n === "000000" ? "BASE" : "ENDOSSO";
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return { total: data?.length ?? 0, breakdown: counts };
    },
  }),

  getAuditRunHistory: tool({
    description:
      "Últimas N rodadas de auditoria com status, duração, contagens e taxa de aprovação. Padrão 10.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    execute: async ({ limit }) => {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from("audit_runs")
        .select(
          "id, created_at, status, status_geral, total_processado, aprovados, reprovados, duration_ms, error_message",
        )
        .order("created_at", { ascending: false })
        .limit(limit ?? 10);
      if (error) throw error;
      const runs = (data ?? []).map((r) => ({
        ...r,
        approvalPct:
          (r.total_processado ?? 0) > 0
            ? Math.round(((r.aprovados ?? 0) / (r.total_processado as number)) * 100)
            : null,
      }));
      return { runs };
    },
  }),

  getAuditRunDetail: tool({
    description: "Detalhe de uma rodada: findings agrupados por tipo_erro e top apólices afetadas.",
    inputSchema: z.object({ runId: z.string().uuid() }),
    execute: async ({ runId }) => {
      const sb = await getSupabase();
      const [{ data: run }, { data: findings }] = await Promise.all([
        sb
          .from("audit_runs")
          .select(
            "id, created_at, status, status_geral, total_processado, aprovados, reprovados, duration_ms, mensagem_geral",
          )
          .eq("id", runId)
          .maybeSingle(),
        sb.from("audit_findings").select("apolice, tipo_erro").eq("run_id", runId),
      ]);
      if (!run) return { found: false };
      const byTipo: Record<string, number> = {};
      const byApolice: Record<string, number> = {};
      for (const f of findings ?? []) {
        const t = (f.tipo_erro as string) ?? "?";
        const a = (f.apolice as string) ?? "?";
        byTipo[t] = (byTipo[t] ?? 0) + 1;
        byApolice[a] = (byApolice[a] ?? 0) + 1;
      }
      const topApolices = Object.entries(byApolice)
        .map(([apolice, count]) => ({ apolice, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      return { found: true, run, byTipo, topApolices, totalFindings: findings?.length ?? 0 };
    },
  }),

  getPolicySyncHealth: tool({
    description:
      "Últimas N rodadas de sincronização de apólices (n8n motor) com status, duração e total processado. Padrão 10.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    execute: async ({ limit }) => {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from("policy_sync_runs")
        .select("id, status, total_apolices, duration_ms, created_at, finished_at, error_message")
        .order("created_at", { ascending: false })
        .limit(limit ?? 10);
      if (error) throw error;
      return { runs: data ?? [] };
    },
  }),

  listAuditIgnoresGlobal: tool({
    description:
      "Resumo agregado de exceções de auditoria ativas (todos os usuários): conta por escopo e por tipo_erro. Sem PII.",
    inputSchema: z.object({}),
    execute: async () => {
      const sb = await getSupabase();
      const { data, error } = await sb.from("audit_ignores").select("scope, tipo_erro, apolice");
      if (error) throw error;
      const byScope: Record<string, number> = {};
      const byTipo: Record<string, number> = {};
      const apolicesIgnoradas = new Set<string>();
      for (const r of data ?? []) {
        byScope[r.scope as string] = (byScope[r.scope as string] ?? 0) + 1;
        if (r.tipo_erro) byTipo[r.tipo_erro as string] = (byTipo[r.tipo_erro as string] ?? 0) + 1;
        if (r.scope === "apolice") apolicesIgnoradas.add(r.apolice as string);
      }
      return {
        total: data?.length ?? 0,
        byScope,
        byTipo,
        apolicesIgnoradasCount: apolicesIgnoradas.size,
      };
    },
  }),

  getSystemHealth: tool({
    description:
      "Saúde dos sistemas integrados: webhook de sincronização (n8n motor), webhook de auditoria, secrets configurados, último sync e último audit run.",
    inputSchema: z.object({}),
    execute: async () => {
      const sb = await getSupabase();
      const [{ data: lastSync }, { data: lastAudit }] = await Promise.all([
        sb
          .from("policy_sync_runs")
          .select("created_at, status, total_apolices")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        sb
          .from("audit_runs")
          .select("created_at, status, status_geral")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        secrets: {
          N8N_MOTOR_POLICIES_URL: !!process.env.N8N_MOTOR_POLICIES_URL,
          N8N_AUDIT_WEBHOOK_URL: !!process.env.N8N_AUDIT_WEBHOOK_URL,
          AUDIT_CALLBACK_SECRET: !!process.env.AUDIT_CALLBACK_SECRET,
          POLICY_SYNC_HOOK_SECRET: !!process.env.POLICY_SYNC_HOOK_SECRET,
          LOVABLE_API_KEY: !!process.env.LOVABLE_API_KEY,
        },
        lastPolicySync: lastSync ?? null,
        lastAuditRun: lastAudit ?? null,
      };
    },
  }),

  getNotifications: tool({
    description:
      "Notificações abertas / alertas operacionais (rodadas recentes, falhas de integração).",
    inputSchema: z.object({}),
    execute: async () => {
      const sb = await getSupabase();
      const { data: lastAudit } = await sb
        .from("audit_runs")
        .select("id, created_at, status, status_geral, error_message")
        .order("created_at", { ascending: false })
        .limit(5);
      return { recentRuns: lastAudit ?? [] };
    },
  }),

  lookupExcelsiorCode: tool({
    description:
      "Traduz códigos do dicionário Excelsior (sistema origem, natureza_premio).",
    inputSchema: z.object({
      tipo: z.enum(["sistema_origem", "natureza_premio"]),
      codigo: z.string(),
    }),
    execute: ({ tipo, codigo }) => {
      const dict = tipo === "sistema_origem" ? SISTEMAS_ORIGEM : NATUREZA_PREMIO_LABEL;
      return { codigo, label: dict[codigo] ?? null };
    },
  }),

  explainRepasseFor: tool({
    description:
      "Dado um prêmio bruto (R$), retorna o breakdown de repasse usando as regras OLÉ (faixas %).",
    inputSchema: z.object({ premioBrutoBRL: z.number().positive() }),
    execute: ({ premioBrutoBRL }) => computeRepasse(premioBrutoBRL),
  }),

  searchKnowledge: tool({
    description:
      "Busca semântica (RAG) sobre apólices, findings e memória do Oléver. Use para perguntas em linguagem natural quando filtros exatos não bastam.",
    inputSchema: z.object({
      query: z.string().min(3).max(500),
      kind: z.enum(["policy", "finding", "memory", "audit_run"]).optional(),
      limit: z.number().int().min(1).max(20).optional(),
    }),
    execute: async ({ query, kind, limit }) => {
      const { searchKnowledge } = await import("@/lib/oliver-rag.server");
      try {
        const matches = await searchKnowledge({ query, kind, limit });
        return {
          count: matches.length,
          matches: matches.map((m) => ({
            kind: m.kind,
            ref_id: m.ref_id,
            title: m.title,
            content: m.content.slice(0, 800),
            similarity: Math.round(m.similarity * 1000) / 1000,
            metadata: m.metadata,
          })),
        };
      } catch (err) {
        return {
          count: 0,
          matches: [],
          error: `Busca semântica indisponível: ${(err as Error).message}. Reindexe em Configurações → Dados.`,
        };
      }
    },
  }),

  render_chart: tool({
    description:
      "Renderiza um gráfico inline na resposta (linha, barra, pizza, área, scatter ou auto). Use SEMPRE que uma visualização ajudar a comunicar a resposta ou quando o usuário pedir um gráfico. Forneça os dados já agregados.",
    inputSchema: z.object({
      type: z
        .enum(["line", "bar", "pie", "area", "scatter", "auto"])
        .describe("Tipo do gráfico; use 'auto' para deixar o sistema escolher"),
      title: z.string().min(1).max(120).describe("Título do gráfico"),
      description: z.string().max(240).optional().describe("Subtítulo curto opcional"),
      xKey: z
        .string()
        .min(1)
        .max(40)
        .describe("Nome da chave em cada objeto de 'data' que vai no eixo X / categorias / nome das fatias (pizza)"),
      series: z
        .array(
          z.object({
            key: z.string().min(1).max(40).describe("Chave em 'data' com o valor numérico"),
            label: z.string().max(60).optional().describe("Rótulo amigável da série"),
          }),
        )
        .min(1)
        .max(6),
      data: z
        .array(z.record(z.string(), z.union([z.string(), z.number(), z.null()])))
        .min(1)
        .max(200)
        .describe("Linhas com xKey + as keys de cada série"),
    }),
    execute: async () => {
      // O conteúdo do gráfico vive nos `input` da tool-part; o frontend renderiza.
      return { rendered: true };
    },
  }),

  appendToMemory: tool({
    description:
      "Anexa um trecho de aprendizado ao arquivo de memória markdown global do Oléver. Use quando descobrir uma regra de negócio, terminologia, preferência do usuário, padrão recorrente ou decisão importante. Operação aditiva — não precisa confirmar.",
    inputSchema: z.object({
      titulo: z.string().min(2).max(120).describe("Título curto da entrada"),
      conteudo: z.string().min(2).max(8000).describe("Conteúdo em markdown"),
    }),
    execute: async ({ titulo, conteudo }) => {
      const sb = await getSupabase();
      const { data: cur } = await sb
        .from("oliver_memory")
        .select("content")
        .eq("id", MEMORY_ID)
        .maybeSingle();
      const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
      const entry = `\n\n## ${titulo}\n_${ts}_\n\n${conteudo}\n`;
      const next = (cur?.content ?? "") + entry;
      const { error } = await sb
        .from("oliver_memory")
        .upsert({ id: MEMORY_ID, content: next });
      if (error) throw error;
      return { ok: true, totalChars: next.length };
    },
  }),
};

// ============== ROUTE ==============

export const Route = createFileRoute("/api/oliver-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: exige Bearer token Supabase válido (mesmo padrão de requireSupabaseAuth)
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice(7);
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const authClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await authClient.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json()) as { threadId?: string; messages?: UIMessage[] };
        const { threadId, messages } = body;
        if (!threadId || !Array.isArray(messages)) {
          return new Response("threadId and messages required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const memory = await loadMemoryContent();
        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway(OLIVER_MODEL);

        const sb = await getSupabase();

        // Persist incoming user message (the last one) before streaming
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          await sb.from("oliver_messages").insert({
            thread_id: threadId,
            role: "user",
            parts: lastMsg.parts as never,
          });
        }

        const result = streamText({
          model,
          system: buildSystemPrompt(memory),
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            try {
              const assistantMsgs = finalMessages.filter((m) => m.role === "assistant");
              const newAssistant = assistantMsgs[assistantMsgs.length - 1];
              if (newAssistant) {
                await sb.from("oliver_messages").insert({
                  thread_id: threadId,
                  role: "assistant",
                  parts: newAssistant.parts as never,
                });
                // touch thread updated_at + auto-title if still default
                const { data: t } = await sb
                  .from("oliver_threads")
                  .select("title")
                  .eq("id", threadId)
                  .maybeSingle();
                const updates: { updated_at: string; title?: string } = {
                  updated_at: new Date().toISOString(),
                };
                if (t?.title === "Nova conversa") {
                  const firstUser = messages.find((m) => m.role === "user");
                  const firstText = firstUser?.parts.find((p) => p.type === "text") as
                    | { type: "text"; text: string }
                    | undefined;
                  if (firstText?.text) {
                    updates.title = firstText.text.slice(0, 60);
                  }
                }
                await sb.from("oliver_threads").update(updates).eq("id", threadId);
              }
            } catch (err) {
              console.error("[oliver-chat] persist error", err);
            }
          },
        });
      },
    },
  },
});
