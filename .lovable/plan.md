# Analytics — dados reais, mais KPIs/gráficos e exportar PDF

Hoje `src/routes/analytics.tsx` usa mock (`POLICIES`, `WEEKLY_TREND`, `AUDIT_RULES`). Vamos remover 100% do mock e ligar nas mesmas fontes reais já usadas em Operação e Alertas: `useLatestAudit()` + `usePolicies()`, com derivações de `src/lib/audit/derive.ts`.

## Escopo
Frontend apenas. Sem mudanças em backend, schema ou server functions.

## Arquivos
- `src/routes/analytics.tsx` — reescrita completa, sem mock.
- (sem novo helper) reuso de `exportAuditPdf` em `src/lib/audit/export-pdf.ts` para o PDF geral. Para "exportar gráficos" individualmente, usar `html-to-image` (toPng) + `jsPDF` já instalado, encapsulado em um util curto inline no arquivo da rota (ou em `src/lib/analytics/export-charts.ts` novo).

## Layout

1. **Header**: "Analytics" + chip "BI · LIVE", contador de auditorias no histórico, última run, e dois botões:
   - "Exportar relatório completo (PDF)" → chama `exportAuditPdf(latest, history)`.
   - "Exportar gráficos (PDF)" → captura cada card marcado com `data-export="chart"` via `html-to-image` e monta um PDF A4 paisagem multipage.

2. **Faixa de KPIs (8 tiles, grid 4×2)** — todos derivados do real:
   - Apólices na carteira (`policies.length`)
   - Auditadas última run (`audited`) com delta vs run anterior
   - Taxa de conformidade (`approvedRate`) com delta pp
   - Risco operacional (`operationalRisk`) com delta pp
   - Erros críticos (`countBySeverity.erros`)
   - Alertas (`countBySeverity.alertas`)
   - Tipos de erro únicos (`uniqueErrorTypes`)
   - Apólices impactadas (`affectedPolicies`) + % sobre carteira

3. **Gráficos** (todos com `data-export="chart"` para captura):
   - **Tendência de runs (12 últimas)** — `AreaChart` com `runSeries(history)`: aprovados (success) e reprovados (destructive) empilhados.
   - **Conformidade ao longo do tempo** — `LineChart` com `approvedRate` por run.
   - **Volume processado por run** — `BarChart` com `total` por run.
   - **Distribuição por severidade** — `PieChart` (erro/alerta/info) com legenda.
   - **Top 10 tipos de erro** — `BarChart` horizontal de `errorTypeBreakdown(findings)`.
   - **Heatmap tipo × run** — usa `buildHeatmap(latest, history, 12)`, células coloridas por intensidade (mantém padrão visual de Operação).
   - **Findings por mês de vigência** — `BarChart` com `bucketByMonth(findings)`.
   - **Top endossos com inconsistências** — lista/bar usando `groupByEndosso(findings)` (top 8).
   - **Ranking de apólices mais problemáticas** — `groupByApolice(findings)` top 10, barra horizontal + chips erro/alerta + link para `/apolices/$id`.
   - **Distribuição da carteira por produto** — derivado de `policies` (agrupar por `produto`/`modalidade`), barra horizontal top 8.
   - **Distribuição da carteira por seguradora/corretor** — derivado de `policies` (campo disponível, ex.: `seguradora` ou `corretor` — usar o primeiro presente no tipo), top 8.

4. **Estados**:
   - Loading → skeletons nos tiles e nos cards de gráfico.
   - Sem dados (`!latest`) → empty state com `BarChart3` e CTA para `/operacao`.

## Export PDF dos gráficos
- Adicionar dependência `html-to-image` (apenas se ainda não presente; `jspdf` já está).
- Função `exportChartsPdf(nodes: HTMLElement[])`:
  1. `jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })`
  2. Para cada nó: `htmlToImage.toPng(node, { pixelRatio: 2, backgroundColor: '#0b0f1a' })`
  3. Adiciona página, título do card (lê `data-title`), imagem ajustada à largura útil.
  4. Rodapé com data + "OLE COPILOT — Gráficos Analytics".
  5. `doc.save('analytics-graficos-YYYY-MM-DD-HHMM.pdf')`.
- Botão "Exportar relatório completo" reusa a função já existente `exportAuditPdf`, sem alterações.

## Não faremos
- Não alteramos `mock/data.ts`, server functions, ou outras páginas.
- Sem novos endpoints/edge functions.
- Sem mudar tokens de design.
