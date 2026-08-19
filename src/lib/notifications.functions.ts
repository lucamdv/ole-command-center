import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotifSeverity = "critical" | "high" | "info" | "low";
export type NotifKind =
  | "auditoria_concluida"
  | "auditoria_erro"
  | "sync_carteira"
  | "achados_criticos"
  | "apolices_atualizadas";

export interface ServerNotification {
  id: string;
  kind: NotifKind;
  severity: NotifSeverity;
  text: string;
  createdAt: string; // ISO
  link?: string;
}

const CRITICAL_TIPOS = [
  "gap_vigencia",
  "gap_de_vigencia",
  "duplicidade",
  "duplicado",
  "sobreposicao",
  "sobreposição",
  "vigencia_invalida",
];

export const getNotifications = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { lastSeenAt?: string | null }) => d)
  .handler(async ({ data }): Promise<ServerNotification[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const out: ServerNotification[] = [];

    // Exceções da auditoria (audit_ignores) — nunca devem gerar notificação.
    const { buildIgnoreSets, filterFindings, adjustRunCounts } = await import(
      "@/lib/audit/ignore-filter"
    );
    const { data: ignoreRows } = await supabaseAdmin
      .from("audit_ignores")
      .select("apolice, tipo_erro");
    const ignoreSets = buildIgnoreSets(
      (ignoreRows ?? []) as Array<{ apolice: string; tipo_erro: string | null }>,
    );

    // 1) audit runs (last 7d)
    const { data: runs } = await supabaseAdmin
      .from("audit_runs")
      .select("id, status, error_message, total_processado, aprovados, reprovados, created_at")
      .gte("created_at", since)
      .in("status", ["success", "error"])
      .order("created_at", { ascending: false })
      .limit(30);

    const successRunIds = ((runs ?? []) as Array<{ id: string; status: string }>)
      .filter((r) => r.status === "success")
      .map((r) => r.id);

    type FindingRow = {
      id: string;
      apolice: string;
      tipo_erro: string;
      endosso: string | null;
      created_at: string;
      run_id: string;
    };

    let allFindings: FindingRow[] = [];
    if (successRunIds.length > 0) {
      const { data: fr } = await supabaseAdmin
        .from("audit_findings")
        .select("id, apolice, tipo_erro, endosso, created_at, run_id")
        .in("run_id", successRunIds);
      allFindings = (fr ?? []) as FindingRow[];
    }

    const byRun = new Map<string, FindingRow[]>();
    for (const f of allFindings) {
      const list = byRun.get(f.run_id) ?? [];
      list.push(f);
      byRun.set(f.run_id, list);
    }


    for (const r of (runs ?? []) as Array<{
      id: string;
      status: string;
      error_message: string | null;
      total_processado: number | null;
      aprovados: number | null;
      reprovados: number | null;
      created_at: string;
    }>) {
      if (r.status === "error") {
        out.push({
          id: `audit:${r.id}`,
          kind: "auditoria_erro",
          severity: "critical",
          text: `Falha na auditoria — ${(r.error_message ?? "erro desconhecido").slice(0, 140)}`,
          createdAt: r.created_at,
        });
      } else {
        const adjusted = adjustRunCounts(
          {
            total_processado: r.total_processado ?? 0,
            aprovados: r.aprovados ?? 0,
            reprovados: r.reprovados ?? 0,
          },
          ignoreSets,
          byRun.get(r.id) ?? [],
        );
        const reprov = adjusted.reprovados;
        const total = adjusted.total_processado;
        out.push({
          id: `audit:${r.id}`,
          kind: "auditoria_concluida",
          severity: reprov > 0 ? "high" : "low",
          text:
            reprov === 0
              ? `Auditoria concluída — ${total} apólices em conformidade`
              : `Auditoria concluída — ${reprov} de ${total} com inconsistências`,
          createdAt: r.created_at,
        });
      }

    }

    // 2) policy sync runs
    const { data: syncs } = await supabaseAdmin
      .from("policy_sync_runs")
      .select("id, status, total_apolices, error_message, created_at, finished_at")
      .gte("created_at", since)
      .in("status", ["success", "error"])
      .order("created_at", { ascending: false })
      .limit(20);

    for (const s of (syncs ?? []) as Array<{
      id: string;
      status: string;
      total_apolices: number | null;
      error_message: string | null;
      created_at: string;
      finished_at: string | null;
    }>) {
      if (s.status === "error") {
        out.push({
          id: `sync:${s.id}`,
          kind: "sync_carteira",
          severity: "critical",
          text: `Falha na sincronização da carteira — ${(s.error_message ?? "erro").slice(0, 140)}`,
          createdAt: s.finished_at ?? s.created_at,
        });
      } else {
        out.push({
          id: `sync:${s.id}`,
          kind: "sync_carteira",
          severity: "info",
          text: `Carteira sincronizada — ${s.total_apolices ?? 0} apólices`,
          createdAt: s.finished_at ?? s.created_at,
        });
      }
    }

    // 3) critical findings from last 3 successful audit runs (excluindo exceções)
    const recentRunIds = new Set(successRunIds.slice(0, 3));

    const criticalFindings = filterFindings(
      ignoreSets,
      allFindings.filter((f) => recentRunIds.has(f.run_id)),
    )
      .filter((f) => {
        const tipo = (f.tipo_erro ?? "").toLowerCase();
        return CRITICAL_TIPOS.some((t) => tipo.includes(t));
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 40);

    for (const f of criticalFindings) {
      out.push({
        id: `finding:${f.id}`,
        kind: "achados_criticos",
        severity: "high",
        text: `Achado crítico em ${f.apolice}${f.endosso ? ` (end. ${f.endosso})` : ""} — ${f.tipo_erro}`,
        createdAt: f.created_at,
        link: `/apolices/${encodeURIComponent(f.apolice)}`,
      });
    }


    // 4) apólices atualizadas desde lastSeenAt
    if (data.lastSeenAt) {
      const { count } = await supabaseAdmin
        .from("policies")
        .select("id", { count: "exact", head: true })
        .gt("updated_at", data.lastSeenAt);
      if ((count ?? 0) > 0) {
        out.push({
          id: `policies_updated:${data.lastSeenAt}`,
          kind: "apolices_atualizadas",
          severity: "info",
          text: `${count} apólice${(count ?? 0) > 1 ? "s" : ""} atualizada${
            (count ?? 0) > 1 ? "s" : ""
          } desde sua última visita`,
          createdAt: new Date().toISOString(),
          link: "/apolices",
        });
      }
    }

    out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return out.slice(0, 50);
  });
