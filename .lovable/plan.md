## Objetivo

Substituir o mock atual por dados reais vindos da auditoria do n8n. Um botão "Rodar Auditoria" na tela inicial dispara o webhook, persiste o resultado no Lovable Cloud, e TODOS os KPIs/telas passam a ser derivados da última run (com histórico para análise temporal).

## Contrato do webhook (extraído do JSON)

- **Endpoint**: `POST https://nuvembot.app.n8n.cloud/webhook-test/c80c897f-9951-43c8-9976-df81c44bce16`
- **Body de entrada**: vazio (`{}`)
- **Resposta**:
```json
{
  "data_auditoria": "2026-06-02T...",
  "resumo": { "aprovados": 0, "reprovados": 0, "total_processado": 0 },
  "status_geral": "SUCESSO" | "ALERTA",
  "mensagem_geral": "...",
  "apolices_com_erro": [
    {
      "apolice": "056902026000213910007891000000",
      "total_erros": 2,
      "erros": [ { "tipo_erro": "DUPLICIDADE DE VIGÊNCIA", "endosso": "...", "dataInicio": "...", "dataFim": "...", ... } ]
    }
  ]
}
```

Tipos de erro identificados no nó `Auditoria de Vigência`: `DUPLICIDADE DE VIGÊNCIA`, `GAP DE VIGÊNCIA`, e variantes derivadas dos motivos de endosso (FATURA, etc.). O front mapeia dinamicamente — qualquer `tipo_erro` novo aparece automaticamente.

## Arquitetura

### 1. Lovable Cloud (habilitar)

Duas tabelas:

- `audit_runs`
  - `id uuid pk`, `created_at timestamptz`, `data_auditoria timestamptz`
  - `status_geral text`, `mensagem_geral text`
  - `total_processado int`, `aprovados int`, `reprovados int`
  - `duration_ms int`, `raw jsonb` (payload completo)
- `audit_findings`
  - `id uuid pk`, `run_id uuid fk -> audit_runs`, `apolice text`, `tipo_erro text`
  - `endosso text`, `data_inicio date null`, `data_fim date null`
  - `detalhes jsonb` (objeto erro original)
  - índices: `(run_id)`, `(tipo_erro)`, `(apolice)`

RLS: leitura pública (sem auth no escopo atual), inserts apenas via server function com `supabaseAdmin`. GRANTs explícitos para `anon`/`authenticated`.

### 2. Server function (proxy + persistência)

`src/lib/audit.functions.ts`:

- `runAudit()` — `createServerFn POST`:
  1. `fetch` do webhook n8n (URL em `N8N_AUDIT_WEBHOOK_URL` via secret), timeout 120s
  2. valida payload com Zod
  3. insere `audit_runs` + `audit_findings` em batch via `supabaseAdmin`
  4. retorna `{ runId, summary }`
- `getLatestRun()` — última run + findings (para boot da plataforma)
- `getRunHistory(limit)` — runs anteriores (para sparklines temporais)

### 3. Camada de dados no front

Novo módulo `src/lib/audit/derive.ts` que recebe `{ run, findings, history }` e produz:

- **KPIs**: `audited`, `approved`, `rejected`, `approvedRate`, `activeAlerts` (= findings da última run), `operationalRisk` (reprovados/total), `topRule`, `mttr` (entre runs)
- **Pulso operacional**: throughput por run (histórico), distribuição por `tipo_erro`
- **Heatmap**: `tipo_erro` × últimas N runs (substitui rules×weeks mockado)
- **Tabela de apólices**: lista de `apolices_com_erro` da última run
- **Timeline de endossos**: por apólice, derivada do array `erros[].endosso`
- **Alertas**: 1 alerta por finding

Hooks via TanStack Query:
- `useLatestAudit()` → `queryKey: ["audit","latest"]`
- `useAuditHistory()` → `queryKey: ["audit","history"]`
- `useRunAudit()` → `useMutation` que chama `runAudit` e invalida ambas

### 4. UI

**Header da tela inicial** (`src/routes/index.tsx`):

- Substituir botão "Forçar sincronização" por **`<RunAuditButton />`** primário, com:
  - estados: idle / running (spinner + cronômetro ao vivo + "Auditando carteira…") / success (toast + pulse verde) / error (toast destrutivo + retry)
  - desabilitado durante execução
  - atalho ⌘⇧A
  - tooltip mostra data da última run
- Faixa de status passa a ler `data_auditoria` da última run real

**Estado vazio** (nenhuma run ainda):
- Hero centralizado com ícone, "Nenhuma auditoria executada", CTA grande "Rodar primeira auditoria"
- Esconde KPIs/heatmap até existir run

**Todas as rotas** (`/operacao`, `/apolices`, `/alertas`, `/analytics`, `/intelligence`) passam a consumir os derivadores. Remover `src/lib/mock/data.ts` da árvore de imports (manter o arquivo só como fallback de design caso `history.length === 0`, ou deletar).

### 5. Secret e configuração

- Secret runtime: `N8N_AUDIT_WEBHOOK_URL` = `https://nuvembot.app.n8n.cloud/webhook-test/c80c897f-9951-43c8-9976-df81c44bce16`
- Lido apenas dentro do `.handler()` do `runAudit`
- ⚠️ Observação: a URL fornecida é `/webhook-test/...`, que no n8n só responde enquanto o workflow está em modo "Listen for test event". Para produção contínua, o usuário precisará ativar o workflow e trocar para `/webhook/...` — vou deixar isso explícito na UI (toast informativo se receber 404) e a troca do secret é 1 clique em Settings.

## Detalhes técnicos

- Timeout: webhook pode demorar (loop sobre apólices + chamadas HTTP encadeadas). Uso de `AbortSignal.timeout(180_000)` no fetch da server function.
- Persistência idempotente: cada run é um novo registro (não dedup por `data_auditoria`).
- Boot: `__root` faz `ensureQueryData` da última run; se `null`, mostra empty-state global.
- Tipos compartilhados em `src/lib/audit/types.ts` (espelham o payload do n8n).
- Sem auth ainda; tudo lê via `anon` com `SELECT` policy aberta nas duas tabelas.

## Arquivos

**Criar**
- migração SQL (tabelas + RLS + GRANTs)
- `src/lib/audit/types.ts`
- `src/lib/audit/derive.ts`
- `src/lib/audit.functions.ts`
- `src/hooks/use-audit.ts`
- `src/components/audit/run-audit-button.tsx`
- `src/components/audit/empty-state.tsx`

**Editar**
- `src/routes/index.tsx` (botão + empty-state + KPIs a partir do derive)
- `src/routes/operacao.tsx`, `apolices.tsx`, `apolices.$id.tsx`, `alertas.tsx`, `analytics.tsx`, `intelligence.tsx`
- `src/components/pulso/pulso-operacional.tsx`, `heatmap/risk-heatmap.tsx`, `timeline/endorsement-timeline.tsx`, `audit/audit-table.tsx`, `kpi/kpi-card.tsx`, `layout/status-bar.tsx`, `layout/command-palette.tsx`
- registrar `N8N_AUDIT_WEBHOOK_URL` como secret

**Manter como fallback visual** (ou remover)
- `src/lib/mock/data.ts`

## Fora do escopo desta entrega

- Auth/usuários
- Agendamento automático de auditorias (cron)
- OLÉ Intelligence chamando LLM real (continua mock até pedido)
- Export de relatório PDF/CSV
