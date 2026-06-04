## Objetivo

Permitir que o Oléver gere gráficos personalizados (linha, barra, pizza, área, scatter) sob demanda — usando dados reais do banco quando aplicável, ou séries calculadas/projetadas por ele — renderizados inline na conversa e persistidos como parte da mensagem.

## Arquitetura

Usaremos o padrão de **tool calling** do AI SDK. O Oléver decide quando chamar a tool e com quais parâmetros. O frontend detecta partes do tipo `tool-render_chart` na mensagem e renderiza o gráfico com Recharts (já instalado).

```text
User pergunta → Oléver (streamText)
                    │
                    ├─ (opcional) tool: query_metric   → SQL agregado no banco
                    ├─ (opcional) tool: project_series → calcula projeção
                    └─ tool: render_chart {type, title, data, xKey, series[]}
                              ↓
                  toUIMessageStreamResponse persiste parts no onFinish
                              ↓
                  MessageBubble renderiza <ChartPart /> (Recharts)
```

## Mudanças

### 1. Backend — novas tools em `src/routes/api/oliver-chat.ts`

Adicionar ao `streamText` um objeto `tools` com:

- **`render_chart`** — tool "de saída visual". Recebe `{ type: 'line'|'bar'|'pie'|'area'|'scatter'|'auto', title, description?, xKey, series: [{key, label, color?}], data: Array<Record<string, number|string>> }`. Não executa nada server-side — `execute` apenas retorna `{ ok: true }`. O valor real fica nos `input` da tool-part, que o frontend lê para renderizar.
- **`query_metric`** — agrega dados reais. Recebe `{ metric: 'audits_by_status'|'policies_over_time'|'findings_by_type'|'premium_by_month'|... , groupBy?, range? }`. Server executa via `supabaseAdmin` retornando uma série pronta para alimentar `render_chart`. Conjunto fechado de métricas para evitar SQL arbitrário.
- **`project_series`** — projeções simples (regressão linear / médias móveis) sobre uma série fornecida. Recebe `{ data, periods }` e devolve série estendida.

System prompt atualizado para instruir o Oléver:
- "Quando o usuário pedir um gráfico ou quando uma visualização ajudar, chame `render_chart`."
- "Se o usuário indicar o tipo (`barra`, `pizza`...), use-o; caso contrário, escolha o mais adequado."
- "Para dados históricos use `query_metric` primeiro; para cenários futuros, combine com `project_series`."

`stopWhen: stepCountIs(50)` para permitir múltiplas chamadas em sequência (query → project → render).

### 2. Persistência — já funciona

O `onFinish` do `toUIMessageStreamResponse` já salva `message.parts` em `oliver_messages.parts` (jsonb). Tool-parts entram automaticamente. Só precisamos garantir que o `loadThreadMessages` continue devolvendo `parts` intactos (já devolve).

### 3. Frontend — renderizar gráficos em `src/routes/intelligence.tsx`

No `MessageBubble`, hoje os `toolParts` são exibidos como `<details>` JSON cru. Substituir por roteamento por tipo:

- `tool-render_chart` (qualquer state ≥ `input-available`) → `<ChartPart input={tp.input} />`
- Demais tools (`query_metric`, `project_series`) → manter o accordion discreto atual (telemetria), ou ocultar quando state = `output-available` e a próxima tool é `render_chart`.

### 4. Novo componente `src/components/oliver/chart-part.tsx`

- Lê `input` da tool-part (type, title, data, xKey, series).
- Renderiza com `ResponsiveContainer` + componente apropriado do Recharts (`LineChart`, `BarChart`, `PieChart`, `AreaChart`, `ScatterChart`).
- Usa cores do design system via `hsl(var(--primary))`, `--chart-1..5` (adicionar tokens em `src/styles.css` se faltarem).
- Card com `title`, `description`, container 100% width × ~300px altura, tooltip e legenda padronizados.
- `type: 'auto'` → heurística: 1 série numérica + xKey temporal = linha; categoria + valor = barra; ≤6 fatias somando 100% sugeridas = pizza.

### 5. Helper de métricas em `src/lib/oliver/metrics.server.ts`

Funções puras, server-only, mapeando cada `metric` enum para uma query Supabase admin que retorna `Array<{x, y, ...}>`. Mantém SQL longe do prompt e impede injeção. Exemplos iniciais:
- `audits_by_status` (count agrupado por `status_geral` em `audit_runs`)
- `policies_over_time` (count por mês de `policies.created_at`)
- `findings_by_type` (top N `tipo_erro` em `audit_findings`)
- `premium_by_month` (sum `premio_liquido` por mês em `endorsements`)

### 6. Sugestões da home

Adicionar 1-2 sugestões em `SUGGESTIONS` que induzem gráfico, ex.: "Mostre em um gráfico de barras os 5 tipos de erro mais frequentes nos últimos 90 dias."

## Detalhes técnicos

- AI SDK: `tool({ description, inputSchema: z.object({...}), execute })`. `inputSchema` Zod com enums curtas e sem `format/pattern` extensos (evita estouro de estado do Gemini).
- `render_chart.execute` retorna `{ rendered: true }` — o gráfico vive no `input`, não no `output`, para que esteja disponível mesmo durante streaming (state `input-available`).
- Sem migração de banco. `oliver_messages.parts` é jsonb e já aceita o formato.
- Sem novas dependências (Recharts e Zod já estão no projeto).

## Fora de escopo

- Edição interativa do gráfico pelo usuário (drag/zoom avançado).
- Export do gráfico como PNG/CSV (pode ser adicionado depois com `export-charts.ts` já existente).
- Métricas arbitrárias por SQL livre — apenas o enum fechado em `query_metric`.
