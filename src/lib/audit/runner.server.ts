import { randomUUID } from "crypto";
import {
  authenticate,
  getContrato,
  getEmissaoDoc,
  listDocuments,
  mapLimit,
} from "./excelsior.server";
import { auditPolicy, type PolicyAuditResult } from "./rules";

export interface AuditProgress {
  stage:
    | "authenticating"
    | "listing_policies"
    | "fetching_endorsements"
    | "auditing"
    | "done"
    | "error";
  totalPolicies: number;
  processedPolicies: number;
  approved: number;
  rejected: number;
  ignored: number;
  errors: number;
  message?: string;
}

export interface AuditRun {
  id: string;
  status: "running" | "done" | "error";
  startedAt: string;
  finishedAt?: string;
  progress: AuditProgress;
  results: PolicyAuditResult[];
  error?: string;
}

const runs = new Map<string, AuditRun>();

export function getRun(id: string): AuditRun | undefined {
  return runs.get(id);
}

export function listRecentRuns(limit = 10): AuditRun[] {
  return Array.from(runs.values())
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit);
}

export function startRun(): AuditRun {
  const id = randomUUID();
  const run: AuditRun = {
    id,
    status: "running",
    startedAt: new Date().toISOString(),
    progress: {
      stage: "authenticating",
      totalPolicies: 0,
      processedPolicies: 0,
      approved: 0,
      rejected: 0,
      ignored: 0,
      errors: 0,
    },
    results: [],
  };
  runs.set(id, run);
  // Dispara em background — não espera.
  void execute(run).catch((err) => {
    run.status = "error";
    run.error = err instanceof Error ? err.message : String(err);
    run.progress.stage = "error";
    run.progress.message = run.error;
    run.finishedAt = new Date().toISOString();
  });
  return run;
}

async function execute(run: AuditRun): Promise<void> {
  run.progress.stage = "authenticating";
  const token = await authenticate();

  run.progress.stage = "listing_policies";
  const documents = await listDocuments(token);
  const apolices = documents
    .map((d: any) => d?.numero_documento || d?.numero_apolice)
    .filter((n: any): n is string => typeof n === "string" && n.endsWith("000000"));

  run.progress.totalPolicies = apolices.length;
  run.progress.stage = "fetching_endorsements";

  await mapLimit(apolices, 4, async (numeroApolice) => {
    try {
      const contrato = await getContrato(token, numeroApolice);
      const maxEndosso = parseInt(String(contrato?.ultimo_endosso ?? 0));
      const baseDocumento = numeroApolice.slice(0, -6);

      const docs: string[] = [];
      for (let i = 0; i <= maxEndosso; i++) {
        docs.push(baseDocumento + String(i).padStart(6, "0"));
      }

      const endossos = await mapLimit(docs, 4, async (doc) => {
        try {
          const raw = await getEmissaoDoc(token, doc);
          // Limpa estrutura — n8n usa item.json.apolice || item.json.endosso || item.json
          const raiz = raw?.apolice || raw?.endosso || raw;
          return {
            numero_apolice_seguradora: raiz?.numero_apolice_seguradora,
            numero_endosso_seguradora: raiz?.numero_endosso_seguradora,
            proposta: raiz?.proposta || raiz,
          };
        } catch {
          return null;
        }
      });

      const validos = endossos.filter((e): e is NonNullable<typeof e> => !!e);
      const result = auditPolicy(validos);
      run.results.push(result);

      if (result.status_auditoria === "APROVADO") run.progress.approved++;
      else if (result.status_auditoria === "REPROVADO") run.progress.rejected++;
      else run.progress.ignored++;
    } catch (err) {
      run.results.push({
        status_auditoria: "ERRO_LEITURA",
        apolice: numeroApolice,
        motivo: err instanceof Error ? err.message : String(err),
      });
      run.progress.errors++;
    } finally {
      run.progress.processedPolicies++;
    }
  });

  run.progress.stage = "done";
  run.status = "done";
  run.finishedAt = new Date().toISOString();
}
