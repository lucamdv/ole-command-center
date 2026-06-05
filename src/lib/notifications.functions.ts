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

    // 1) audit runs (last 7d)
    const { data: runs } = await supabaseAdmin
      .from("audit_runs")
      .select("id, status, error_message, total_processado, aprovados, reprovados, created_at")
      .gte("created_at", since)
      .in("status", ["success", "error"])
      .order("created_at", { ascending: false })
      .limit(30);

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
        const reprov = r.reprovados ?? 0;
        const total = r.total_processado ?? 0;
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

    // 3) critical findings from last 3 successful audit runs
    const recentRunIds = ((runs ?? []) as Array<{ id: string; status: string }>)
      .filter((r) => r.status === "success")
      .slice(0, 3)
      .map((r) => r.id);

    if (recentRunIds.length > 0) {
      const { data: findings } = await supabaseAdmin
        .from("audit_findings")
        .select("id, apolice, tipo_erro, endosso, created_at")
        .in("run_id", recentRunIds)
        .order("created_at", { ascending: false })
        .limit(40);

      for (const f of (findings ?? []) as Array<{
        id: string;
        apolice: string;
        tipo_erro: string;
        endosso: string | null;
        created_at: string;
      }>) {
        const tipo = (f.tipo_erro ?? "").toLowerCase();
        const isCritical = CRITICAL_TIPOS.some((t) => tipo.includes(t));
        if (!isCritical) continue;
        out.push({
          id: `finding:${f.id}`,
          kind: "achados_criticos",
          severity: "high",
          text: `Achado crítico em ${f.apolice}${f.endosso ? ` (end. ${f.endosso})` : ""} — ${f.tipo_erro}`,
          createdAt: f.created_at,
          link: `/apolices/${encodeURIComponent(f.apolice)}`,
        });
      }
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
