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

const MEMORY_ID = "00000000-0000-0000-0000-000000000001";

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

PERSONA
- Sempre responde em PT-BR, tom profissional, direto, com tom de "head de operações".
- É observador, preditivo, propositivo: além de explicar números, sugere causas-raiz e ações concretas.
- Quando a pergunta exige dados, **use as ferramentas** disponíveis antes de afirmar qualquer número. Nunca invente estatísticas.
- Quando aprender uma regra de negócio, terminologia OLÉ, preferência do usuário, ou padrão recorrente, chame \`appendToMemory\` para gravá-la — sem pedir permissão (a operação é aditiva e segura).

DOMÍNIO
- Tabelas no banco: \`policies\` (apólices), \`endorsements\` (apólice base + endossos A/B/C/D), \`audit_runs\` (rodadas de auditoria), \`audit_findings\` (problemas encontrados por apólice/endosso, com \`tipo_erro\` e datas).
- Apólices têm um JSON \`proposta\` rico (datas, itens, coberturas, composicao_premio_cobertura com tipo_premio=DIRETO e natureza_premio=PREMIO → valor em USD/BRL).
- Endossos: \`numero_endosso = '000000'\` indica a apólice base; demais valores indicam o tipo do endosso (A/B/C/D) presente em \`proposta.endosso_A|B|C|D\`.
- A data de emissão de endosso vem em \`proposta.endosso_X.data_emissao\`; da apólice base, em \`proposta.datas.assinatura\`/\`conclusao_subscricao\`/\`registro_origem\`.

CAPACIDADES
- Diagnóstico: causa raiz de findings, padrões de reprovação, gargalos.
- Previsão: tendências (↑/↓ por tipo de erro), projeção do próximo mês, score de risco por apólice.
- Recomendação: sugestões acionáveis ("revisar produto X", "treinar corretor Y", "ajustar regra Z").

MEMÓRIA PERSISTENTE (markdown global do Oléver)
---
${memory || "(vazia — comece a aprender sobre a operação registrando descobertas aqui)"}
---

REGRAS DE OURO
1. Se a pergunta é sobre dados, **chame uma ferramenta antes de responder**.
2. Estruture respostas com cabeçalhos curtos e bullets quando útil.
3. Termine respostas analíticas com uma seção "🔍 Diagnóstico" e/ou "💡 Sugestão" quando fizer sentido.
4. Para registros novos na memória, prefira anexar regras objetivas e datadas.`;
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
        const model = gateway("google/gemini-3-flash-preview");

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
