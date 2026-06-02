## Objetivo

Reduzir a poluição visual da Visão Geral, exibir o número completo das apólices no card "Apólices com mais inconsistências" e adicionar dois recursos ao resultado da auditoria: exportar PDF e abrir um consolidado em forma de lista.

## 1. Limpar a Visão Geral

Hoje o topo tem três camadas que repetem a mesma informação: a barra de status (6 itens), o grid de 8 KPIs e o bloco "Pulso Operacional". Vou:

- **Remover a barra de status superior** (já está duplicada no grid de KPIs).
- **Reduzir o grid de 8 → 4 KPIs principais**: Conformidade, Apólices Auditadas, Não Conformes, Achados Ativos. Os demais (Risco, Apólices Afetadas, Regras Acionadas) viram itens secundários menores numa única linha compacta abaixo.
- **Unificar paleta de cores** dos KPIs (menos tons concorrendo) e padronizar tipografia (números grandes, hint discreto).
- Manter Pulso Operacional, Matriz de Risco e os dois cards inferiores como estão estruturalmente (já estão bons), apenas ajustando respiros (padding/gap) para reduzir a sensação de densidade.

## 2. Apólices com mais inconsistências — número completo

No card atual, `shortApolice(g.apolice)` corta o número. Vou:

- Trocar para exibir o número **completo** em `font-mono`, com `break-all` para quebrar em telas estreitas.
- Manter os tipos de erro como segunda linha, com `truncate` + `title` para hover.
- Adicionar botão "Copiar nº" discreto ao lado.

## 3. Exportar resultados em PDF

Adicionar botão **"Exportar PDF"** no cabeçalho da Visão Geral (ao lado de "Rodar Auditoria") e também na página `/apolices` se aplicável.

- Geração 100% client-side com `jspdf` + `jspdf-autotable` (sem backend).
- Conteúdo do PDF:
  - Cabeçalho com logo/título, data da auditoria, status geral.
  - Resumo (Total processado, Aprovados, Reprovados, % conformidade).
  - Tabela 1: Top apólices afetadas (nº completo, qtd de erros, tipos).
  - Tabela 2: Detalhamento por achado (apólice, tipo de erro, endosso, datas).
- Arquivo nomeado `auditoria-OLE-{YYYY-MM-DD-HHmm}.pdf`.

## 4. Consolidado em forma de lista

Adicionar botão **"Ver lista consolidada"** no cabeçalho. Abre um `Dialog` (shadcn) em tela cheia com:

- Tabela única e densa de todos os achados da última run, com colunas: Apólice (nº completo), Tipo de erro, Endosso, Início, Fim, Detalhes.
- Filtro por tipo de erro (select) e busca por nº de apólice.
- Botão "Exportar PDF" também dentro do diálogo (reaproveita a função do item 3).
- Ordenação por coluna.

## Arquivos a alterar/criar

- `src/routes/index.tsx` — limpeza visual, nº completo, botões "Exportar PDF" e "Ver lista".
- `src/components/audit/export-pdf-button.tsx` *(novo)* — encapsula geração do PDF.
- `src/components/audit/findings-list-dialog.tsx` *(novo)* — diálogo com lista consolidada + filtros.
- `src/lib/audit/export-pdf.ts` *(novo)* — função pura que monta o PDF a partir de `latest`.
- `package.json` — adicionar `jspdf` e `jspdf-autotable`.

## Fora de escopo

- Mudanças em backend / callback do n8n.
- Mudanças nas demais rotas (`/analytics`, `/apolices`, etc.) além do botão de exportar, se necessário.
- Envio de PDF por e-mail / armazenamento no Cloud (pode virar próximo passo).
