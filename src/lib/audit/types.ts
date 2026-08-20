// OLÉ COPILOT — contrato real vindo do webhook n8n.

export type AuditStatusGeral = "SUCESSO" | "ALERTA" | "ERRO";

export interface AuditError {
  tipo_erro: string;
  endosso?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  motivo?: string | null;
  detalhe?: string | null;
}

export interface ApoliceComErro {
  apolice: string;
  total_erros: number;
  erros: AuditError[];
}

export interface AuditPayload {
  data_auditoria: string;
  resumo: {
    aprovados: number;
    reprovados: number;
    total_processado: number;
  };
  status_geral: AuditStatusGeral;
  mensagem_geral: string;
  apolices_com_erro: ApoliceComErro[];
}

export interface AuditRunRow {
  id: string;
  created_at: string;
  data_auditoria: string;
  status_geral: string;
  mensagem_geral: string | null;
  total_processado: number;
  aprovados: number;
  reprovados: number;
  duration_ms: number | null;
  raw: AuditPayload;
}

export interface AuditFindingRow {
  id: string;
  run_id: string;
  apolice: string;
  tipo_erro: string;
  endosso: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  detalhes: AuditError;
  created_at: string;
}

export interface LatestAudit {
  run: AuditRunRow;
  findings: AuditFindingRow[];
}

export interface AuditHistoryItem {
  id: string;
  created_at: string;
  data_auditoria: string;
  status_geral: string;
  total_processado: number;
  aprovados: number;
  reprovados: number;
  duration_ms: number | null;
  origem?: "manual" | "auto" | string | null;
}
