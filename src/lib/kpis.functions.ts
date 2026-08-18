import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  DailyKpis,
  MonthlyReincidencia,
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
}

export const getOperationKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OperationKpis> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildIgnoreSets, filterFindings } = await import("@/lib/audit/ignore-filter");
    const {
      deriveDaily,
      deriveMonthlyReincidencia,
      deriveWeekly,
      isCritical,
      type FindingLite,
      type RunLite,
    } = await import("@/lib/kpis/derive");
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
      const [{ data: ignores }, { data: findings }] = await Promise.all([
        context.supabase.from("audit_ignores").select("apolice, tipo_erro"),
        supabaseAdmin
          .from("audit_findings")
          .select("run_id, apolice, tipo_erro, detalhes")
          .in(
            "run_id",
            runsAsc.map((r) => r.id),
          ),
      ]);
      const sets = buildIgnoreSets(
        (ignores ?? []) as Array<{ apolice: string; tipo_erro: string | null }>,
      );
      const all = (findings ?? []) as Array<{
        run_id: string;
        apolice: string;
        tipo_erro: string;
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

    const daily = deriveDaily(runsAsc, byRun);
    const weekly = deriveWeekly(runsAsc, byRun, 7);
    const monthlyReincidencia = deriveMonthlyReincidencia(runsAsc, byRun);

    // === Carteira: contratos ativos e agregados por ano ===
    const { data: policies, error: pErr } = await supabaseAdmin
      .from("policies")
      .select("numero_apolice, proposta");
    if (pErr) throw new Error(pErr.message);

    const yearMap = new Map<number, YearlyPoint>();
    let contratosAtivos = 0;
    const rows = (policies ?? []) as Array<{ numero_apolice: string; proposta: unknown }>;
    for (const p of rows) {
      const facts = policyFacts(p.proposta);
      if (isActive(facts)) contratosAtivos++;
      if (!facts.inicio) continue;
      const year = Number(facts.inicio.slice(0, 4));
      if (!year) continue;
      const cur = yearMap.get(year) ?? { year, contratos: 0, premioUsd: 0, criticos: 0 };
      cur.contratos += 1;
      cur.premioUsd += facts.premioUsd;
      yearMap.set(year, cur);
    }

    // Incidentes críticos por ano (ano da run onde o achado apareceu)
    for (const r of runsAsc) {
      const year = Number(r.at.slice(0, 4));
      if (!year) continue;
      const criticos = (byRun.get(r.id) ?? []).filter(isCritical).length;
      if (criticos === 0 && !yearMap.has(year)) continue;
      const cur = yearMap.get(year) ?? { year, contratos: 0, premioUsd: 0, criticos: 0 };
      cur.criticos += criticos;
      yearMap.set(year, cur);
    }

    const yearly = Array.from(yearMap.values())
      .map((y) => ({ ...y, premioUsd: Math.round(y.premioUsd * 100) / 100 }))
      .sort((a, b) => a.year - b.year);

    return {
      daily,
      weekly,
      monthlyReincidencia,
      contratosAtivos,
      carteiraTotal: rows.length,
      yearly,
    };
  });
