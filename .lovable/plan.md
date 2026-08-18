# Revisão dos cálculos das KPIs anuais

Os quatro cartões anuais do Analytics (Crescimento da carteira, Redução de incidentes, Contratos emitidos no ano, Prêmio direto do ano) usam bases inconsistentes. O que os dados atuais mostram:

- Prêmio direto 2026 = **USD 1.252,70** em 41 contratos (2025: USD 771,06 em 4 contratos). Esse número só soma o componente `DIRETO/PREMIO` do registro atual da apólice — ignora endossos e todos os outros componentes de prêmio, então não conversa com o gráfico de receita/repasse (que soma todos os componentes das parcelas).
- Existem 36 runs de auditoria bem-sucedidas, todas em 2026. Os "críticos do ano" somam os achados de **todas** as 36 runs, contando o mesmo achado repetido a cada execução — o total fica ~36x inflado e a "redução de incidentes" perde sentido.
- O ano exibido é o último ano presente nos dados de vigência, não o ano corrente; e o ano anterior é apenas o ano imediatamente anterior existente na lista, mesmo que não seja adjacente.
- O ano corrente é parcial (ano até a data) e é comparado com o ano anterior fechado, inflando/deflacionando o crescimento (2025 teve só 4 contratos → crescimento de 925%).

## Correções

### 1. Prêmio do ano
Passar a calcular o prêmio anual pela mesma base do Mapa de Repasses / gráfico de receita: soma de todos os componentes das parcelas dos registros de emissão (apólice + endossos), agrupada pelo ano de vencimento da parcela (com fallback para o mês de emissão). O cartão passa a se chamar **"Prêmio emitido no ano (USD)"**, e o valor do prêmio direto puro fica como informação secundária no cartão (hint), deixando explícito o que cada número representa.

### 2. Incidentes críticos por ano
Deixar de somar run a run. Contar achados críticos **distintos** por ano usando a chave `apólice + tipo de erro` (o mesmo critério de reincidência já usado nos KPIs semanais/mensais), sempre com as exceções filtradas. Isso torna "Redução de incidentes" comparável entre anos.

### 3. Ano de referência e comparação justa
- Ancorar o ano corrente no ano do calendário (hoje) e o ano anterior em `ano - 1`, mesmo que um deles não tenha dados (aparece como zero/"sem dados" em vez de escolher um ano arbitrário).
- Comparar **mesmo período do ano**: acumulado do ano corrente até hoje contra o acumulado do ano anterior até o mesmo dia/mês. Os cartões passam a indicar "YTD até DD/MM" no hint.
- Quando o ano anterior não tem base suficiente, o cartão mostra "histórico insuficiente" em vez de um percentual enorme.

### 4. Contratos do ano
Contar contratos pelo ano de **emissão** da apólice (mesma resolução de data usada no gráfico de emissões), não pelo início de vigência, para não jogar apólices com vigência futura em anos à frente. Vigência continua sendo a base apenas do indicador de contratos ativos.

## Detalhes técnicos

- `src/lib/kpis/derive.ts`: `YearlyPoint` ganha `premioEmitidoUsd`, `premioDiretoUsd`, `criticosDistintos` e campos YTD; novas funções puras para recorte YTD e comparação ano-a-ano.
- `src/lib/kpis/policy-facts.ts`: extrair também a data de emissão (assinatura / conclusão de subscrição / registro de origem) e o total de prêmio por parcela, reaproveitando a mesma tolerância de formato (JSON achatado ou dentro de `endosso_A..D`).
- `src/lib/kpis.functions.ts`: `getOperationKpis` passa a ler `endorsements` (parcelas) para o agregado anual de prêmio, deduplica críticos por `apolice|tipo_erro` por ano e ancora os anos no calendário.
- `src/routes/_authenticated/analytics.tsx`: rótulos e hints dos quatro cartões anuais ajustados ao novo significado; nenhuma mudança nos gráficos.
- Sem migrações de banco e sem alterações nas integrações n8n.
