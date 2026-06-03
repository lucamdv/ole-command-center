# Analytics — corrigir vigência e adicionar receita USD × tempo

## Diagnóstico

1. **"Findings por mês de vigência" está vazio** porque `audit_findings.data_inicio` / `data_fim` são sempre `NULL`. A vigência real está em `policies.proposta -> 'datas' -> 'inicio_vigencia'`. Precisamos juntar `findings.apolice → policies.numero_apolice` para extrair.

2. **Receita USD da OLÉ** não existe como coluna — `policies.premio_liquido` é 0. O dado real está em `proposta -> 'itens' -> 'coberturas' -> 'composicao_premio_cobertura'`, filtrando `tipo_premio='DIRETO'` e `natureza_premio='PREMIO'`, somando `valor_premio` (USD) e `valor_premio_brl` (BRL).

## Solução

### Backend — novo server function

Criar `src/lib/analytics.functions.ts` com `getAnalyticsAggregates()` (POST, sem auth — usa cliente público de leitura, igual aos outros queries da app).

Retorna:
```ts
{
  findingsByVigencia: { month: string; label: string; count: number }[];
  revenueByMonth:     { month: string; label: string; usd: number; brl: number; policies: number }[];
}
```

Implementação:
- `findingsByVigencia`: SQL agregado via `supabase.rpc` ou query — buscar `audit_findings` da última run + join com `policies` por `numero_apolice`, bucketar por `to_char(inicio_vigencia, 'YYYY-MM')`. Como Supabase JS não faz join arbitrário em jsonb, faço em duas etapas: (a) busca `policies (numero_apolice, proposta->datas->>inicio_vigencia)`, monta map; (b) busca findings da última run, agrupa pelo mês do map. Tudo dentro da server function (não pesa no cliente).
- `revenueByMonth`: busca todas as `policies(numero_apolice, proposta)`, percorre `proposta.itens[].coberturas[].composicao_premio_cobertura[]` filtrando `tipo_premio='DIRETO' AND natureza_premio='PREMIO'`, soma USD/BRL, bucketa pelo mês de `proposta.datas.inicio_vigencia`. Ordenado cronologicamente.

Hook React Query `useAnalyticsAggregates()` em `src/hooks/use-analytics.ts`, `staleTime: 60_000`.

### Frontend — `src/routes/analytics.tsx`

- **Trocar** o gráfico atual "Findings por mês de vigência" pelo retorno de `findingsByVigencia` (mesmo `BarChart`, agora com dados reais).
- **Adicionar** novo `ChartCard` "Receita OLÉ (USD) por mês de vigência" com `AreaChart` mostrando `usd` ao longo do tempo, tooltip formatando como USD (`Intl.NumberFormat('en-US', {style:'currency', currency:'USD'})`) e linha secundária opcional em BRL desabilitada (mantém só USD para clareza). Eixo X = `label` (mmm/aa pt-BR).
- **KPI extra**: adicionar tile "Receita acumulada (USD)" na faixa de KPIs, somando `revenueByMonth.usd`.
- Manter `data-export="chart"` nos dois cards para o exportador PDF continuar pegando.
- Tratar `loading`/`empty` com os helpers `EmptyMsg` já existentes.

Adicionar formatter `formatUSD` em `src/lib/format.ts`.

## Fora de escopo
- Não alterar schema (não preencher `data_inicio/data_fim` retroativamente).
- Não mexer no n8n / motor de auditoria.
- Não criar tabela materializada — agregação on-demand basta para o volume atual (31 apólices, 21 findings).
