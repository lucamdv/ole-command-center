# Extrator de Últimos Endossos

Nova ferramenta em `/ferramentas/extrator-endossos`: um botão dispara um fluxo novo no n8n, o resultado volta por callback e é exibido em tabela com exportação CSV/PDF. Exceções próprias da ferramenta (independentes das exceções de auditoria).

## Como vai funcionar

1. Botão "Extrair últimos endossos" cria uma execução (status "em andamento") e chama o webhook do n8n enviando `run_id`, `callback_url` e a lista de apólices em exceção (para o n8n já ignorá-las).
2. A tela faz polling e mostra progresso; quando o n8n devolve o resultado, a tabela aparece.
3. Tabela com colunas **PolicyNumber** e **last_sequencial_endosso_used**, com busca, ordenação e contador de linhas.
4. Botões **Exportar CSV** e **Exportar PDF**.
5. Aba de exceções própria: adicionar apólice (com motivo opcional), editar motivo, remover. Apólices em exceção não aparecem na tabela nem nas exportações e não são enviadas ao n8n.
6. Gerenciar exceções é restrito a administradores; demais usuários visualizam a extração normalmente.

Também haverá uma opção para ignorar uma apólice direto da linha da tabela (visível só para admin), que cria a exceção.

## Detalhes técnicos

Banco (nova migração):
- `endorsement_extraction_runs`: status, contadores, `error_message`, `raw`, timestamps. Sem acesso direto pela API (leitura via server functions com service role, seguindo o padrão de `audit_runs`).
- `endorsement_extraction_items`: `run_id`, `policy_number`, `last_sequencial_endosso_used`.
- `endorsement_exceptions`: `policy_number`, `motivo`, `created_by`; RLS — leitura para autenticados, escrita/edição/remoção só para admin. Tabela **separada** de `audit_ignores`.

Backend:
- `src/lib/endorsement-extraction.functions.ts`: `runEndorsementExtraction` (dispara webhook, cria run), `getExtractionStatus`, `getLatestExtraction` (filtra exceções em runtime), `listExtractionExceptions`, `addExtractionException`, `updateExtractionException`, `removeExtractionException` (as três últimas com `assertAdmin`).
- Rota pública `src/routes/api/public/endorsement-extraction-callback.ts`, protegida por shared-secret em header, aceitando payload `[{ PolicyNumber, last_sequencial_endosso_used }]` (tolerante a variações de caixa e a envelope `{ payload: [...] }` como no callback de auditoria).
- Novos secrets: `N8N_ENDORSEMENT_WEBHOOK_URL` e `ENDORSEMENT_CALLBACK_SECRET`. A URL do webhook será solicitada a você; o secret de callback é gerado automaticamente e deve ser colado no header do fluxo n8n.

Frontend:
- `src/routes/_authenticated/ferramentas.extrator-endossos.tsx` + componentes em `src/components/extrator/` (botão de execução, tabela, diálogo de exceções).
- Hook `src/hooks/use-endorsement-extraction.ts` (TanStack Query + polling, no mesmo padrão de `use-audit`).
- Export CSV local (Blob) e PDF via `jspdf` + `jspdf-autotable`, já usados no projeto.
- Card novo na página `/ferramentas` linkando a ferramenta.

## O que preciso de você

A URL do webhook de produção do novo fluxo n8n (`https://.../webhook/...`) para salvar como secret.
