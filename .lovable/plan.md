# Operação · dados reais

Hoje `src/routes/operacao.tsx` usa `HOURLY_THROUGHPUT` e `ALERTS` de `@/lib/mock/data.ts`, com fila simulada via `setInterval`. Vou trocar tudo por dados reais já disponíveis no backend: histórico de runs de auditoria, findings da última run e estado da última sincronização da carteira.

## Fontes de dados (já existentes)

- `useAuditHistory()` → array de runs (`total_processado`, `aprovados`, `reprovados`, `duration_ms`, `created_at`).
- `useLatestAudit()` → última run + `findings[]` (`tipo_erro`, `apolice`, `endosso`, `detalhes`, severidade via `severityOf`).
- `usePolicies()` → carteira (total apólices, total endossos).
- `useLatestPolicySync()` → última sync (`total_apolices`, `finished_at`, `status`, `error_message`).
- Derivações já prontas em `src/lib/audit/derive.ts`: `runSeries`, `errorTypeBreakdown`, `countBySeverity`, `groupByApolice`, `bucketByMonth`, `normalizeFinding`.

## Novo layout (mesma estética, sem mock)

1. **Header** – mantém "NOC · LIVE" mas o pulse só fica verde se a última run = `success`; caso contrário âmbar/erro com `mensagem_geral`.

2. **4 tiles superiores** (reais):
   - Apólices na carteira → `policies.length`
   - Última auditoria · processadas → `latest.run.total_processado`
   - Reprovações → `latest.run.reprovados` com delta vs run anterior
   - Latência da run → `latest.run.duration_ms` formatado (ms/s)

3. **Gráfico "Throughput"** – `AreaChart` com `runSeries(history)`: eixo = runs cronológicas, séries = `approved` (verde/primary) e `rejected` (destructive). Título passa a ser "Histórico de execuções · últimas {N} runs". Remove `HOURLY_THROUGHPUT`.

4. **Coluna esquerda (col-span-2) – Inconsistências por tipo de erro** (substitui "Fila Operacional · Ao Vivo"):
   - Lista de `errorTypeBreakdown(latest.findings)` ordenada por contagem.
   - Cada linha: ícone severidade, `tipo_erro`, barra horizontal proporcional ao total, contagem + nº de apólices afetadas.
   - Mantém o chip "streaming" → vira "última run · {relativeTime(created_at)}".

5. **Coluna direita – Findings críticos** (substitui ALERTS mock):
   - `latest.findings` filtrados por `severityOf === "erro"` (até 8).
   - Cada item: ponto vermelho, `tipo_erro` (título), `apolice` (mono) + `normalizeFinding(f).motivo` truncado, endosso quando houver, `relativeTime(created_at)`.
   - Link clicável para `/apolices/{apolice}` quando aplicável.

6. **Strip inferior "Motor de Auditoria"** – troca números fixos por:
   - Versão removida (sem dado real); no lugar: "MOTOR OLÉ · n8n callback".
   - Vazão = `total_processado / (duration_ms/1000)` da última run.
   - Backlog = apólices na carteira sem run recente (ou simplesmente `policies.length`).
   - P50/P95/P99 substituídos por: "Duração última run", "Duração média (history)", "Última sync da carteira" (`useLatestPolicySync`).
   - Indicador saudável: verde se `status_geral === "SUCESSO"`, âmbar `ALERTA`, vermelho `ERRO`.

## Estados de UI

- Loading: skeletons nos quatro tiles, no chart e nas duas colunas (usar `Skeleton` já existente).
- Vazio (nenhuma run ainda): empty state pedindo "Dispare a primeira auditoria em /alertas".
- Erro: bloco com mensagem do hook.

## Arquivos tocados

- `src/routes/operacao.tsx` – reescrito (sem mock, sem `useState`/`setInterval` simulado; usa hooks reais + derivações).
- Sem mudanças em `mock/data.ts` (outras telas ainda dependem dele – fora do escopo).
- Sem mudanças em server functions ou schema.

## Fora do escopo

- Não vou criar nova tabela de "fila operacional ao vivo" (não há fonte de stream real). Substituo pelo histórico de runs, que é o sinal operacional real do produto.
- Outras telas que ainda usam mock ficam para depois.
