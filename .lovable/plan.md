## Objetivo

Substituir o gráfico atual **"Receita OLÉ (USD) por mês de vigência"** (área única de prêmio bruto) por **"Distribuição contábil dos prêmios pagos (USD)"** — barras empilhadas com 4 camadas que refletem o Mapa de Repasses:

1. **Fica com Olé (líquido)** — Fee Olé (35%) + Custo de Aquisição (20%) − PIS/COFINS sobre comissões (4,65%)
2. **Vai para Excelsior** — Fee Exc (5%) + Fixo Suplementar (piso USD 8.333,33) + Prêmio Retido (10% do prêmio direto)
3. **Vai para Munich RE** — 90% do prêmio direto (40% do prêmio líquido)
4. **Vai para impostos** — IOF (0,38%) + PIS/COFINS sobre comissões (4,65%)

Mês com prêmio pago = 0 → camada 1, 3 e 4 ficam zeradas, mas **Excelsior aparece com USD 8.333,33** (piso contratual), espelhando o contrato.

## O que muda

### 1. `src/lib/analytics.functions.ts`
- Trocar agregação por **mês de pagamento**. Para cada apólice/endosso, ler `itens[].pagamento.parcelas[].data_vencimento` (ou `data_pagamento` quando existir) em vez de `datas.inicio_vigencia`. Se a parcela não tiver data, fallback para `data_emissao` do envelope do endosso (FATURA MENSAL = emissão ≈ pagamento, como no mapa de maio).
- Somar `valor_premio` (DIRETO/PREMIO) por mês de pagamento → `bruto`.
- Garantir que TODO mês entre o 1º pagamento e o mês atual aparece, mesmo que `bruto = 0` (necessário para mostrar o piso de Excelsior em meses ociosos).
- Calcular as 4 camadas para cada mês (constantes em `src/lib/analytics/repasse-rules.ts`):
  ```ts
  IOF_PCT = 0.0038
  FEE_OLE_PCT = 0.35
  CUSTO_AQUISICAO_PCT = 0.20
  PIS_COFINS_PCT = 0.0465
  FEE_EXC_PCT = 0.05
  FIXO_SUPLEMENTAR_PISO = 8333.33
  PREMIO_DIRETO_PCT = 0.40
  PREMIO_RETIDO_EXC_PCT = 0.10  // do prêmio direto
  PREMIO_CEDIDO_MUNICH_PCT = 0.90 // do prêmio direto
  ```
- Novo tipo `RepasseBucket { month, label, ole, excelsior, munich, impostos, bruto }`.
- Manter `RevenueBucket` antigo para não quebrar o `oliver-chat.ts` (que consome `revenueByMonth`), mas adicionar campo paralelo `repasseByMonth: RepasseBucket[]` em `AnalyticsAggregates`.

### 2. `src/routes/analytics.tsx`
- Substituir o `<AreaChart>` do bloco "Receita OLÉ" por um `<BarChart>` empilhado com 4 séries (cores: `--success` Olé, `--primary` Excelsior, `--info` Munich, `--warning` Impostos).
- Subtítulo passa a mostrar `Fica com Olé: USD X · Total movimentado: USD Y · N meses`.
- Adicionar Legend e tooltip formatando USD com 2 casas. Tooltip somando o total da barra.
- KPI `totalUsd` passa a refletir `bruto` total; novo KPI `oleLiquido` somando coluna Olé.

### 3. Validação manual contra o mapa de maio
Após implementar, verificar via `select` ou direto na UI: o mês 2026-05 deve mostrar valores próximos a:
- bruto ≈ USD 1.861
- Olé líquido ≈ USD 972
- Excelsior ≈ USD 8.407 (Fee Exc 92,70 + Fixo Supl 8.240,63 + Retido 74,16)
- Munich ≈ USD 667
- Impostos ≈ USD 54 (IOF 7,07 + PIS/COFINS comissões 47,41)

Se divergir > 5%, ajustar a fonte de "data de pagamento" (provavelmente cair no `data_emissao` do endosso de FATURA MENSAL).

## Fora de escopo

- Não vou alterar o Oléver Chat (continua usando `revenueByMonth` antigo para não quebrar perguntas existentes; posso atualizar depois se você pedir).
- Não vou modelar sinistralidade variável (mantenho Fee Olé 35% e Fee Exc 5% — extremos do range, conservador para Olé e Excelsior).
- Não vou criar tela de upload do Mapa de Repasses — o gráfico é 100% calculado a partir dos prêmios já sincronizados.

## Detalhes técnicos

- Constantes ficam em `src/lib/analytics/repasse-rules.ts` (exportadas) para facilitar tuning futuro e reuso no Oléver.
- Função `computeRepasse(bruto: number): { ole, excelsior, munich, impostos }` pura, testável.
- Loop por mês na agregação sempre chama `computeRepasse(bruto)`, mesmo quando `bruto = 0`, garantindo que Excelsior nunca caia abaixo do piso quando o mês está dentro da janela operacional.

