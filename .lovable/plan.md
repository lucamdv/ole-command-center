# Auditoria de Emissão — Replicação do fluxo n8n na plataforma

Objetivo: substituir o n8n por uma execução nativa dentro do OLÉ COPILOT. Um botão **"Rodar auditoria"** na tela de Visão Geral dispara o pipeline completo contra a API Excelsior, mostra progresso em tempo real e renderiza os resultados (aprovados / reprovados + detalhamento por apólice). A parte do Notion é ignorada.

---

## Arquitetura

O pipeline roda no servidor (TanStack Start `createServerFn`) porque envolve credenciais sensíveis, chamadas cross-origin para a API Excelsior e centenas de requests encadeados. O frontend apenas dispara, recebe progresso via polling e renderiza.

```text
[Botão Visão Geral]
       │
       ▼
runAudit (createServerFn, POST)
       │
       ├── 1. Autenticação  → POST /v1/login                       → token
       ├── 2. Lista docs    → GET  /backoffice/ro/emissao?sistema=1009
       ├── 3. Filtra        → numero_documento termina em "000000"
       ├── 4. Por apólice   → GET  /backoffice/ro/contratos/{nro}   → ultimo_endosso
       ├── 5. Por endosso   → POST /backoffice/ro/emissao/{doc}     → JSON do endosso
       └── 6. Auditoria     → regras JS (porta direta do n8n)
                              │
                              ▼
                        AuditReport { aprovados, reprovados, apolices[] }
```

A execução é stateful: criamos um `AuditRun` em memória no servidor com `runId`, status (`running` / `done` / `error`), progresso (apólices processadas / total) e o relatório final. O cliente cria a run e faz polling de status até `done`, depois renderiza.

---

## Credenciais

A API Excelsior exige usuário/senha. Esses valores **não ficam no código** — são salvos como secrets do projeto:

- `EXCELSIOR_USERNAME`
- `EXCELSIOR_PASSWORD`

Vou solicitá-los via `secrets--add_secret` no início da fase de build. Pré-preencho com os valores do JSON anexado como sugestão, mas o usuário confirma/edita no formulário seguro.

---

## Implementação (técnico)

### Backend — server functions

`src/lib/audit/excelsior.server.ts`
- `authenticate()` → POST login, retorna `token` com cache em memória (TTL ~50 min).
- `listPolicies(token)` → GET emissão lista; filtra `numero_documento` que termina em `000000`.
- `getLastEndorsement(token, numeroApolice)` → GET contrato.
- `getEndorsement(token, numeroDocumento)` → POST emissão por documento.
- Helpers de retry/timeout (3 tentativas, backoff exponencial), concorrência limitada (`p-limit` style, 6 paralelos).

`src/lib/audit/rules.ts` (porta literal do JS do n8n)
- `auditPolicy(rawEndorsements[]): PolicyAuditResult`
- Regras implementadas: DUPLICIDADE DE VIGÊNCIA, GAP DE DIA, VARIAÇÃO DE PRÊMIO, TAXA DE ADMINISTRAÇÃO (35%), DISTRIBUIÇÃO (20%), MARGEM DE SERVIÇO (5%), MARGEM ADICIONAL (0%), PRÊMIO DIRETO (saldo), LIMITE DE COBERTURA (MORTE 100k–500k), PRÊMIO FORA DO PADRÃO (USD 20–700), COBERTURA INATIVA.
- Mesma lógica de filtro de endossos C (cancelamento) e exceções hardcoded.

`src/lib/audit/runner.ts`
- `startAuditRun()` cria run, dispara pipeline em background, retorna `runId`.
- `getAuditRun(runId)` retorna estado atual (progresso + relatório parcial/final).
- Store em memória (`Map<runId, AuditRun>`).

`src/lib/audit/audit.functions.ts`
- `startAudit` (POST) → retorna `{ runId }`.
- `getAuditStatus` (GET com `runId`) → retorna `{ status, progress, report? }`.

### Frontend

`src/components/audit/run-audit-button.tsx`
- Botão "Rodar auditoria" no header da Visão Geral (substitui "Forçar sincronização").
- Ao clicar: chama `startAudit`, abre um **drawer** lateral com:
  - Barra de progresso (`X/Y apólices processadas`).
  - Resumo ao vivo: ✅ aprovadas / 🚨 reprovadas.
  - Lista de apólices reprovadas com erros agrupados por tipo, severidade colorida (erro=destructive, alerta=warning).
- Polling a cada 1.5s via `useQuery` com `refetchInterval` até `status === 'done'`.
- Toast ao concluir.

`src/components/audit/audit-report.tsx`
- Renderização do relatório: cards de KPI (total, aprovadas, reprovadas, erros totais), tabela expansível por apólice, badge de severidade por achado.

### Integração com a Visão Geral
- Substituo o botão decorativo "Forçar sincronização" pelo novo `RunAuditButton`.
- Após a primeira run bem-sucedida, os KPIs reais do relatório (apólices auditadas, aprovadas, reprovadas) sobrescrevem os mocks da Visão Geral via um pequeno store (`useLastAuditReport` em `localStorage` + Zustand-lite com `useSyncExternalStore`).

### Tratamento de erros
- Falha de auth → toast "Credenciais inválidas — verifique EXCELSIOR_USERNAME/PASSWORD".
- 429/5xx em chamada de endosso → retry; se exaurir, apólice marcada com `status: "ERRO_LEITURA"` e segue o pipeline.
- A run nunca derruba a UI; erros aparecem no drawer.

---

## Escopo

**Incluído**
- Botão na Visão Geral, drawer com progresso, relatório completo.
- Pipeline real contra API Excelsior, idêntico em regras ao n8n.
- Secrets `EXCELSIOR_USERNAME` / `EXCELSIOR_PASSWORD`.

**Fora**
- Persistência das runs (fica em memória — próximo passo seria Lovable Cloud).
- Notion (explicitamente ignorado).
- Schedule diário (n8n usa cron 23h; aqui é on-demand).
