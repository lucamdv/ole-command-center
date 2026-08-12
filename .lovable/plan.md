# Filtro de datas para os gráficos de Analytics

## Objetivo
Poder restringir os gráficos da tela de Analytics a um período escolhido. Sem nenhuma escolha manual, a tela continua exatamente como é hoje (visão atual, todos os dados).

## Como vai funcionar

Uma barra de filtro discreta no topo da página, ao lado dos botões de exportação:

- Presets rápidos: **Tudo (padrão)**, Últimos 3 meses, 6 meses, 12 meses, Ano atual.
- Opção **Período personalizado** com data inicial e data final (calendário).
- Botão "Limpar" volta para "Tudo".
- Quando um filtro está ativo, aparece um selo com o intervalo aplicado (ex.: "jan/26 – ago/26") para deixar claro que a visão não é a completa.
- O filtro escolhido não é salvo entre sessões: ao reabrir a página, volta para "Tudo".

## O que é filtrado

- Tendência de runs, Conformidade ao longo do tempo, Volume processado, Heatmap: pelo período das execuções de auditoria.
- Findings por mês de vigência, Receita Excelsior, Apólices emitidas por mês, Endossos emitidos por mês, Emissões por mês e por tipo: pelos meses dentro do intervalo.
- KPIs e totais no topo (apólices, endossos, USD, repasse) passam a refletir o mesmo intervalo.
- Gráficos que dependem só da última auditoria (Severidade, Top 10 tipos de erro, Apólices mais problemáticas, Top endossos): consideram a última auditoria dentro do intervalo; se não houver nenhuma no período, ficam vazios (e portanto ocultos, se a preferência de esconder gráficos vazios estiver ligada).
- Carteira por nº de endossos não tem data associada e continua mostrando a carteira inteira.
- A exportação em PDF dos gráficos passa a registrar o período aplicado no cabeçalho.

## Detalhes técnicos

- Novo estado local em `src/routes/_authenticated/analytics.tsx` (`{ preset, from, to }`), sem persistência.
- Novo utilitário `src/lib/analytics/date-filter.ts`: resolve preset → `{ fromISO, toISO }`, além de helpers `withinRange(dateISO)` e `monthWithinRange(YYYY-MM)`.
- Filtragem aplicada em memória, antes dos `useMemo` existentes: `history` filtrado por `created_at`; `aggregates.*ByMonth` filtrados por `month`; `latest` recalculado como o run mais recente do intervalo filtrado.
- Sem mudança nas server functions nem no banco — os agregados já vêm com `month` e as runs com data, então o corte é feito no cliente.
- Componente novo `src/components/analytics/date-range-filter.tsx` usando os componentes existentes de select/popover/calendar do design system e tokens semânticos.
- A lógica de `hasData` / ocultar gráficos vazios continua funcionando, agora avaliada sobre os dados filtrados.
