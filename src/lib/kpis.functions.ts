import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ResolutionTimeSummary } from "@/lib/audit/resolution-filter";
import type {
  DailyKpis,
  FindingLite,
  MonthlyReincidencia,
  RunLite,
  WeeklyKpis,
  YearlyPoint,
} from "@/lib/kpis/derive";

export interface OperationKpis {
  daily: DailyKpis;
  weekly: WeeklyKpis;
  monthlyReincidencia: MonthlyReincidencia[];
  contratosAtivos: number;
  carteiraTotal: number;
  yearly: YearlyPoint[];
  /** Ano corrente do calendário (pode estar zerado se não houver dados). */
  yearCur: YearlyPoint;
  /** Ano anterior ao corrente. */
  yearPrev: YearlyPoint;
  /** Corte do acumulado do ano, em DD/MM. */
  ytdLabel: string;
  /** Tempo de resolução (primeira detecção → resolução), geral e por tipo. */
  resolutionTime: ResolutionTimeSummary;
  /** Resoluções manuais registradas desde a run anterior. */
  resolvidasManuais: number;
  /** Resoluções automáticas (erro deixou de aparecer) desde a run anterior. */
  resolvidasAuto: number;
}


export const getOperationKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OperationKpis> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildIgnoreSets, filterFindings } = await import("@/lib/audit/ignore-filter");
    const { deriveResolutionTimes, resolutionsAsIgnoreEntries } = await import(
      "@/lib/audit/resolution-filter"
    );
    const { deriveDaily, deriveMonthlyReincidencia, deriveWeekly, findingKey, isCritical } =
      await import("@/lib/kpis/derive");

    const { isActive, policyFacts } = await import("@/lib/kpis/policy-facts");

    // === Runs de auditoria (mais recentes primeiro no banco) ===
    const { data: runRows, error: runErr } = await supabaseAdmin
      .from("audit_runs")
      .select("id, created_at, data_auditoria")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(60);
    if (runErr) throw new Error(runErr.message);

    const runsAsc: RunLite[] = ((runRows ?? []) as Array<{
      id: string;
      created_at: string;
      data_auditoria: string | null;
    }>)
      .map((r) => ({ id: r.id, at: r.data_auditoria ?? r.created_at }))
      .sort((a, b) => +new Date(a.at) - +new Date(b.at));

    const byRun = new Map<string, FindingLite[]>();
    if (runsAsc.length > 0) {
      const [{ data: ignores }, { data: resolvidosAtivos }, { data: findings }] = await Promise.all([
        context.supabase.from("audit_ignores").select("apolice, tipo_erro"),
        context.supabase
          .from("audit_resolutions")
          .select("apolice, tipo_erro, endosso")
          .is("reopened_at", null),
        supabaseAdmin
          .from("audit_findings")
          .select("run_id, apolice, tipo_erro, endosso, detalhes")
          .in(
            "run_id",
            runsAsc.map((r) => r.id),
          ),
      ]);
      const sets = buildIgnoreSets([
        ...((ignores ?? []) as Array<{ apolice: string; tipo_erro: string | null }>),
        ...resolutionsAsIgnoreEntries(
          (resolvidosAtivos ?? []) as Array<{
            apolice: string;
            tipo_erro: string;
            endosso: string | null;
          }>,
        ),
      ]);
      const all = (findings ?? []) as Array<{
        run_id: string;
        apolice: string;
        tipo_erro: string;
        endosso: string | null;
        detalhes: Record<string, unknown> | null;
      }>;
      for (const f of filterFindings(sets, all)) {
        const nivelRaw = (f.detalhes ?? {})["nivel"];
        const lite: FindingLite = {
          run_id: f.run_id,
          apolice: f.apolice,
          tipo_erro: f.tipo_erro,
          nivel: typeof nivelRaw === "string" ? nivelRaw : null,
        };
        const list = byRun.get(f.run_id) ?? [];
        list.push(lite);
        byRun.set(f.run_id, list);
      }
    }

    // === Resoluções (manuais + automáticas) ===
    // Fonte única de verdade: linhas de audit_resolutions não reabertas.
    const { data: resolucoes } = await context.supabase
      .from("audit_resolutions")
      .select("apolice, tipo_erro, first_seen_at, resolved_at, reopened_at, origem")
      .order("resolved_at", { ascending: false })
      .limit(2000);
    const resolucoesRows = (resolucoes ?? []) as Array<{
      apolice: string;
      tipo_erro: string;
      first_seen_at: string | null;
      resolved_at: string;
      reopened_at: string | null;
      origem: string | null;
    }>;
    const resolutionTime = deriveResolutionTimes(resolucoesRows);

    const daily = deriveDaily(runsAsc, byRun);
    // Ciclo atual: resoluções registradas desde a run anterior
    // (ou últimas 24h quando só existe uma run).
    const prevRunAt = runsAsc.length > 1 ? runsAsc[runsAsc.length - 2].at : null;
    const desde = prevRunAt ? +new Date(prevRunAt) : Date.now() - 86_400_000;
    const doCiclo = resolucoesRows.filter(
      (r) => !r.reopened_at && +new Date(r.resolved_at) >= desde,
    );
    const resolvidasAuto = doCiclo.filter((r) => r.origem === "auto").length;
    const resolvidasManuais = doCiclo.length - resolvidasAuto;
    daily.resolvidas = resolvidasManuais + resolvidasAuto;
    const weekly = deriveWeekly(runsAsc, byRun, 7);
    const monthlyReincidencia = deriveMonthlyReincidencia(runsAsc, byRun);

    // === Carteira: contratos ativos e agregados por ano ===
    const { emptyYear, withinYtd, ytdCutoff } = await import("@/lib/kpis/derive");
    const { issuanceFacts } = await import("@/lib/kpis/policy-facts");
    const cutoff = ytdCutoff();
    const nowYear = new Date().getUTCFullYear();

    const yearMap = new Map<number, YearlyPoint>();
    const yearOf = (date: string) => Number(date.slice(0, 4)) || null;
    const bucket = (year: number) => {
      const cur = yearMap.get(year) ?? emptyYear(year);
      yearMap.set(year, cur);
      return cur;
    };
    bucket(nowYear);
    bucket(nowYear - 1);

    const { data: policies, error: pErr } = await supabaseAdmin
      .from("policies")
      .select("numero_apolice, proposta");
    if (pErr) throw new Error(pErr.message);

    let contratosAtivos = 0;
    const rows = (policies ?? []) as Array<{ numero_apolice: string; proposta: unknown }>;
    for (const p of rows) {
      const facts = policyFacts(p.proposta);
      if (isActive(facts)) contratosAtivos++;
      // contratos e prêmio direto são atribuídos ao ano de EMISSÃO
      if (!facts.emissao) continue;
      const year = yearOf(facts.emissao);
      if (!year) continue;
      const cur = bucket(year);
      cur.contratos += 1;
      cur.premioDiretoUsd += facts.premioUsd;
      if (withinYtd(facts.emissao, cutoff)) {
        cur.contratosYtd += 1;
        cur.premioDiretoYtdUsd += facts.premioUsd;
      }
    }

    // === Prêmio emitido por ano (mesma base do Mapa de Repasses) ===
    const { data: emissions, error: emErr } = await supabaseAdmin
      .from("endorsements")
      .select("numero_endosso, proposta");
    if (emErr) throw new Error(emErr.message);

    for (const e of (emissions ?? []) as Array<{ proposta: unknown }>) {
      const facts = issuanceFacts(e.proposta);
      const addPremio = (date: string | null, valor: number) => {
        if (!date || valor <= 0) return;
        const year = yearOf(date);
        if (!year) return;
        const cur = bucket(year);
        cur.premioEmitidoUsd += valor;
        if (withinYtd(date, cutoff)) cur.premioEmitidoYtdUsd += valor;
      };
      if (facts.parcelas.length > 0) {
        for (const parc of facts.parcelas) addPremio(parc.data ?? facts.emissao, parc.valor);
      } else {
        addPremio(facts.emissao, facts.premioTotalCoberturas);
      }
    }

    // Incidentes críticos DISTINTOS por ano (chave apólice|tipo_erro),
    // para não contar o mesmo achado repetido em cada run.
    const criticosPorAno = new Map<number, { all: Set<string>; ytd: Set<string> }>();
    for (const r of runsAsc) {
      const date = r.at.slice(0, 10);
      const year = yearOf(date);
      if (!year) continue;
      const sets =
        criticosPorAno.get(year) ?? { all: new Set<string>(), ytd: new Set<string>() };
      for (const f of byRun.get(r.id) ?? []) {
        if (!isCritical(f)) continue;
        const key = findingKey(f);
        sets.all.add(key);
        if (withinYtd(date, cutoff)) sets.ytd.add(key);
      }
      criticosPorAno.set(year, sets);
    }
    for (const [year, sets] of criticosPorAno) {
      const cur = bucket(year);
      cur.criticos = sets.all.size;
      cur.criticosYtd = sets.ytd.size;
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const yearly = Array.from(yearMap.values())
      .map((y) => ({
        ...y,
        premioEmitidoUsd: round2(y.premioEmitidoUsd),
        premioEmitidoYtdUsd: round2(y.premioEmitidoYtdUsd),
        premioDiretoUsd: round2(y.premioDiretoUsd),
        premioDiretoYtdUsd: round2(y.premioDiretoYtdUsd),
      }))
      .sort((a, b) => a.year - b.year);

    return {
      daily,
      weekly,
      monthlyReincidencia,
      contratosAtivos,
      carteiraTotal: rows.length,
      yearly,
      yearCur: yearly.find((y) => y.year === nowYear) ?? emptyYear(nowYear),
      yearPrev: yearly.find((y) => y.year === nowYear - 1) ?? emptyYear(nowYear - 1),
      ytdLabel: cutoff.split("-").reverse().join("/"),
      resolutionTime,
      resolvidasManuais,
      resolvidasAuto,
    };
  });


