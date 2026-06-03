# Adicionar gráficos de emissões à tela de Analytics

## Objetivo

Incluir três novos gráficos na página `/analytics`, usando os dados da tabela `endorsements` (cada linha = uma emissão; `numero_endosso = '000000'` representa a apólice em si, e a presença das chaves `endosso_A` / `endosso_B` / `endosso_C` / `endosso_D` em `proposta` determina o tipo do endosso).

Data de emissão = `proposta.datas.assinatura` (com fallback para `registro_origem`), agrupada por mês `YYYY-MM`.

## Novos gráficos

1. **Apólices emitidas por mês** — bar chart, contando emissões com `numero_endosso = '000000'`.
2. **Endossos emitidos por mês** — bar chart, contando emissões com `numero_endosso != '000000'`.
3. **Emissões por mês e por tipo** — bar chart **empilhado**, com séries: `Apólice`, `Endosso A`, `Endosso B`, `Endosso C`, `Endosso D`.

Os três compartilham o mesmo eixo X (meses ordenados crescente) e usam tokens do design system (sem cores hardcoded).

## Mudanças

### `src/lib/analytics.functions.ts`
- Adicionar interface `IssuanceBucket { month; label; apolices; endossoA; endossoB; endossoC; endossoD; total }`.
- Incluir `issuancesByMonth: IssuanceBucket[]` em `AnalyticsAggregates`.
- Carregar `endorsements` (`numero_endosso, proposta`), resolver mês via helper `pickMonth(proposta.datas.assinatura ?? proposta.datas.registro_origem)`, classificar tipo pelas chaves `endosso_A/B/C/D` (ou `apolices` se `numero_endosso = '000000'`), agregar em `Map<month, counters>` e devolver ordenado.

### `src/routes/analytics.tsx`
- Consumir `issuancesByMonth` do hook existente.
- Adicionar três `ChartCard`s na grade existente:
  - `BarChart` simples para Apólices/mês.
  - `BarChart` simples para Endossos/mês (soma A+B+C+D).
  - `BarChart` empilhado (`stackId="emissoes"`) com as 4 séries de endosso + apólice, usando `hsl(var(--chart-1..5))`.
- Tooltip com `formatInt`; legenda com nomes amigáveis.
- Incluir os três novos cards no fluxo de exportação para PDF (mesma lógica já usada pelos demais gráficos em `src/lib/analytics/export-charts.ts` — adicionar refs).

### Sem mudanças em backend/DB
Apenas leitura; nenhuma migration necessária.

## Verificação
- `bunx tsc --noEmit`.
- Conferir visualmente no preview (`/analytics`) que os 3 gráficos renderizam com dados e que o botão "Exportar PDF" inclui os novos.
