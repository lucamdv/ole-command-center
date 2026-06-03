# Oléver — Assistente de IA da operação OLÉ

Substituir a tela mock atual de `/intelligence` por um chat funcional estilo ChatGPT, com threads persistentes, ferramentas de leitura da base, capacidades preditivas e um arquivo de memória markdown global.

## 1. Backend (Lovable Cloud + Lovable AI Gateway)

### 1.1 Tabelas novas (migration única)

- `oliver_threads` — `id uuid pk`, `title text`, `created_at`, `updated_at`. RLS pública (read/insert/update/delete) já que a app não tem auth.
- `oliver_messages` — `id uuid pk`, `thread_id uuid fk`, `role text` (`user|assistant|system`), `parts jsonb` (UIMessage parts da AI SDK), `created_at`. Ordenada por `created_at`.
- `oliver_memory` — single-row (id fixo), `content text` (markdown), `updated_at`. Tudo o que o Oléver "aprende" vai aqui.

GRANTs + RLS conforme padrão Lovable Cloud. Trigger `touch_updated_at` em threads e memory.

### 1.2 Server functions (`src/lib/oliver.functions.ts`)

- `listThreads()` / `createThread(title?)` / `renameThread({id,title})` / `deleteThread({id})`
- `loadThreadMessages({threadId})` → UIMessage[]
- `loadMemory()` / `appendMemory({markdown})` / `replaceMemory({markdown})`

### 1.3 Rota de streaming (`src/routes/api/oliver-chat.ts`)

Server route POST `/api/oliver-chat`:
- Recebe `{ threadId, messages: UIMessage[] }`.
- Carrega memória + system prompt do Oléver (identidade, tom em PT-BR, contexto de seguradora OLÉ, regras de uso das tools, hábito de salvar aprendizados).
- Usa AI SDK `streamText` com Lovable AI Gateway (modelo padrão `google/gemini-3-flash-preview`), `stopWhen: stepCountIs(50)`.
- Tools (todas read-only sobre a base atual, exceto a de memória):
  - `getOperationOverview` — KPIs agregados (apólices, runs, % aprovação, prêmio total).
  - `queryAuditFindings({ tipoErro?, apolice?, dataInicio?, dataFim?, limit? })`.
  - `queryPolicies({ search?, tipo?, limit? })` — busca textual + filtros sobre `policies.proposta`.
  - `getPolicyDetail({ numeroApolice })` — retorna apólice + endossos.
  - `getIssuancesByMonth()` / `getRunsTimeline()` — séries históricas (reusa lógica de `analytics.functions`).
  - `detectErrorTrends()` — compara últimos 3 meses por `tipo_erro` (↑/↓ em pontos %).
  - `forecastNextMonth()` — projeção linear simples (prêmio líquido + nº findings) sobre a série mensal.
  - `scoreRiskyPolicies({ limit })` — score por apólice = freq. histórica de findings do `tipo_erro` × idade × volume de endossos; retorna top N.
  - `appendToMemory({ markdown })` — Oléver chama essa ferramenta para registrar aprendizados/decisões/preferências do usuário no `oliver_memory`. Sem confirmação (operação aditiva, segura).
- Retorna `toUIMessageStreamResponse({ originalMessages, onFinish })` salvando user msg + assistant msg em `oliver_messages` no `onFinish`.

### 1.4 System prompt do Oléver

Identidade: "Oléver, copiloto da operação de seguros OLÉ". Sempre em PT-BR. Conhece schemas (apolices, endossos com `endosso_A/B/C/D`, audit_findings). Diagnostica causa raiz, sugere melhorias acionáveis. Chama as tools antes de afirmar números. Anexa à memória qualquer regra de negócio, terminologia OLÉ, preferências do usuário e padrões recorrentes que descobrir.

## 2. Frontend (`src/routes/intelligence.tsx` + componentes)

Instalar AI Elements (`bunx ai-elements@latest add conversation message prompt-input shimmer tool`).

Layout estilo ChatGPT, dentro do shell atual do app:

```
┌──────────────┬────────────────────────────────────┐
│ Threads      │ Header (título thread + ações)     │
│ + Nova       ├────────────────────────────────────┤
│ • Thread A   │                                    │
│ • Thread B   │   Conversation (AI Elements)       │
│ • Thread C   │   - mensagens user/assistant       │
│              │   - Tool accordion (fechado)       │
│ [Memória]    │                                    │
│              ├────────────────────────────────────┤
│              │ PromptInput + botão Stop/Enviar    │
└──────────────┴────────────────────────────────────┘
```

- Rota: continua `/intelligence`, mas thread ativa via search param `?t=<threadId>`. `useNavigate` ao criar/selecionar.
- `useChat` com `id = threadId`, `transport = DefaultChatTransport({ api: '/api/oliver-chat', body: { threadId } })`.
- Mensagens renderizadas via `message.parts` (texto streamed + `ToolUIPart` para tools).
- Sugestões iniciais quando thread vazia (4 prompts focados em diagnóstico/previsão).
- Botão "Memória do Oléver" abre `Dialog` mostrando o markdown completo, com botão "Editar manualmente" (textarea + salvar via `replaceMemory`).
- Bubble do user: `bg-primary text-primary-foreground`. Assistant: sem background, texto direto, markdown via `MessageResponse`.
- Logo do Oléver: ícone gerado (não usar `Sparkles` solto) — pequena marca no header.

## 3. Limpeza

- Remover todo o mock (`SUGGESTIONS`, `setTimeout`, `WEEKLY_TREND` desta tela).
- `intelligence.tsx` passa a montar apenas o layout do chat.

## 4. Verificação

1. Migration aplicada, GRANTs OK.
2. Criar 2 threads, mandar mensagem em cada, recarregar página → histórico restaurado por thread.
3. Perguntar "quais os maiores tipos de erro do último mês?" → Oléver chama `queryAuditFindings` + `detectErrorTrends`, responde com números reais.
4. Perguntar "projete o próximo mês" → chama `forecastNextMonth`.
5. Falar "lembre que o produto Premium-X tem regra X" → Oléver chama `appendToMemory`; abrir dialog Memória e confirmar gravação.
6. Recarregar nova thread em outro device → memória continua influenciando respostas.

## Detalhes técnicos

- AI SDK: `ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`, `zod` (instalar os que faltarem).
- Provider helper: `src/lib/ai-gateway.server.ts` (padrão Lovable AI Gateway com `X-Lovable-AIG-SDK`).
- Tools de leitura usam `supabaseAdmin` (rota servidor, sem auth de usuário).
- `appendToMemory` faz read-modify-write atômico (concat com `\n\n## <data>\n<conteúdo>`).
- Forecast: regressão linear simples sobre últimos N pontos da série mensal já calculada em `analytics.functions.ts` (reuso).
- Risk score: query agregando `audit_findings` por `apolice` + join com `policies`.
- Sem auth: memória é única e global por design.
