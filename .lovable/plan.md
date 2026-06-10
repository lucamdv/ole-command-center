# Plano: Oléver com inteligência profunda

Evolução do copiloto em 4 frentes, todas no arquivo `src/routes/api/oliver-chat.ts` (+ um helper de embeddings e uma migration para RAG).

## 1. Modelo mais forte + raciocínio profundo

- Trocar o modelo padrão para `google/gemini-3.1-pro-preview`.
- Manter `stepCountIs(50)` (já configurado), suficiente para investigação multi-tool.
- Ajustar o prompt para encorajar **cadeias de ferramentas** (consultar → cruzar → concluir) antes de responder.

## 2. Conhecimento estrutural da plataforma (system prompt)

Embutir no `buildSystemPrompt` um **mapa enxuto** de:

- **Rotas** principais (Dashboard `/`, Apólices, Endossos, Operação, Alertas, Auditoria, Analytics, Ferramentas, Intelligence, Configurações com abas Perfil/Integrações/Dados/Notificações/Exceções).
- **Schemas** das tabelas (`policies`, `endorsements`, `audit_runs`, `audit_findings`, `audit_ignores`, `policy_sync_runs`, `oliver_*`) com colunas-chave e relacionamentos.
- **Fluxos**:
  - Sync de apólices: hook `policy-sync` → n8n → callback `/api/public/policy-sync-callback`.
  - Auditoria: `runAudit` → n8n webhook (`N8N_AUDIT_WEBHOOK_URL`) → callback `/api/public/audit-callback` (assinado por `AUDIT_CALLBACK_SECRET`).
  - Exceções de auditoria (`audit_ignores`): filtram findings por usuário (escopo apólice ou tipo_erro+apólice).
  - Repasse: regras em `src/lib/analytics/repasse-rules.ts` (faixas % sobre prêmio bruto).
  - Códigos Excelsior: dicionário em `src/lib/excelsior/codes.ts`.
- **Glossário OLÉ**: endosso A/B/C/D, prêmio direto, vigência, finding, etc.
- **Regras de ouro de resposta** revistas: sempre nomear a rota onde o usuário pode agir ("vá em Configurações → Exceções"), citar números só após chamar tool, propor próxima ação.

## 3. Mais ferramentas (cobertura ampla de dados)

Adicionar ao objeto `tools` em `oliver-chat.ts`:

- `getRepasseByMonth` — série mensal de repasse (usa `getAnalyticsAggregates().repasseByMonth`).
- `getTopPoliciesByPremium` — ranking por prêmio direto (USD/BRL).
- `getEndorsementBreakdown` — distribuição de endossos por tipo (A/B/C/D) global ou por apólice.
- `getAuditRunHistory` — últimos N runs com status, duração, taxa de aprovação, delta vs run anterior.
- `getAuditRunDetail` — detalhe de 1 run (findings agrupados por tipo, top apólices afetadas).
- `getPolicySyncHealth` — últimos `policy_sync_runs` (status, duração, total).
- `listAuditIgnoresGlobal` — exceções ativas (resumo agregado, sem PII).
- `getSystemHealth` — wrapper de `getSystemStatus` (n8n integrations, secrets).
- `getNotifications` — lê notificações servidor (alertas críticos/altos abertos).
- `lookupExcelsiorCode` — traduz código Excelsior via `translateExcelsior`.
- `explainRepasseFor` — dado um valor, devolve breakdown via `computeRepasse`.
- `searchKnowledge` — **RAG**: busca semântica sobre apólices + findings + memória (ver §4).

Todas as tools mantêm o padrão `inputSchema` Zod estrito e retornos compactos.

## 4. Memória semântica / RAG

Indexa conteúdo da operação em pgvector para o Oléver achar "agulha no palheiro".

### Migration

Tabela nova `public.oliver_knowledge`:

```text
id uuid pk
kind text  -- 'policy' | 'finding' | 'memory' | 'audit_run'
ref_id text  -- numero_apolice, finding.id, etc
title text
content text
embedding vector(3072)
metadata jsonb
updated_at timestamptz
```

- `CREATE EXTENSION IF NOT EXISTS vector;`
- Índice HNSW cosine.
- GRANTs: somente `service_role` (RAG só roda server-side).
- RLS habilitada com policy negando acesso direto (apenas server lê via supabaseAdmin).
- Função SQL `match_oliver_knowledge(query_embedding, match_count, kind_filter)`.

### Helper de embeddings (`src/lib/oliver-rag.server.ts`)

- `embedText(text)` — chama `https://ai.gateway.lovable.dev/v1/embeddings` com `google/gemini-embedding-001`.
- `indexPolicy(numero_apolice)` — extrai campos relevantes do JSON `proposta` + endossos, gera chunks, faz upsert.
- `indexFinding(id)` — texto = tipo_erro + apolice + detalhes + datas.
- `indexMemoryDoc()` — chunks da `oliver_memory.content`.
- `reindexAll()` — varredura completa.

### Tool nova `searchKnowledge`

Recebe `query` + `kind?` + `limit?`, embeda a query, chama `match_oliver_knowledge`, retorna top N com `similarity`, `title`, `content`, `metadata`.

### Indexação contínua

- Adicionar `indexPolicy` ao final do callback de sync (`/api/public/policy-sync-callback`) para novas apólices.
- Adicionar `indexFinding` ao final do callback de auditoria (`/api/public/audit-callback`) para novos findings.
- Adicionar `indexMemoryDoc()` ao final de `replaceMemory` e da tool `appendToMemory`.
- Nova server fn `reindexOliverKnowledge` exposta na aba **Configurações → Dados** com botão "Reindexar Oléver" (rodar manualmente para o histórico).

## 5. Resposta a erros 402/429 do gateway

- No catch do `streamText`, devolver mensagem clara ("créditos esgotados" / "limite de uso atingido") para o usuário, em vez de falhar silenciosamente.

## Arquivos afetados

- **modify** `src/routes/api/oliver-chat.ts` (modelo, prompt, +12 tools, erro handling).
- **create** `src/lib/oliver-rag.server.ts` (embed + index + match).
- **create** `supabase/migrations/<ts>_oliver_knowledge.sql` (tabela + extensão + função + grants + RLS).
- **modify** `src/routes/api/public/policy-sync-callback.ts` (index ao final).
- **modify** `src/routes/api/public/audit-callback.ts` (index ao final).
- **modify** `src/lib/oliver.functions.ts` (`replaceMemory` reindexa; export `reindexOliverKnowledge`).
- **modify** `src/components/settings/dados-tab.tsx` (botão "Reindexar Oléver").

## Observações técnicas

- Embeddings rodam só server-side com `LOVABLE_API_KEY` (já presente). Custo: ~$0,15/M tokens, baixo para o volume atual.
- Vector(3072) bate com o default do `gemini-embedding-001`.
- A indexação no callback é "best effort" (try/catch silencioso) — não bloqueia o callback se a embedding API falhar.
- Visão global de leitura mantida (supabaseAdmin), conforme decidido.

## Riscos / fora do escopo

- Não substituo o histórico de mensagens por RAG — o `useChat` segue passando o histórico completo da thread.
- Não toco no UI do chat (`src/routes/_authenticated/intelligence.tsx`) — só adiciono botão em Configurações → Dados.
- Reindexação inicial do histórico exige clique manual (botão); não roda automaticamente para evitar travar o build.
