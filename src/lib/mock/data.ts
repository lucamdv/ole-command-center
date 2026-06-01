// OLÉ COPILOT — Mock domain data. Types double as backend contract.

export type AuditStatus = "APROVADA" | "REPROVADA";
export type Severity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "open" | "investigating" | "resolved";

export type AuditRule =
  | "Gap de Vigência"
  | "Cobertura Inativa"
  | "Duplicidade de Endosso"
  | "Prêmio Fora do Padrão"
  | "Limite de Cobertura Inválido"
  | "Erro de Administração"
  | "Erro de Distribuição"
  | "Erro Financeiro"
  | "Erro de Renovação"
  | "Erro de Continuidade";

export const AUDIT_RULES: AuditRule[] = [
  "Gap de Vigência",
  "Cobertura Inativa",
  "Duplicidade de Endosso",
  "Prêmio Fora do Padrão",
  "Limite de Cobertura Inválido",
  "Erro de Administração",
  "Erro de Distribuição",
  "Erro Financeiro",
  "Erro de Renovação",
  "Erro de Continuidade",
];

export interface Coverage {
  id: string;
  name: string;
  insuredAmount: number;
  premium: number;
  startDate: string;
  endDate: string;
  status: "ativa" | "inativa" | "suspensa";
  compliant: boolean;
}

export interface Endorsement {
  id: string;
  number: string;
  date: string;
  type: "Alteração de Prêmio" | "Alteração de Cobertura" | "Alteração de Vigência" | "Cancelamento" | "Correção";
  description: string;
  premiumDelta: number;
  newPremium: number;
  coverageChange?: string;
  status: AuditStatus;
  severity?: Severity;
}

export interface AuditFinding {
  rule: AuditRule;
  result: AuditStatus;
  severity: Severity;
  description: string;
  impact: string;
  recommendation: string;
}

export interface Policy {
  id: string;
  number: string;
  status: "ativa" | "cancelada" | "suspensa" | "renovada";
  audit: AuditStatus;
  product: string;
  broker: string;
  brokerCode: string;
  insured: string;
  startDate: string;
  endDate: string;
  premium: number;
  exposure: number;
  coverages: Coverage[];
  endorsements: Endorsement[];
  findings: AuditFinding[];
  hasGap: boolean;
  updatedAt: string;
}

export interface Alert {
  id: string;
  severity: Severity;
  rule: AuditRule;
  policyNumber: string;
  product: string;
  broker: string;
  impact: number;
  createdAt: string;
  status: AlertStatus;
  title: string;
  description: string;
}

// Deterministic pseudo-random for stable mock data
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
const between = (a: number, b: number) => a + rng() * (b - a);
const intBetween = (a: number, b: number) => Math.floor(between(a, b));

const PRODUCTS = [
  "Vida Individual",
  "Vida em Grupo",
  "Vida Premiável",
  "Acidentes Pessoais",
  "Prestamista",
  "Funeral Familiar",
  "Doenças Graves",
];
const BROKERS = [
  { name: "Aliança Corretora", code: "BRK-0021" },
  { name: "Capital Seguros", code: "BRK-0034" },
  { name: "Horizonte Brokers", code: "BRK-0078" },
  { name: "Vértice Seguros", code: "BRK-0102" },
  { name: "Atlas Risk", code: "BRK-0145" },
  { name: "Núcleo Corretora", code: "BRK-0167" },
  { name: "Prisma Seguros", code: "BRK-0188" },
  { name: "Meridian Brokers", code: "BRK-0211" },
];
const COVERAGE_TYPES = [
  "Morte por Qualquer Causa",
  "Morte Acidental",
  "Invalidez Permanente Total",
  "Invalidez por Acidente",
  "Assistência Funeral",
  "Despesas Médicas",
  "Doenças Graves",
  "Diária de Internação",
];
const INSURED_NAMES = [
  "Construtora Vértice S.A.",
  "Logística Andrade Ltda.",
  "Indústria Mendes & Cia",
  "Cooperativa AgroSul",
  "Têxtil Bandeirantes",
  "Transportes Rio Verde",
  "Grupo Cordilheira",
  "Frigorífico Pampas",
  "Cerâmica Continental",
  "Energia Plena S.A.",
];

function makeCoverages(): Coverage[] {
  const n = intBetween(2, 5);
  const set = new Set<string>();
  const out: Coverage[] = [];
  while (out.length < n) {
    const name = pick(COVERAGE_TYPES);
    if (set.has(name)) continue;
    set.add(name);
    const status = rng() > 0.92 ? "inativa" : rng() > 0.96 ? "suspensa" : "ativa";
    out.push({
      id: `cov-${Math.floor(rng() * 1e9)}`,
      name,
      insuredAmount: Math.round(between(50_000, 2_500_000) / 1000) * 1000,
      premium: Math.round(between(80, 3200)),
      startDate: "2024-01-15",
      endDate: "2025-01-14",
      status,
      compliant: status === "ativa" && rng() > 0.18,
    });
  }
  return out;
}

