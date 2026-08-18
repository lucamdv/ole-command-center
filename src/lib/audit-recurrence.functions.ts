import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RecurrenceRunRef {
  id: string;
  created_at: string;
}

export interface RecurrenceItem {
  /** `${apolice}||${tipo_erro}` */
  key: string;
  apolice: string;
  tipo_erro: string;
  /** Auditorias (mais recente primeiro) em que o problema apareceu. */
  runs: string[];
  occurrences: number;
  /** Auditorias consecutivas contando da mais recente. */
  streak: number;
  firstSeenAt: string;
  lastSeenAt: string;
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
      .select("apolice, tipo_erro, run_id, created_at")
      .in(
        "run_id",
        runs.map((r) => r.id),
      );
    if (findErr) throw new Error(findErr.message);

    // Resoluções (inclui reabertas) do usuário/organização.
    const { data: resolutions } = await context.supabase
      .from("audit_resolutions")
      .select("apolice, tipo_erro, reopened_at");

    const resolvedCount = new Map<string, number>();
    for (const r of (resolutions ?? []) as Array<{
      apolice: string;
      tipo_erro: string;
      reopened_at: string | null;
    }>) {
      const k = `${r.apolice}||${r.tipo_erro}`;
      resolvedCount.set(k, (resolvedCount.get(k) ?? 0) + 1);
    }

    const map = new Map<
      string,
      {
        apolice: string;
        tipo_erro: string;
        runIdx: Set<number>;
        first: string;
        last: string;
      }
    >();

    for (const f of (findings ?? []) as Array<{
      apolice: string;
      tipo_erro: string;
      run_id: string;
      created_at: string;
    }>) {
      const idx = runIndex.get(f.run_id);
      if (idx === undefined) continue;
      const k = `${f.apolice}||${f.tipo_erro}`;
      const cur = map.get(k);
      if (!cur) {
        map.set(k, {
          apolice: f.apolice,
          tipo_erro: f.tipo_erro,
          runIdx: new Set([idx]),
          first: f.created_at,
          last: f.created_at,
        });
      } else {
        cur.runIdx.add(idx);
        if (f.created_at < cur.first) cur.first = f.created_at;
        if (f.created_at > cur.last) cur.last = f.created_at;
      }
    }

    const items: RecurrenceItem[] = [];
    for (const [key, v] of map) {
      const idxs = [...v.runIdx].sort((a, b) => a - b);
      let streak = 0;
      for (let i = 0; i < idxs.length; i++) {
        if (idxs[i] === i) streak++;
        else break;
      }
      const resolvedTimes = resolvedCount.get(key) ?? 0;
      items.push({
        key,
        apolice: v.apolice,
        tipo_erro: v.tipo_erro,
        runs: idxs.map((i) => runs[i].id),
        occurrences: idxs.length,
        streak,
        firstSeenAt: v.first,
        lastSeenAt: v.last,
        reopened: resolvedTimes > 0,
        resolvedTimes,
      });
    }

    return { runs, items };
  });
