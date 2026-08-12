# Exceções da auditoria ignoradas em todos os indicadores

Hoje só a tela principal desconta as exceções. Confirmei no código que três outros caminhos ainda usam os números brutos das execuções (`aprovados` / `reprovados` gravados pelo n8n), sem descontar `audit_ignores`:

1. **Histórico da auditoria** (`getAuditHistory`) — alimenta os gráficos de evolução, o heatmap, as séries por execução e as variações (deltas). Devolve contagens brutas.
2. **Toast de conclusão** (`getAuditRunStatus`) — a mensagem "X de Y com inconsistências" ao final da execução usa contagens brutas.
3. **Saúde do sistema na barra lateral** (`getSystemStatus`) — a taxa de aprovação (e o estado Operacional/Degradado) é calculada a partir das contagens brutas, por isso aparece warning mesmo quando tudo restante está ignorado.

Nada relacionado à ferramenta de Últimos Endossos será tocado: as exceções dela vivem em outra tabela (`endorsement_exceptions`) e continuam totalmente separadas.

## O que muda

- Aplicar o mesmo filtro de exceções já usado na tela principal (por apólice inteira e por apólice+tipo de erro) em:
  - histórico de execuções → recalcular reprovados/aprovados por execução a partir dos achados não ignorados;
  - status da execução em andamento → devolver os números já ajustados para o toast final;
  - saúde do sistema → taxa de aprovação e classificação do estado com base nos números ajustados.
- Gráficos, heatmap, KPIs e deltas passam a refletir os números ajustados automaticamente, pois consomem essas mesmas fontes.
- Comportamento consistente: uma apólice cujos achados foram todos ignorados conta como aprovada; uma apólice com alguns tipos ignorados continua reprovada apenas pelos tipos restantes.

## Detalhes técnicos

- `src/lib/audit.functions.ts`:
  - extrair um helper compartilhado que carrega `audit_ignores` (escopo global) e monta os dois conjuntos de filtro;
  - `getAuditHistory`: buscar os achados de todas as execuções retornadas (`in run_id`), filtrar os ignorados e recomputar `reprovados` = apólices distintas restantes e `aprovados` = `total_processado - reprovados`;
  - `getAuditRunStatus`: mesma correção para a execução consultada;
  - `getSystemStatus`: calcular `approvalRate` com os valores ajustados da última execução;
  - `getLatestAudit`: reusar o helper (comportamento atual mantido).
- Sem mudanças de schema, sem mudanças nas exceções de endossos, e a lógica de derivação no cliente (`src/lib/audit/derive.ts`) permanece igual.
