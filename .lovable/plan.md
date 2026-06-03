## Objetivo

Ligar a página de **Apólices** ao MOTOR OLÉ (n8n) seguindo o mesmo padrão da auditoria: serverFn dispara o webhook → n8n processa apólices + endossos → callback persiste no backend → UI lê do banco. Endossos deixam de ter aba própria (vira só um redirect) e passam a viver dentro da apólice (`/apolices/$id/endossos/$num`).

## Contrato do MOTOR OLÉ (do JSON anexado)

O fluxo recebe `POST { callback_url }` e devolve no callback:

```json
{
  "origem": "MOTOR OLÉ",
  "total_apolices": 42,
  "dados": [
    {
      "numero_apolice_seguradora": "...",
      "numero_endosso_seguradora": "...",
      "premio_liquido": 0,
      "proposta": { /* objeto da apólice — schema assumido fixo, com fallback */ },
      "historico_endossos": [
        { "numero_apolice_seguradora": "...", "numero_endosso_seguradora": "...", "premio_liquido": 0, "proposta": {...} }
      ]
    }
  ]
}
```

## Backend (Lovable Cloud)

### Migration — 3 tabelas + 1 enum de status de sync

- `policy_sync_runs` — `id`, `created_at`, `status` (`pending|success|error`), `total_apolices`, `duration_ms`, `error_message`, `raw` (jsonb do payload bruto)
- `policies` — `id` (uuid), `numero_apolice` (text, unique), `numero_endosso_atual` (text), `premio_liquido` (numeric), `proposta` (jsonb), `last_sync_run_id`, `updated_at`, `created_at`. Index em `numero_apolice`.
- `endorsements` — `id`, `policy_id` (fk), `numero_endosso` (text), `numero_apolice` (text), `premio_liquido` (numeric), `proposta` (jsonb), `ordem` (int), `created_at`. Unique `(policy_id, numero_endosso)`.

RLS pública de leitura (igual ao padrão atual de `audit_runs`/`audit_findings`); writes só via `service_role`. GRANTs explícitos `SELECT` para `anon`/`authenticated`, `ALL` para `service_role`.

### Server functions (`src/lib/policies.functions.ts`)

- `runPolicySync()` — cria `policy_sync_runs` pending, faz `POST` ao `N8N_MOTOR_POLICIES_URL` com `{ callback_url, runId }`, retorna `runId`.
- `getPolicySyncStatus({ runId })` — polling pelo status.
- `getPolicies()` — lista resumida (numero, premio, qtd endossos, updated_at).
- `getPolicyByNumero({ numero })` — apólice + endossos ordenados.
- `getEndorsement({ numero, endosso })` — payload completo de um endosso.

### Callback público (`src/routes/api/public/policy-sync-callback.ts`)

Recebe o payload final, valida header `x-callback-secret` (reaproveita `AUDIT_CALLBACK_SECRET` ou cria `POLICY_CALLBACK_SECRET` — uso o mesmo já existente pra não pedir secret novo), faz upsert em `policies` + replace dos `endorsements` da apólice, atualiza `policy_sync_runs` para `success`.

### Cron de sincronização automática

`/api/public/hooks/policy-sync` (POST) chama `runPolicySync` via serverFn equivalente server-side. Agendado via `pg_cron` + `pg_net` (1× por hora — ajustável). SQL com `apikey` anon, sem secret novo.

### Secret necessário

- `N8N_MOTOR_POLICIES_URL` — URL do webhook do fluxo no n8n (você cola após aprovar). Se não estiver pronta, mantenho TODO e o botão exibe erro amigável (mesmo padrão da auditoria).

## Frontend

### Hooks (`src/hooks/use-policies.ts`)

`usePolicies()`, `usePolicy(numero)`, `useEndorsement(numero, endosso)`, `useRunPolicySync()` (polling igual `useRunAudit`).

### Página `/apolices` (substitui mock)

- Cabeçalho com botão **"Sincronizar carteira"** (estado loading/última sync).
- Tabela alimentada por `usePolicies()`: numero, prêmio líquido, qtd endossos, última atualização.
- Busca por número.
- Empty state quando ainda não houve sync.

### Página `/apolices/$id` (refatorada)

`$id` = `numero_apolice_seguradora`. Carrega `usePolicy(id)`.

- **Header**: número, prêmio, qtd endossos, último sync.
- **Card "Dados da apólice"**: renderiza `proposta` da apólice. **Schema fixo presumido** (segurado, vigência, corretor, produto, coberturas) — para cada campo conhecido, render dedicado.
- **Fallback Plano B**: componente `<JsonExplorer data={proposta} />` que mostra os campos não-mapeados em árvore colapsável (key→value, com badge "extra"). Garante que nada se perde se o schema variar.
- **Lista de endossos** (`historico_endossos`): tabela com `numero_endosso`, prêmio, link → `/apolices/$id/endossos/$num`.

### Página filha `/apolices/$id/endossos/$num`

Mesma estrutura: campos conhecidos renderizados + `<JsonExplorer>` para o resto. Breadcrumb voltando para a apólice.

### Aba **Endossos** (sidebar)

Mantida no menu. A rota `/endossos` vira uma página **informativa**: card explicando "Endossos agora vivem dentro de cada apólice" + botão "Ir para Apólices". Sem mock data.

### Limpeza

- Remover `POLICIES` mock de `src/lib/mock/data.ts` (ou manter só para `/alertas` / `/analytics` enquanto não migram — a definir nas próximas iterações). Para esta entrega: manter o arquivo mock, mas `/apolices` deixa de importá-lo.
- `ValidityTimeline`, `EndorsementTimeline`, `AuditTable` da página antiga ficam para reuso futuro; o detalhe da apólice é reescrito do zero baseado nos campos reais.

## Fora de escopo

- `/`, `/alertas`, `/analytics`, `/operacao`, `/configuracoes`, `/intelligence`, `/ferramentas` — não alterados.
- Lógica de auditoria — intocada.
- Schema "final" do `proposta` — começamos com mapeamento provável (segurado/vigência/corretor/produto/coberturas) + fallback JsonExplorer. Após primeiro sync real, refinamos com o payload de verdade.

## Detalhes técnicos

- Server fns usam `supabaseAdmin` (sem auth) — leitura pública via RLS, igual auditoria.
- Callback é idempotente: `delete from endorsements where policy_id = X` + `insert` em bloco.
- Polling do botão: 3s, timeout 15min (mesmo `useRunAudit`).
- Cron: `0 * * * *` (hora cheia), configurável.
- Após criar a migration e a infra, peço o secret `N8N_MOTOR_POLICIES_URL`.