function makeEndorsements(seed: number): Endorsement[] {
  const n = intBetween(1, 6);
  const out: Endorsement[] = [];
  let currentPremium = Math.round(between(1200, 8500));
  for (let i = 0; i <= n; i++) {
    const type = i === 0
      ? "Correção"
      : pick(["Alteração de Prêmio", "Alteração de Cobertura", "Alteração de Vigência", "Cancelamento", "Correção"] as const);
    const delta = type === "Alteração de Prêmio" ? Math.round(between(-450, 800)) : 0;
    currentPremium += delta;
    const failed = rng() > 0.78;
    out.push({
      id: `end-${seed}-${i}`,
      number: String(i).padStart(6, "0"),
      date: new Date(2024, 0, 1 + i * intBetween(8, 35)).toISOString(),
      type,
      description:
        type === "Cancelamento"
          ? "Cancelamento do endosso anterior por solicitação do segurado"
          : type === "Alteração de Cobertura"
            ? "Inclusão de cobertura de Doenças Graves"
            : type === "Alteração de Vigência"
              ? "Prorrogação de vigência por 90 dias"
              : type === "Alteração de Prêmio"
                ? `Reajuste de prêmio ${delta >= 0 ? "+" : ""}${delta.toLocaleString("pt-BR")}`
                : "Correção cadastral do segurado",
      premiumDelta: delta,
      newPremium: currentPremium,
      status: failed ? "REPROVADA" : "APROVADA",
      severity: failed ? pick(["high", "medium", "low"] as const) : undefined,
    });
  }
  return out;
}

function makeFindings(approved: boolean): AuditFinding[] {
  if (approved) return [];
  const n = intBetween(1, 4);
  const out: AuditFinding[] = [];
  const used = new Set<AuditRule>();
  while (out.length < n) {
    const rule = pick(AUDIT_RULES);
    if (used.has(rule)) continue;
    used.add(rule);
    out.push({
      rule,
      result: "REPROVADA",
      severity: pick(["critical", "high", "medium", "low"] as const),
      description: `Inconsistência detectada na regra "${rule}" durante a execução automatizada da auditoria.`,
      impact: `Exposição financeira potencial de R$ ${(between(2500, 180000)).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}, com risco regulatório associado.`,
      recommendation: "Encaminhar para revisão manual da equipe de Operações e validação com o corretor responsável.",
    });
  }
  return out;
}

export const POLICIES: Policy[] = Array.from({ length: 84 }, (_, i) => {
  const broker = pick(BROKERS);
  const approved = rng() > 0.34;
  const endorsements = makeEndorsements(i);
  const premium = endorsements[endorsements.length - 1].newPremium;
  return {
    id: `pol-${i}`,
    number: `OLE-${String(2400000 + i).padStart(8, "0")}`,
    status: rng() > 0.92 ? "cancelada" : rng() > 0.94 ? "suspensa" : rng() > 0.85 ? "renovada" : "ativa",
    audit: approved ? "APROVADA" : "REPROVADA",
    product: pick(PRODUCTS),
    broker: broker.name,
    brokerCode: broker.code,
    insured: pick(INSURED_NAMES),
    startDate: "2024-01-15",
    endDate: "2025-01-14",
    premium,
    exposure: Math.round(between(120_000, 4_800_000)),
    coverages: makeCoverages(),
    endorsements,
    findings: makeFindings(approved),
    hasGap: !approved && rng() > 0.6,
    updatedAt: new Date(Date.now() - intBetween(60_000, 86_400_000 * 14)).toISOString(),
  };
});

export const ALERTS: Alert[] = POLICIES.flatMap((p) =>
  p.findings.map((f, idx) => ({
    id: `alt-${p.id}-${idx}`,
    severity: f.severity,
    rule: f.rule,
    policyNumber: p.number,
    product: p.product,
    broker: p.broker,
    impact: Math.round(between(5000, 220_000)),
    createdAt: new Date(Date.now() - intBetween(60_000, 86_400_000 * 7)).toISOString(),
    status: (rng() > 0.7 ? "investigating" : rng() > 0.5 ? "open" : "resolved") as AlertStatus,
    title: f.rule,
    description: f.description,
  })),
).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

// Time series for charts
export const HOURLY_THROUGHPUT = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, "0")}h`,
  processed: Math.round(between(120, 880)),
  failed: Math.round(between(3, 42)),
}));

export const WEEKLY_TREND = Array.from({ length: 12 }, (_, i) => ({
  week: `S${i + 1}`,
  approved: Math.round(between(620, 980)),
  rejected: Math.round(between(60, 220)),
  premium: Math.round(between(800_000, 1_800_000)),
}));

export const HEATMAP_DATA: { rule: AuditRule; weeks: number[] }[] = AUDIT_RULES.map((rule) => ({
  rule,
  weeks: Array.from({ length: 12 }, () => Math.round(between(0, 48))),
}));

// KPIs (computed from policies)
export function computeKpis() {
  const total = POLICIES.length;
  const approved = POLICIES.filter((p) => p.audit === "APROVADA").length;
  const rejected = total - approved;
  const activeAlerts = ALERTS.filter((a) => a.status !== "resolved").length;
  const exposure = POLICIES.reduce((s, p) => s + p.exposure, 0);
  const totalPremium = POLICIES.reduce((s, p) => s + p.premium, 0);
  return {
    audited: total,
    approved,
    rejected,
    approvedRate: (approved / total) * 100,
    activeAlerts,
    operationalRisk: Math.round((rejected / total) * 100),
    exposure,
    totalPremium,
    productivity: 96.4,
  };
}

export const RECENT_ACTIVITIES = [
  { id: 1, type: "audit", text: "847 apólices auditadas no último ciclo", time: "há 2 min", severity: "info" as const },
  { id: 2, type: "alert", text: "Alerta crítico em OLE-02400031 (Gap de Vigência)", time: "há 8 min", severity: "critical" as const },
  { id: 3, type: "sync", text: "Sincronização com motor concluída", time: "há 12 min", severity: "low" as const },
  { id: 4, type: "alert", text: "Duplicidade de endosso detectada — BRK-0078", time: "há 21 min", severity: "high" as const },
  { id: 5, type: "audit", text: "Renovação OLE-02400012 aprovada automaticamente", time: "há 34 min", severity: "low" as const },
];
