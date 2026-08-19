import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RecurrenceRunRef {
  id: string;
  created_at: string;
}

/** Ocorrência do mesmo tipo de erro em OUTRO endosso da mesma apólice. */
export interface PolicyHistoryEntry {
  endosso: string;
  firstSeenAt: string;
  lastSeenAt: string;
  audits: number;
}

export interface RecurrenceItem {
  /** `${apolice}||${tipo_erro}||${endosso}` */
  key: string;
  apolice: string;
  tipo_erro: string;
  /** Endosso do incidente ("" quando não informado). */
  endosso: string;
  /** Auditorias (mais recente primeiro) em que o problema apareceu. */
  runs: string[];
  /** Auditorias consecutivas em aberto (episódio atual, deste endosso). */
  occurrences: number;
  /** Total de auditorias em que essa tripla já apareceu. */
  totalOccurrences: number;
  /** Auditorias consecutivas contando da mais recente. */
  streak: number;
  /** Início do episódio atual (primeira auditoria da sequência em aberto). */
  firstSeenAt: string;
  /** Primeira vez que essa tripla apareceu em qualquer auditoria. */
  firstSeenEverAt: string;
  lastSeenAt: string;
  /** O mesmo tipo de erro já ocorreu em outro endosso desta apólice. */
  recorrenteNaApolice: boolean;
  /** Endossos anteriores da apólice com o mesmo tipo de erro. */
  policyHistory: PolicyHistoryEntry[];
  /** Já foi marcado como resolvido e voltou a aparecer. */
  reopened: boolean;
  /** Quantas vezes já foi resolvido no passado. */
  resolvedTimes: number;
}

export interface RecurrenceSummary {
  runs: RecurrenceRunRef[];
  items: RecurrenceItem[];
}

const MAX_RUNS = 20;

export const getFindingRecurrence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RecurrenceSummary> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: runRows, error: runErr } = await supabaseAdmin
      .from("audit_runs")
      .select("id, created_at")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(MAX_RUNS);
    if (runErr) throw new Error(runErr.message);

    const runs = ((runRows ?? []) as RecurrenceRunRef[]).map((r) => ({
      id: r.id,
      created_at: r.created_at,
    }));
    if (runs.length === 0) return { runs, items: [] };

    const runIndex = new Map(runs.map((r, i) => [r.id, i] as const));

    const { data: findings, error: findErr } = await supabaseAdmin
      .from("audit_findings")
      .select("apolice, tipo_erro, endosso, run_id")
      .in(
        "run_id",
        runs.map((r) => r.id),
      );
    if (findErr) throw new Error(findErr.message);

    // Resoluções (inclui reabertas) por apólice + tipo (+ endosso quando houver).
    const { data: resolutions } = await context.supabase
      .from("audit_resolutions")
      .select("apolice, tipo_erro, endosso, reopened_at");

    const resolvedCount = new Map<string, number>();
    for (const r of (resolutions ?? []) as Array<{
      apolice: string;
      tipo_erro: string;
      endosso: string | null;
    }>) {
      const k = `${r.apolice}||${r.tipo_erro}||${(r.endosso ?? "").trim()}`;
      resolvedCount.set(k, (resolvedCount.get(k) ?? 0) + 1);
      // Também conta no escopo sem endosso, para registros antigos.
      const kAny = `${r.apolice}||${r.tipo_erro}||`;
      if (kAny !== k) resolvedCount.set(kAny, (resolvedCount.get(kAny) ?? 0) + 1);
    }

    // Agrupamento por apólice + tipo + endosso.
    const map = new Map<
      string,
      { apolice: string; tipo_erro: string; endosso: string; runIdx: Set<number> }
    >();

    for (const f of (findings ?? []) as Array<{
      apolice: string;
      tipo_erro: string;
      endosso: string | null;
      run_id: string;
    }>) {
      const idx = runIndex.get(f.run_id);
      if (idx === undefined) continue;
      const endosso = (f.endosso ?? "").trim();
      const k = `${f.apolice}||${f.tipo_erro}||${endosso}`;
      const cur = map.get(k);
      if (!cur) {
        map.set(k, {
          apolice: f.apolice,
          tipo_erro: f.tipo_erro,
          endosso,
          runIdx: new Set([idx]),
        });
      } else {
        cur.runIdx.add(idx);
      }
    }

    // Datas por tripla, para montar o histórico na apólice (outros endossos).
    interface Base {
      key: string;
      apolice: string;
      tipo_erro: string;
      endosso: string;
      idxs: number[];
      streak: number;
      firstSeenAt: string;
      firstSeenEverAt: string;
      lastSeenAt: string;
    }

    const bases: Base[] = [];
    for (const [key, v] of map) {
      const idxs = [...v.runIdx].sort((a, b) => a - b);
      let streak = 0;
      for (let i = 0; i < idxs.length; i++) {
        if (idxs[i] === i) streak++;
        else break;
      }
      // Datas ancoradas na auditoria (não no instante de gravação da linha),
      // e o "em aberto" considera apenas a sequência consecutiva atual.
      bases.push({
        key,
        apolice: v.apolice,
        tipo_erro: v.tipo_erro,
        endosso: v.endosso,
        idxs,
        streak,
        firstSeenAt: runs[idxs[Math.max(0, streak - 1)]].created_at,
        firstSeenEverAt: runs[idxs[idxs.length - 1]].created_at,
        lastSeenAt: runs[idxs[0]].created_at,
      });
    }

    // Índice apólice+tipo → endossos afetados.
    const byPolicyType = new Map<string, Base[]>();
    for (const b of bases) {
      const k = `${b.apolice}||${b.tipo_erro}`;
      const list = byPolicyType.get(k) ?? [];
      list.push(b);
      byPolicyType.set(k, list);
    }

    const items: RecurrenceItem[] = bases.map((b) => {
      const siblings = (byPolicyType.get(`${b.apolice}||${b.tipo_erro}`) ?? []).filter(
        (s) => s.endosso !== b.endosso,
      );
      const policyHistory: PolicyHistoryEntry[] = siblings
        .map((s) => ({
          endosso: s.endosso || "—",
          firstSeenAt: s.firstSeenEverAt,
          lastSeenAt: s.lastSeenAt,
          audits: s.idxs.length,
        }))
        .sort((a, b2) => (a.firstSeenAt < b2.firstSeenAt ? -1 : 1));

      const resolvedTimes =
        resolvedCount.get(b.key) ?? resolvedCount.get(`${b.apolice}||${b.tipo_erro}||`) ?? 0;

      return {
        key: b.key,
        apolice: b.apolice,
        tipo_erro: b.tipo_erro,
        endosso: b.endosso,
        runs: b.idxs.map((i) => runs[i].id),
        occurrences: Math.max(1, b.streak),
        totalOccurrences: b.idxs.length,
        streak: b.streak,
        firstSeenAt: b.firstSeenAt,
        firstSeenEverAt: b.firstSeenEverAt,
        lastSeenAt: b.lastSeenAt,
        recorrenteNaApolice: policyHistory.length > 0,
        policyHistory,
        reopened: resolvedTimes > 0,
        resolvedTimes,
      };
    });

    return { runs, items };
  });
