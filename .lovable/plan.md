# Corrigir data de emissão usada nos 3 gráficos

## Problema

Estou usando `proposta.datas.assinatura` (do `resolveProposta`) como data de emissão de **todos** os registros de `endorsements`. Para endossos, o `resolveProposta` desce em `endosso_X → proposta_endosso_X → proposta` e pega o `datas.assinatura` de lá — mas esse campo é a data de **assinatura/vigência** do contrato, não de emissão do endosso. Resultado: vários endossos caem em meses errados ou ficam concentrados nos meses de vigência das apólices, daí "nenhum endosso emitido em maio/26".

## Estrutura real

- **Apólice** (`numero_endosso = '000000'`): JSON tem `datas`, `itens`, … no topo. Data de emissão correta = `proposta.datas.assinatura` (com fallback `conclusao_subscricao` → `registro_origem`).
- **Endosso** (`numero_endosso != '000000'`): JSON tem `endosso_A | endosso_B | endosso_C | endosso_D` no topo, e **cada wrapper possui um campo `data_emissao` no próprio nível do wrapper** (ex.: `proposta.endosso_A.data_emissao = "2026-01-20T..."`). Esse é o campo certo.

## Mudanças

### `src/lib/analytics.functions.ts` — `getAnalyticsAggregates`

Na iteração de `endorsements`, trocar a fonte da data:

1. Detectar o tipo primeiro olhando as chaves de topo (`endosso_A/B/C/D`) e qual `numero_endosso`.
2. Resolver `emissionIso`:
   - Se `numero_endosso === '000000'`: usar `raw.datas.assinatura ?? raw.datas.conclusao_subscricao ?? raw.datas.registro_origem`.
   - Caso contrário: pegar o wrapper `raw.endosso_X` correspondente e usar `wrapper.data_emissao` (fallback para `wrapper.proposta_endosso_X.proposta.datas.assinatura` se ausente).
3. `pickMonth(emissionIso)` continua igual.
4. Acumular em `issMap` exatamente como hoje (apolices / endossoA-D / endossosTotal / total).

Sem mudanças no `resolveProposta` (ele continua sendo usado para os cálculos de prêmio/vigência das apólices em outras partes).

### Sem mudanças em `src/routes/analytics.tsx`

Os 3 cards (Apólices/mês, Endossos/mês, Empilhado por tipo) e a exportação PDF já consomem `issuancesByMonth` — só os valores vão se ajustar.

## Verificação

- `psql` rápido contando endossos por mês pela nova regra para conferir distribuição.
- Conferir no preview `/analytics` que maio/26 e demais meses passam a ter endossos.
