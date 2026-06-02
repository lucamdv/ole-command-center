## Objetivo

Alinhar a apresentação dos achados ao formato Notion enviado (banner consolidado + blocos por apólice + bullets com severidade e texto integral) e tornar a Visão Geral muito mais densa em informação acionável.

## 1. Lista Consolidada — estilo Notion (principal mudança)

Hoje a lista é uma tabela "achatada". Vou reescrever `findings-list-dialog.tsx` para reproduzir o relatório do Notion:

**Cabeçalho do diálogo (banner)**
- Linha 1: "📊 Relatório Consolidado de Auditoria"
- Linha 2: `Data: <data_auditoria>` · chips: `✅ <aprovados> OK` · `⚠️ <reprovados> Intervenções Necessárias` · `🔍 <apolices_afetadas> apólices` · `📋 <total_achados> achados`
- Toolbar: busca (nº apólice ou texto do motivo), filtro por tipo, filtro por severidade (Todos / Erros / Alertas), toggle de visão (Agrupado ↔ Tabela), botões "Copiar tudo" e "Exportar PDF".

**Visão Agrupada (padrão)**
- Uma seção por apólice, ordenadas por nº de achados desc.
- Header da seção: `🔍 Apólice: <número completo em mono, break-all>` + badge `N erros` / `M alertas` + botão "Copiar nº" + link "Abrir detalhes" → `/apolices/$id`.
- Lista de bullets, um por achado:
  - Ícone de severidade (🔴 para `ERRO`, ⚠️ para `ALERTA`, derivado de `tipo_erro` começando com "ERRO"/"ALERTA" ou da presença em `detalhes.motivo`).
  - Texto: `<TIPO_ERRO>` em bold + " — " + `detalhes.motivo` (ou `detalhe`) **integral**, sem truncar.
  - Linha secundária discreta: `Endosso <endosso> · <data_inicio> → <data_fim>` quando existirem.
- Seções colapsáveis (default expandido), com "Expandir tudo / Recolher tudo".

**Visão Tabela (toggle)**
- Mantém a tabela atual como visão alternativa para quem quer ordenar/escanear rapidamente.

**Função utilitária**
- `severityOf(finding)` em `src/lib/audit/derive.ts`: retorna `'erro' | 'alerta' | 'info'` a partir de `tipo_erro` / `motivo`.

## 2. Visão Geral — painel mais completo e detalhista

Manter a estrutura limpa que já existe, mas adicionar camadas de detalhe. Mudanças em `src/routes/index.tsx`:

**a. Banner consolidado no topo (acima dos KPIs)**
- Mesma linguagem da lista: `✅ X OK | ⚠️ Y Intervenções | 🔍 Z apólices afetadas | 📋 N achados`, com micro-deltas vs run anterior.

**b. KPIs principais**
- Mantém os 4 cartões. Adiciono um **5º compacto**: "Severidade" (split bar Erros vs Alertas com contagem).

**c. Nova faixa "Breakdown por Severidade × Tipo"**
- Tabela densa: `Tipo de erro | Severidade | Ocorrências | Apólices únicas | % do total | Sparkline tendência (últimas runs)`.
- Ordenada por ocorrências desc, com barra de progresso inline.

**d. Card "Endossos mais problemáticos"**
- Agrupa achados por `endosso` e mostra top 8: número do endosso, qtd achados, apólices distintas.

**e. Card "Janela de Vigência mais afetada"**
- Heatmap/bar por mês (de `data_inicio`): quantos achados caem em cada mês — ajuda enxergar concentração temporal.

**f. Card "Histórico detalhado de runs" (substitui o área-chart simples por algo mais rico)**
- Tabela compacta das últimas 10 runs: data, status, total, aprovados, reprovados, % conformidade, duração, delta vs anterior — clicável.

**g. "Apólices com mais inconsistências"**
- Já mostra nº completo. Adiciono: contagem separada de Erros vs Alertas por apólice, e os 3 primeiros motivos resumidos.

**h. Matriz de Risco**
- Mantém. Adiciono legenda de intensidade e total por linha à direita.

## 3. PDF — alinhar ao novo formato

Em `src/lib/audit/export-pdf.ts`:
- Página 1: banner consolidado (data, status, OK / Intervenções), resumo, top apólices.
- A partir da página 2: **seção por apólice** (igual à visão agrupada do diálogo), com bullets `🔴/⚠️ TIPO — motivo integral`, igual ao Notion. Mantém tabela de detalhamento final como anexo.

## 4. Arquivos

- `src/components/audit/findings-list-dialog.tsx` — reescrita para visão agrupada + toggle tabela + banner.
- `src/lib/audit/derive.ts` — adicionar `severityOf`, `groupByEndosso`, `bucketByMonth`.
- `src/routes/index.tsx` — banner, 5º KPI, novos cards (severidade×tipo, endossos, janela de vigência, histórico detalhado), enriquecer card de top apólices.
- `src/lib/audit/export-pdf.ts` — reformatar PDF para refletir o agrupamento Notion.

## Fora de escopo

- Backend / schema / n8n callback.
- Outras rotas (`/apolices`, `/analytics`, etc.) — apenas se um link novo apontar para elas, sem alterá-las.
